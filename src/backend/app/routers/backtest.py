from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services import backtest_service
from app.models.backtest import VALID_STRATEGIES

router = APIRouter()


@router.get("/metrics")
def get_metrics(
    strategy: str = Query("bt120_long", description=f"전략: {VALID_STRATEGIES}"),
    db: Session = Depends(get_db),
):
    """백테스트 성과 지표"""
    try:
        return backtest_service.get_metrics(db, strategy)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/equity-curve")
def get_equity_curve(
    strategy: str = Query("bt120_long", description=f"전략: {VALID_STRATEGIES}"),
    phase: Optional[str] = Query(None, description="dev / holdout"),
    db: Session = Depends(get_db),
):
    """에쿼티 커브 데이터"""
    try:
        return backtest_service.get_equity_curve(db, strategy, phase)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/summary")
def get_strategies_summary(db: Session = Depends(get_db)):
    """전체 전략 요약 (holdout 성과)"""
    return backtest_service.get_all_strategies_summary(db)
