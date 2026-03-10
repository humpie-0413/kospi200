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
    """에쿼티 커브: 선형 보간 + 벤치마크 정규화 → 일간 머지 데이터 반환"""
    _validate_strategy(strategy)
    table = STRATEGY_TABLES[strategy]["equity"]

    query = f"SELECT date, phase, equity, drawdown FROM `{table}`"
    params = {}
    if phase:
        query += " WHERE phase = :phase"
        params["phase"] = phase
    query += " ORDER BY date"

    result = db.execute(text(query), params)
    equity_rows = [{"date": r[0], "equity": float(r[2]), "drawdown": float(r[3] or 0)} for r in result.fetchall()]

    if not equity_rows:
        return {"strategy": strategy, "phase": phase or "all", "data": []}

    # 벤치마크 (일간)
    bench_rows = db.query(BenchmarkDaily).order_by(BenchmarkDaily.date).all()

    # 에쿼티 날짜 범위
    start_date = equity_rows[0]["date"]
    end_date = equity_rows[-1]["date"]

    # 벤치마크 필터 + 정규화 (시작일 = 1.0)
    filtered_bench = [b for b in bench_rows if start_date <= b.date <= end_date]
    if not filtered_bench:
        return {"strategy": strategy, "phase": phase or "all", "data": []}

    bench_base = None
    for b in bench_rows:
        if b.date <= start_date:
            bench_base = b.equity
    if bench_base is None or bench_base == 0:
        bench_base = filtered_bench[0].equity

    # 선형 보간: sparse 에쿼티 → 일간 데이터
    eq_dates = [r["date"] for r in equity_rows]
    eq_vals = [r["equity"] for r in equity_rows]
    eq_idx = 0

    merged = []
    for b in filtered_bench:
        d = b.date

        # eq_idx 전진: eq_dates[eq_idx] <= d
        while eq_idx < len(eq_dates) - 1 and eq_dates[eq_idx + 1] <= d:
            eq_idx += 1

        # 보간
        if eq_idx >= len(eq_dates) - 1:
            eq_val = eq_vals[-1]
        elif d == eq_dates[eq_idx]:
            eq_val = eq_vals[eq_idx]
        elif eq_idx + 1 < len(eq_dates):
            d0, d1 = eq_dates[eq_idx], eq_dates[eq_idx + 1]
            v0, v1 = eq_vals[eq_idx], eq_vals[eq_idx + 1]
            total = (d1 - d0).days
            elapsed = (d - d0).days
            t = elapsed / max(1, total)
            eq_val = v0 + t * (v1 - v0)
        else:
            eq_val = eq_vals[eq_idx]

        merged.append({
            "date": d,
            "equity": round(eq_val, 6),
            "benchmark": round(b.equity / bench_base, 6),
        })

    # 드로다운 재계산 (보간된 에쿼티 기준)
    peak = merged[0]["equity"] if merged else 1.0
    for pt in merged:
        peak = max(peak, pt["equity"])
        pt["drawdown"] = round((pt["equity"] - peak) / peak, 6) if peak > 0 else 0.0

    return {
        "strategy": strategy,
        "phase": phase or "all",
        "data": merged,
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
