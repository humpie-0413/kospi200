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


def get_simple_backtest(db: Session):
    """초보자용 단순 백테스트: bt120_long 기준, 100만원 투자 시뮬레이션"""
    INITIAL = 1_000_000

    # 메트릭스
    metrics_data = get_metrics(db, "bt120_long")
    holdout = None
    for m in metrics_data.get("metrics", []):
        if m.get("phase") == "holdout":
            holdout = m
            break
    if not holdout:
        # fallback to dev
        for m in metrics_data.get("metrics", []):
            holdout = m
            break

    # 에쿼티 커브
    curve_data = get_equity_curve(db, "bt120_long")
    points = curve_data.get("data", [])

    if not points or not holdout:
        return {"error": "데이터 없음"}

    # 100만원 기준 에쿼티 커브
    eq_start = points[0]["equity"]
    bm_start = points[0]["benchmark"]
    equity_curve = []
    for p in points:
        ai_val = round(INITIAL * p["equity"] / eq_start)
        bm_val = round(INITIAL * p["benchmark"] / bm_start)
        equity_curve.append({
            "date": str(p["date"]),
            "ai_value": ai_val,
            "benchmark_value": bm_val,
        })

    final_ai = equity_curve[-1]["ai_value"]
    final_bm = equity_curve[-1]["benchmark_value"]
    total_return = round((final_ai / INITIAL - 1) * 100, 1)
    bm_return = round((final_bm / INITIAL - 1) * 100, 1)

    # 기간별 수익률
    def _period_return(days: int):
        if len(equity_curve) <= days:
            return None
        start_idx = len(equity_curve) - days
        ai_s = equity_curve[start_idx]["ai_value"]
        bm_s = equity_curve[start_idx]["benchmark_value"]
        ai_e = equity_curve[-1]["ai_value"]
        bm_e = equity_curve[-1]["benchmark_value"]
        return {
            "ai": round((ai_e / ai_s - 1) * 100, 1),
            "benchmark": round((bm_e / bm_s - 1) * 100, 1),
        }

    period_returns = {
        "1y": _period_return(252),
        "3y": _period_return(252 * 3),
        "5y": _period_return(252 * 5),
        "all": {"ai": total_return, "benchmark": bm_return},
    }

    # 별점 계산
    sharpe = float(holdout.get("net_sharpe", 0) or 0)
    ic = float(holdout.get("ic", 0) or 0)
    if sharpe > 1.5: risk_stars = 5
    elif sharpe > 1.0: risk_stars = 4
    elif sharpe > 0.5: risk_stars = 3
    elif sharpe > 0: risk_stars = 2
    else: risk_stars = 1

    if ic > 0.1: acc_stars = 5
    elif ic > 0.07: acc_stars = 4
    elif ic > 0.05: acc_stars = 3
    elif ic > 0.02: acc_stars = 2
    else: acc_stars = 1

    net_mdd = float(holdout.get("net_mdd", 0) or 0)
    net_cagr = float(holdout.get("net_cagr", 0) or 0)
    net_hit_ratio = float(holdout.get("net_hit_ratio", 0) or 0)

    return {
        "initial_amount": INITIAL,
        "final_amount": final_ai,
        "total_return_pct": total_return,
        "annual_return_pct": round(net_cagr * 100, 1),
        "max_loss_pct": round(net_mdd * 100, 1),
        "win_rate_pct": round(net_hit_ratio * 100, 0),
        "vs_benchmark_pct": round(total_return - bm_return, 1),
        "benchmark_return_pct": bm_return,
        "ai_accuracy_stars": acc_stars,
        "risk_efficiency_stars": risk_stars,
        "sharpe": round(sharpe, 2),
        "ic": round(ic, 4),
        "net_calmar": round(float(holdout.get("net_calmar_ratio", 0) or 0), 2),
        "net_sortino": round(float(holdout.get("net_sharpe", 0) or 0) * 1.2, 2),  # approx
        "volatility_pct": round(abs(net_cagr / sharpe * 100) if sharpe != 0 else 0, 1),
        "equity_curve": equity_curve,
        "period_returns": period_returns,
        "date_start": str(points[0]["date"]),
        "date_end": str(points[-1]["date"]),
    }
