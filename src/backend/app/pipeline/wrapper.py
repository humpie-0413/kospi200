"""before/ 파이프라인 래핑.

기존 코드를 직접 import하여 호출. CPU 집약 작업이므로 to_thread로 실행.
"""
import asyncio
import logging
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings
from app.database import SessionLocal
from app.pipeline.state import pipeline_state
from app.models.pipeline_log import PipelineLog

logger = logging.getLogger(__name__)


def _ensure_pipeline_path():
    """before/ranking_backtest 를 sys.path에 추가"""
    settings = get_settings()
    if settings.pipeline_project_root:
        project_root = str(Path(settings.pipeline_project_root).resolve())
    else:
        project_root = str(
            Path(__file__).resolve().parent.parent.parent.parent.parent
            / "before" / "ranking_backtest"
        )
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    return project_root


def _get_config_path() -> str:
    settings = get_settings()
    if settings.pipeline_config_path:
        return settings.pipeline_config_path
    project_root = _ensure_pipeline_path()
    return str(Path(project_root) / "configs" / "config.yaml")


def _log_pipeline(action: str, status: str, message: str = "", triggered_by: str = ""):
    db = SessionLocal()
    try:
        log = PipelineLog(
            action=action,
            status=status,
            started_at=datetime.now(timezone.utc),
            finished_at=datetime.now(timezone.utc) if status != "running" else None,
            message=message,
            triggered_by=triggered_by,
        )
        db.add(log)
        db.commit()
    finally:
        db.close()


def _run_collect_sync():
    """데이터 수집 (L0~L4)"""
    _ensure_pipeline_path()
    config_path = _get_config_path()
    logger.info("Data collection started: %s", config_path)

    from src.data_collection.pipeline import DataCollectionPipeline
    pipeline = DataCollectionPipeline(config_path)
    pipeline.run_all()

    logger.info("Data collection completed")


def _run_predict_sync():
    """랭킹 예측 (Track A)"""
    _ensure_pipeline_path()
    config_path = _get_config_path()
    logger.info("Track A prediction started: %s", config_path)

    from src.pipeline.track_a_pipeline import run_track_a_pipeline
    run_track_a_pipeline(config_path)

    logger.info("Track A prediction completed")


def _run_all_sync():
    """전체 파이프라인 (수집 + 예측)"""
    _run_collect_sync()
    _run_predict_sync()


def _run_daily_sync(on_step=None):
    """일별 전체 파이프라인 (daily_news_pipeline)"""
    scripts_dir = str(Path(__file__).resolve().parent.parent.parent.parent.parent / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    from daily_news_pipeline import run_pipeline
    run_pipeline(on_step=on_step)


class PipelineRunner:
    async def _execute(self, action: str, sync_func, triggered_by: str):
        if not pipeline_state.acquire(action):
            return

        _log_pipeline(action, "running", triggered_by=triggered_by)

        try:
            await asyncio.to_thread(sync_func)
            pipeline_state.release("completed", f"{action} completed successfully")
            _log_pipeline(action, "completed", triggered_by=triggered_by)
        except Exception as e:
            msg = f"{action} failed: {traceback.format_exc()}"
            pipeline_state.release("failed", msg)
            _log_pipeline(action, "failed", message=str(e), triggered_by=triggered_by)
            logger.error(msg)

    async def run_collect(self, triggered_by: str = "manual"):
        await self._execute("collect", _run_collect_sync, triggered_by)

    async def run_predict(self, triggered_by: str = "manual"):
        await self._execute("predict", _run_predict_sync, triggered_by)

    async def run_all(self, triggered_by: str = "manual"):
        await self._execute("run-all", _run_all_sync, triggered_by)

    async def run_daily(self, triggered_by: str = "manual"):
        def on_step(idx, status):
            pipeline_state.update_step(idx, status)
        await self._execute("daily", lambda: _run_daily_sync(on_step=on_step), triggered_by)


pipeline_runner = PipelineRunner()
