import logging
import sys
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import get_settings

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None

# daily_news_pipeline 경로 등록
_SCRIPTS_DIR = str(Path(__file__).resolve().parent.parent.parent.parent.parent / "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)


def _daily_job():
    """매일 06:00 실행: 뉴스 수집 → 감성분석 → 패널 갱신 → MySQL"""
    logger.info("Scheduled daily news pipeline started")
    try:
        from daily_news_pipeline import run_pipeline_sync
        run_pipeline_sync()
    except Exception as e:
        logger.error("Daily pipeline failed: %s", e, exc_info=True)
    logger.info("Scheduled daily news pipeline finished")


def start_scheduler():
    global _scheduler
    settings = get_settings()

    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _daily_job,
        trigger=CronTrigger(hour=settings.scheduler_hour, minute=settings.scheduler_minute),
        id="daily_pipeline",
        max_instances=1,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started: daily at %02d:%02d", settings.scheduler_hour, settings.scheduler_minute)


def check_and_run_if_needed():
    """서버 시작 시 어제 데이터가 없으면 자동 수집"""
    from datetime import date, timedelta
    try:
        from app.database import SessionLocal
        from sqlalchemy import text

        yesterday = (date.today() - timedelta(days=1)).isoformat()
        db = SessionLocal()
        try:
            row = db.execute(
                text("SELECT MAX(date) FROM ranking_long_daily_with_reasons")
            ).fetchone()
            max_date = str(row[0]) if row[0] else "1900-01-01"
            if max_date < yesterday:
                logger.info("Stale data (max=%s < %s) — triggering daily pipeline", max_date, yesterday)
                import threading
                threading.Thread(target=_daily_job, daemon=True).start()
            else:
                logger.info("Data is fresh (max=%s)", max_date)
        finally:
            db.close()
    except Exception as e:
        logger.error("Startup data check failed: %s", e)


def stop_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
        _scheduler = None
