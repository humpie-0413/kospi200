from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.services import ranking_service

router = APIRouter()


@router.get("")
def get_rankings(
    target_date: Optional[date] = Query(None, description="조회 날짜 (기본: 최신)"),
    horizon: str = Query("long_term", pattern="^(short_term|long_term)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """전체 랭킹 (스코어 내림차순, 페이지네이션)"""
    return ranking_service.get_rankings(db, target_date, horizon=horizon, page=page, page_size=page_size)


@router.get("/history")
def get_ranking_history(
    strategy: str = Query("long", pattern="^(long|short)$"),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    ticker: Optional[str] = Query(None, min_length=6, max_length=6),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """과거 랭킹 이력 (페이지네이션)"""
    return ranking_service.get_ranking_history(
        db, strategy, start_date, end_date, ticker, page, page_size
    )


@router.get("/dates")
def get_available_dates(
    limit: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
):
    """조회 가능한 날짜 목록"""
    return ranking_service.get_available_dates(db, limit)


@router.get("/performance")
def get_horizon_performance(
    horizon: str = Query("long_term", pattern="^(short_term|long_term)$"),
    db: Session = Depends(get_db),
):
    """기간별(단기20일/장기120일) 백테스트 성과 요약"""
    return ranking_service.get_horizon_performance(db, horizon)


@router.get("/timeline/{ticker}")
def get_ticker_timeline(
    ticker: str,
    horizon: str = Query("long_term", pattern="^(short_term|long_term)$"),
    days: int = Query(20, ge=5, le=60),
    db: Session = Depends(get_db),
):
    """종목별 랭킹 추이 (최근 N일)"""
    return ranking_service.get_ticker_timeline(db, ticker, horizon, days)
