"""Backtest models.

bt_metrics / bt_equity_curve 테이블은 전략별로 동일 스키마의 별도 테이블.
(bt120_long, bt120_ens, bt20_short, bt20_ens)
ORM 모델 1개 + 테이블명 동적 지정으로 처리.
"""
from sqlalchemy import Column, Date, String, Float, Integer, text
from app.database import Base

# 전략 → 테이블명 매핑
STRATEGY_TABLES = {
    "bt120_long": {"metrics": "bt_metrics_bt120_long", "equity": "bt_equity_curve_bt120_long"},
    "bt120_ens": {"metrics": "bt_metrics_bt120_ens", "equity": "bt_equity_curve_bt120_ens"},
    "bt20_short": {"metrics": "bt_metrics_bt20_short", "equity": "bt_equity_curve_bt20_short"},
    "bt20_ens": {"metrics": "bt_metrics_bt20_ens", "equity": "bt_equity_curve_bt20_ens"},
}

VALID_STRATEGIES = list(STRATEGY_TABLES.keys())


class BtMetrics(Base):
    """대표 모델 (bt_metrics_bt120_long). 다른 전략은 raw SQL로 조회."""
    __tablename__ = "bt_metrics_bt120_long"
    # PK 없는 테이블이므로 phase를 임시 PK로 사용
    phase = Column(String(20), primary_key=True)
    top_k = Column(Integer)
    holding_days = Column(Integer)
    cost_bps = Column(Float)
    gross_total_return = Column(Float)
    net_total_return = Column(Float)
    gross_cagr = Column(Float)
    net_cagr = Column(Float)
    gross_sharpe = Column(Float)
    net_sharpe = Column(Float)
    gross_mdd = Column(Float)
    net_mdd = Column(Float)
    gross_hit_ratio = Column(Float)
    net_hit_ratio = Column(Float)
    avg_turnover_oneway = Column(Float)
    ic = Column(Float)
    rank_ic = Column(Float)
    gross_calmar_ratio = Column(Float)
    net_calmar_ratio = Column(Float)
    date_start = Column(String(50))
    date_end = Column(String(50))


class BtEquityCurve(Base):
    """대표 모델 (bt_equity_curve_bt120_long). 다른 전략은 raw SQL로 조회."""
    __tablename__ = "bt_equity_curve_bt120_long"
    date = Column(Date, primary_key=True)
    phase = Column(String(20), primary_key=True)
    equity = Column(Float)
    drawdown = Column(Float)


class BenchmarkDaily(Base):
    __tablename__ = "benchmark_069500_daily"
    date = Column(Date, primary_key=True)
    close = Column(Integer)
    ret_1d = Column(Float)
    equity = Column(Float)
