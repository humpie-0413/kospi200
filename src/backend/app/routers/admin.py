import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth.dependencies import require_admin
from app.models.user import User
from app.pipeline.wrapper import pipeline_runner
from app.pipeline.state import pipeline_state

router = APIRouter()


@router.get("/freshness")
def get_freshness(
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """각 테이블별 max(date) + row count"""
    tables = [
        ("ranking_long", "ranking_long_daily_with_reasons"),
        ("ranking_short", "ranking_short_daily_with_reasons"),
    ]
    result = {}
    for key, table in tables:
        try:
            row = db.execute(text(f"SELECT MAX(date), COUNT(*) FROM {table}")).fetchone()
            result[key] = {"max_date": str(row[0]) if row[0] else None, "count": row[1]}
        except Exception:
            result[key] = {"max_date": None, "count": 0}
    return result


@router.post("/pipeline/daily")
async def trigger_daily(user: User = Depends(require_admin)):
    """일별 전체 파이프라인 (10단계)"""
    if pipeline_state.is_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    asyncio.create_task(pipeline_runner.run_daily(triggered_by=user.username))
    return {"status": "started", "action": "daily"}


@router.post("/pipeline/collect")
async def trigger_collect(user: User = Depends(require_admin)):
    """데이터 수집 트리거 (관리자 전용)"""
    if pipeline_state.is_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    asyncio.create_task(pipeline_runner.run_collect(triggered_by=user.username))
    return {"status": "started", "action": "collect"}


@router.post("/pipeline/predict")
async def trigger_predict(user: User = Depends(require_admin)):
    """랭킹 예측 생성 트리거 (관리자 전용)"""
    if pipeline_state.is_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    asyncio.create_task(pipeline_runner.run_predict(triggered_by=user.username))
    return {"status": "started", "action": "predict"}


@router.post("/pipeline/run-all")
async def trigger_run_all(user: User = Depends(require_admin)):
    """전체 파이프라인 실행 (수집 + 예측)"""
    if pipeline_state.is_running:
        raise HTTPException(status_code=409, detail="Pipeline already running")
    asyncio.create_task(pipeline_runner.run_all(triggered_by=user.username))
    return {"status": "started", "action": "run-all"}


@router.get("/pipeline/status")
def get_pipeline_status(user: User = Depends(require_admin)):
    """파이프라인 실행 상태 (단계별 진행 포함)"""
    return pipeline_state.to_dict()


@router.get("/pipeline/logs")
def get_pipeline_logs(
    limit: int = 10,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """파이프라인 실행 로그"""
    from app.models.pipeline_log import PipelineLog
    rows = (
        db.query(PipelineLog)
        .order_by(PipelineLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "action": r.action,
            "status": r.status,
            "started_at": r.started_at,
            "finished_at": r.finished_at,
            "message": r.message,
            "triggered_by": r.triggered_by,
        }
        for r in rows
    ]
