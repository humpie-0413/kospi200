from sqlalchemy.orm import Session
from sqlalchemy import text, func
from datetime import date, timedelta
from typing import Optional
import json
from pathlib import Path

from app.config import get_settings
from app.models.ranking import (
    RankingLongWithReasons,
    RankingShortWithReasons,
)
from app.models.backtest import STRATEGY_TABLES

HORIZON_STRATEGIES = {
    "short_term": {"days": 20, "label": "단기 (20일)", "buy": "bt20_ens", "sell": "bt20_short"},
    "long_term": {"days": 120, "label": "장기 (120일)", "buy": "bt120_long", "sell": "bt120_ens"},
}

_TICKER_NAMES: dict[str, str] = {}
_TICKER_MAP_PATH = Path(get_settings().ticker_name_mapping_path)

def _load_ticker_names() -> dict[str, str]:
    global _TICKER_NAMES
    if not _TICKER_NAMES and _TICKER_MAP_PATH.exists():
        with open(_TICKER_MAP_PATH, encoding="utf-8") as f:
            _TICKER_NAMES = json.load(f)
    return _TICKER_NAMES


def get_ticker_name(ticker: str) -> str:
    names = _load_ticker_names()
    padded = ticker.zfill(6)
    return names.get(padded, names.get(ticker, ticker))


def get_latest_ranking_date(db: Session) -> Optional[date]:
    return db.query(func.max(RankingLongWithReasons.date)).scalar()


def get_rankings(db: Session, target_date: Optional[date] = None, top_k: int = 20, horizon: str = "long_term",
                  page: int = 1, page_size: int = 20):
    if target_date is None:
        target_date = get_latest_ranking_date(db)
    if target_date is None:
        return {"date": None, "horizon": horizon, "items": [], "total": 0, "page": 1, "page_size": page_size}

    Model = RankingLongWithReasons if horizon == "long_term" else RankingShortWithReasons
    base = db.query(Model).filter(Model.date == target_date, Model.in_universe == True)
    total = base.count()
    rows = (
        base.order_by(Model.score_total.desc())
        .offset((page - 1) * page_size).limit(page_size).all()
    )
    offset_rank = (page - 1) * page_size
    return {
        "date": target_date,
        "horizon": horizon,
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [_to_dict(r, offset_rank + i + 1) for i, r in enumerate(rows)],
    }


def _to_dict(row, rank):
    d = {
        "date": row.date,
        "ticker": row.ticker,
        "name": get_ticker_name(row.ticker),
        "score_total": row.score_total,
        "rank_total": int(row.rank_total) if row.rank_total else rank,
        "top_feature_1": row.top_feature_1,
        "contrib_1": row.contrib_1,
        "top_feature_2": row.top_feature_2,
        "contrib_2": row.contrib_2,
        "top_feature_3": row.top_feature_3,
        "contrib_3": row.contrib_3,
    }
    # 백분위 (있으면 추가)
    for i in range(1, 4):
        pct = getattr(row, f"percentile_{i}", None)
        d[f"percentile_{i}"] = round(pct, 1) if pct is not None else None
    # 카테고리 점수 (있으면 추가)
    cats = {}
    for cat in ["momentum", "risk", "profitability", "value", "liquidity", "sentiment", "esg"]:
        v = getattr(row, f"cat_{cat}", None)
        if v is not None:
            cats[cat] = round(v, 1)
    if cats:
        d["categories"] = cats
    return d


def get_ticker_timeline(db: Session, ticker: str, horizon: str = "long_term", days: int = 20):
    """종목별 최근 N일 랭킹 추이"""
    Model = RankingLongWithReasons if horizon == "long_term" else RankingShortWithReasons
    rows = (
        db.query(Model.date, Model.score_total, Model.rank_total)
        .filter(Model.ticker == ticker)
        .order_by(Model.date.desc())
        .limit(days)
        .all()
    )
    total_per_date = {}
    for r in rows:
        if r.date not in total_per_date:
            cnt = db.query(func.count(Model.ticker)).filter(Model.date == r.date).scalar()
            total_per_date[r.date] = cnt

    items = []
    for r in reversed(rows):
        total = total_per_date.get(r.date, 294)
        rank_val = int(r.rank_total) if r.rank_total is not None else None
        items.append({
            "date": r.date,
            "score": round(r.score_total, 4) if r.score_total else 0,
            "rank": rank_val,
            "total": total,
        })
    return {
        "ticker": ticker,
        "name": get_ticker_name(ticker),
        "horizon": horizon,
        "timeline": items,
    }


def get_ranking_history(
    db: Session, strategy: str = "long",
    start_date: Optional[date] = None, end_date: Optional[date] = None,
    ticker: Optional[str] = None, page: int = 1, page_size: int = 20,
):
    Model = RankingLongWithReasons if strategy == "long" else RankingShortWithReasons
    query = db.query(Model)
    if start_date:
        query = query.filter(Model.date >= start_date)
    if end_date:
        query = query.filter(Model.date <= end_date)
    if ticker:
        query = query.filter(Model.ticker == ticker)

    total = query.count()
    rows = (
        query.order_by(Model.date.desc(), Model.rank_total)
        .offset((page - 1) * page_size).limit(page_size).all()
    )
    items = [_to_dict(r, 0) for r in rows]
    return {"total": total, "page": page, "page_size": page_size, "items": items}


def get_available_dates(db: Session, limit: int = 30):
    rows = (
        db.query(RankingLongWithReasons.date).distinct()
        .order_by(RankingLongWithReasons.date.desc()).limit(limit).all()
    )
    return [r[0] for r in rows]


def get_horizon_performance(db: Session, horizon: str = "long_term"):
    config = HORIZON_STRATEGIES.get(horizon)
    if not config:
        return None

    perf = {}
    for direction in ("buy", "sell"):
        strategy = config[direction]
        table = STRATEGY_TABLES[strategy]["metrics"]
        try:
            result = db.execute(
                text(f"SELECT * FROM `{table}` WHERE phase = 'holdout' LIMIT 1")
            )
            row = result.fetchone()
            if row:
                perf[direction] = dict(zip(result.keys(), row))
            else:
                perf[direction] = None
        except Exception:
            perf[direction] = None

    return {
        "horizon": horizon,
        "days": config["days"],
        "label": config["label"],
        "performance": perf,
    }
