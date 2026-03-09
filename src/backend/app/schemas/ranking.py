from pydantic import BaseModel
from datetime import date
from typing import Optional


class RankingItem(BaseModel):
    date: date
    ticker: str
    name: Optional[str] = None
    score_total: Optional[float] = None
    rank_total: Optional[float] = None
    top_feature_1: Optional[str] = None
    contrib_1: Optional[float] = None
    top_feature_2: Optional[str] = None
    contrib_2: Optional[float] = None
    top_feature_3: Optional[str] = None
    contrib_3: Optional[float] = None

    class Config:
        from_attributes = True


class RankingResponse(BaseModel):
    date: date
    long: list[RankingItem]
    short: list[RankingItem]


class RankingHistoryParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    ticker: Optional[str] = None
    strategy: str = "long"
    page: int = 1
    page_size: int = 20


class HorizonPerformance(BaseModel):
    horizon: str
    days: int
    label: str
    performance: dict
