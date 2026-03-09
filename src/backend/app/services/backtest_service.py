from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.models.backtest import STRATEGY_TABLES, VALID_STRATEGIES, BenchmarkDaily


def _validate_strategy(strategy: str):
    if strategy not in VALID_STRATEGIES:
        raise ValueError(f"Invalid strategy: {strategy}. Must be one of {VALID_STRATEGIES}")


def get_metrics(db: Session, strategy: str = "bt120_long"):
    _validate_strategy(strategy)
    table = STRATEGY_TABLES[strategy]["metrics"]
    result = db.execute(text(f"SELECT * FROM `{table}`"))
    columns = result.keys()
    rows = [dict(zip(columns, row)) for row in result.fetchall()]
    return {"strategy": strategy, "metrics": rows}


def get_equity_curve(
    db: Session,
    strategy: str = "bt120_long",
    phase: Optional[str] = None,
):
    _validate_strategy(strategy)
    table = STRATEGY_TABLES[strategy]["equity"]

    query = f"SELECT date, phase, equity, drawdown FROM `{table}`"
    params = {}
    if phase:
        query += " WHERE phase = :phase"
        params["phase"] = phase
    query += " ORDER BY date"

    result = db.execute(text(query), params)
    data = [{"date": r[0], "equity": r[2], "drawdown": r[3]} for r in result.fetchall()]

    # 벤치마크
    benchmark_rows = db.query(BenchmarkDaily).order_by(BenchmarkDaily.date).all()
    benchmark = [{"date": r.date, "equity": r.equity, "drawdown": None} for r in benchmark_rows]

    return {
        "strategy": strategy,
        "phase": phase or "all",
        "data": data,
        "benchmark": benchmark,
    }


def get_all_strategies_summary(db: Session):
    summaries = []
    for strategy in VALID_STRATEGIES:
        table = STRATEGY_TABLES[strategy]["metrics"]
        try:
            result = db.execute(text(f"SELECT * FROM `{table}` WHERE phase = 'holdout' LIMIT 1"))
            row = result.fetchone()
            if row:
                columns = result.keys()
                summaries.append({"strategy": strategy, **dict(zip(columns, row))})
        except Exception:
            continue
    return summaries
