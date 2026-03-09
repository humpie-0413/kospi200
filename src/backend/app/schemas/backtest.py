from pydantic import BaseModel
from datetime import date
from typing import Optional


class MetricsItem(BaseModel):
    phase: Optional[str] = None
    top_k: Optional[int] = None
    holding_days: Optional[int] = None
    cost_bps: Optional[float] = None
    gross_total_return: Optional[float] = None
    net_total_return: Optional[float] = None
    gross_cagr: Optional[float] = None
    net_cagr: Optional[float] = None
    gross_sharpe: Optional[float] = None
    net_sharpe: Optional[float] = None
    gross_mdd: Optional[float] = None
    net_mdd: Optional[float] = None
    gross_hit_ratio: Optional[float] = None
    net_hit_ratio: Optional[float] = None
    avg_turnover_oneway: Optional[float] = None
    ic: Optional[float] = None
    rank_ic: Optional[float] = None
    gross_calmar_ratio: Optional[float] = None
    net_calmar_ratio: Optional[float] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None


class MetricsResponse(BaseModel):
    strategy: str
    metrics: list[MetricsItem]


class EquityCurvePoint(BaseModel):
    date: date
    equity: Optional[float] = None
    drawdown: Optional[float] = None


class EquityCurveResponse(BaseModel):
    strategy: str
    phase: str
    data: list[EquityCurvePoint]
    benchmark: list[EquityCurvePoint]
