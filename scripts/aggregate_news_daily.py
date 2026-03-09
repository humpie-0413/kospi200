"""P4: 감성분석 완료된 갭 뉴스 → news_sentiment_daily.parquet 갱신
기존 l3n_news_sentiment.py 공식 그대로 포팅.
EWM 연속성 보장: 기존+신규 합쳐서 ticker별 재계산.
"""
import pandas as pd
import numpy as np
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = Path(__file__).resolve().parent.parent / "data_drive" / "data_backup"
NEWS_DIR = BASE / "news_crawl"
OUTPUT = BASE / "news_sentiment_daily.parquet"
K = 5  # shrinkage


def load_gap_articles():
    """갭 뉴스 파일 로드 + sentiment 컬럼 필수"""
    files = sorted(NEWS_DIR.glob("news_*.parquet"))
    dfs = []
    for f in files:
        df = pd.read_parquet(f)
        if "sentiment" not in df.columns:
            continue
        df["ticker"] = f.stem.replace("news_", "")
        dfs.append(df[["ticker", "date", "sentiment"]])
    if not dfs:
        raise RuntimeError("No sentiment data found in news_crawl/")
    all_df = pd.concat(dfs, ignore_index=True)
    all_df["date"] = pd.to_datetime(all_df["date"]).dt.normalize()
    all_df["ticker"] = all_df["ticker"].astype(str).str.zfill(6)
    log.info(f"Gap articles loaded: {len(all_df):,} rows, {all_df.ticker.nunique()} tickers")
    return all_df


def daily_aggregate(articles):
    """일별 집계 → (P-N)/(T+k), conviction, volume"""
    g = articles.groupby(["date", "ticker"])["sentiment"]
    agg = g.agg(
        positive_count=lambda x: (x > 0).sum(),
        negative_count=lambda x: (x < 0).sum(),
        total_count="count",
    ).reset_index()
    agg["news_sentiment"] = (agg["positive_count"] - agg["negative_count"]) / (agg["total_count"] + K)
    agg["news_conviction"] = (agg["positive_count"] + agg["negative_count"]) / (agg["total_count"] + K)
    agg["news_volume"] = agg["total_count"]
    return agg[["date", "ticker", "news_sentiment", "news_conviction", "news_volume"]]


def add_ewm(df):
    """ticker별 EWM 피처 (기존+신규 합쳐서 재계산)"""
    df = df.sort_values(["ticker", "date"]).reset_index(drop=True)
    df["news_sentiment_ewm5"] = df.groupby("ticker")["news_sentiment"].transform(
        lambda v: v.ewm(span=5, adjust=False, min_periods=1).mean()
    )
    df["news_sentiment_ewm20"] = df.groupby("ticker")["news_sentiment"].transform(
        lambda v: v.ewm(span=20, adjust=False, min_periods=1).mean()
    )
    df["news_sentiment_surprise"] = df["news_sentiment"] - df["news_sentiment_ewm20"]
    return df


def main():
    # 1. 기존 데이터 로드
    existing = pd.read_parquet(OUTPUT)
    log.info(f"Existing: {len(existing):,} rows, {existing.date.min().date()} ~ {existing.date.max().date()}")

    # 2. 갭 뉴스 집계
    gap_articles = load_gap_articles()
    gap_daily = daily_aggregate(gap_articles)
    log.info(f"Gap daily: {len(gap_daily):,} rows")

    # 3. 합치기 (중복 제거)
    # 기존에서 EWM 컬럼 제거 → raw만 남김
    existing_raw = existing[["date", "ticker", "news_sentiment", "news_conviction", "news_volume"]].copy()
    combined = pd.concat([existing_raw, gap_daily], ignore_index=True)
    combined = combined.drop_duplicates(subset=["date", "ticker"], keep="last")
    log.info(f"Combined (deduped): {len(combined):,} rows")

    # 4. EWM 재계산 (전체)
    result = add_ewm(combined)

    # 5. 저장
    result.to_parquet(OUTPUT, index=False)
    log.info(f"Saved: {OUTPUT}")
    log.info(f"Date range: {result.date.min().date()} ~ {result.date.max().date()}")

    # 검증
    after_2025 = result[result.date >= "2025-01-01"]
    log.info(f"2025+ rows: {len(after_2025):,}, non-null sentiment: {after_2025.news_sentiment.notna().sum():,}")


if __name__ == "__main__":
    main()
