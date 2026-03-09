"""매일 06:00 KST 실행 — 전체 랭킹 데이터 갱신 파이프라인

실행: python scripts/daily_news_pipeline.py [--date YYYY-MM-DD]
기본: 어제 날짜

단계:
  0a. 유니버스 멤버십 확장 (새 월이면 forward-fill)
  0b. OHLCV 수집 (FinanceDataReader)
  0c. 기술적 피처 재계산 (14개 OHLCV 파생)
  0d. 패널 재구축 (OHLCV + 재무 + 유니버스)
  1. 네이버 검색 API로 전일 뉴스 수집
  2. KR-FinBERT-SC 감성분석
  3. news_sentiment_daily.parquet 갱신
  4. esg_daily.parquet 갱신
  5. 패널 머지 (뉴스/ESG) + Track A 예측 + with_reasons
  6. MySQL 리로드
"""
import os
import sys
import time
import logging
import argparse
import subprocess
from pathlib import Path
from datetime import datetime, timedelta

import pandas as pd
import numpy as np
import yaml
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(
            Path(__file__).resolve().parent.parent / "data_drive" / "data_backup" / "daily_pipeline.log",
            encoding="utf-8",
        ),
    ],
)
log = logging.getLogger("daily_pipeline")

PROJECT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT / "src" / "backend" / ".env")
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
BACKUP = PROJECT / "data_drive" / "data_backup"
NEWS_API_DIR = BACKUP / "news_api"
BACKTEST_DIR = PROJECT / "before" / "ranking_backtest"
RAW_DIR = BACKTEST_DIR / "runtime" / "data" / "raw_data"
CAL_DIR = BACKTEST_DIR / "runtime" / "data" / "cal_data"
K = 5  # shrinkage


# ═══════════════════════════════════════════════
# Step 0a: 유니버스 멤버십 확장
# ═══════════════════════════════════════════════
def step0a_universe(target_date):
    """새로운 월이면 마지막 구성 복제"""
    path = RAW_DIR / "universe_k200_membership_monthly.parquet"
    df = pd.read_parquet(path)
    df["date"] = pd.to_datetime(df["date"])

    target_ym = pd.Timestamp(target_date).strftime("%Y-%m")
    existing_ym = set(df["ym"].astype(str).unique())

    if target_ym in existing_ym:
        log.info(f"[Step0a] Universe already has {target_ym}")
        return

    last_date = df["date"].max()
    last_tickers = df[df["date"] == last_date]["ticker"].unique()
    month_end = pd.Timestamp(target_date) + pd.offsets.MonthEnd(0)

    new_rows = [{"date": month_end, "ym": target_ym, "ticker": t} for t in last_tickers]
    df_new = pd.DataFrame(new_rows)
    df_all = pd.concat([df, df_new], ignore_index=True)
    df_all.to_parquet(path, index=False)
    log.info(f"[Step0a] Universe extended to {target_ym}: {len(last_tickers)} tickers")


# ═══════════════════════════════════════════════
# Step 0b: OHLCV 수집 (FinanceDataReader)
# ═══════════════════════════════════════════════
def step0b_ohlcv(target_date):
    """FinanceDataReader로 당일 OHLCV 수집"""
    import FinanceDataReader as fdr

    path = RAW_DIR / "ohlcv_daily.parquet"
    df = pd.read_parquet(path)
    df["date"] = pd.to_datetime(df["date"])

    target_ts = pd.Timestamp(target_date)
    if target_ts in df["date"].values:
        log.info(f"[Step0b] OHLCV already has {target_date}")
        return True

    tickers = sorted(df["ticker"].unique().tolist())
    log.info(f"[Step0b] Downloading OHLCV for {target_date}: {len(tickers)} tickers")

    date_str = str(target_date)
    new_rows = []
    for i, ticker in enumerate(tickers):
        try:
            data = fdr.DataReader(ticker, date_str, date_str)
            if data is not None and len(data) > 0:
                row = data.iloc[0]
                new_rows.append({
                    "date": target_ts,
                    "ticker": ticker,
                    "open": float(row.get("Open", row.get("open", np.nan))),
                    "high": float(row.get("High", row.get("high", np.nan))),
                    "low": float(row.get("Low", row.get("low", np.nan))),
                    "close": float(row.get("Close", row.get("close", np.nan))),
                    "volume": float(row.get("Volume", row.get("volume", 0))),
                })
        except Exception:
            pass
        if (i + 1) % 50 == 0:
            log.info(f"  OHLCV progress: {i+1}/{len(tickers)}")

    if not new_rows:
        log.info(f"[Step0b] No OHLCV data for {target_date} (holiday?)")
        return False

    df_new = pd.DataFrame(new_rows)
    # 기존 피처 컬럼은 NaN으로 (step0c에서 재계산)
    raw_cols = ["date", "ticker", "open", "high", "low", "close", "volume"]
    for c in df.columns:
        if c not in raw_cols and c not in df_new.columns:
            df_new[c] = np.nan
    df_new = df_new[df.columns]

    df_all = pd.concat([df, df_new], ignore_index=True)
    df_all = df_all.drop_duplicates(subset=["date", "ticker"], keep="last")
    df_all.to_parquet(path, index=False)
    log.info(f"[Step0b] OHLCV: +{len(new_rows)} rows for {target_date}")
    return True


# ═══════════════════════════════════════════════
# Step 0c: 기술적 피처 재계산
# ═══════════════════════════════════════════════
def step0c_features():
    """OHLCV 전체에 기술적 피처 재계산 (rolling window 필요)"""
    if str(BACKTEST_DIR) not in sys.path:
        sys.path.insert(0, str(BACKTEST_DIR))
    from src.tracks.shared.stages.data.l1_technical_features import calculate_technical_features

    path = RAW_DIR / "ohlcv_daily.parquet"
    df = pd.read_parquet(path)
    log.info(f"[Step0c] Calculating technical features on {len(df):,} rows...")
    df = calculate_technical_features(df)
    df.to_parquet(path, index=False)
    log.info(f"[Step0c] Technical features done: {df.shape}")


# ═══════════════════════════════════════════════
# Step 0d: 패널 재구축
# ═══════════════════════════════════════════════
def step0d_panel():
    """OHLCV(피처 포함) + 재무 + 유니버스 → panel_merged_daily 재구축"""
    if str(BACKTEST_DIR) not in sys.path:
        sys.path.insert(0, str(BACKTEST_DIR))
    from src.tracks.shared.stages.data.l3_panel_merge import build_panel_merged_daily

    ohlcv = pd.read_parquet(RAW_DIR / "ohlcv_daily.parquet")
    fundamentals = pd.read_parquet(RAW_DIR / "fundamentals_annual.parquet")
    universe = pd.read_parquet(RAW_DIR / "universe_k200_membership_monthly.parquet")

    log.info(f"[Step0d] Building panel: ohlcv={len(ohlcv):,}, fund={len(fundamentals):,}, uni={len(universe):,}")
    panel, warns = build_panel_merged_daily(
        ohlcv_daily=ohlcv,
        fundamentals_annual=fundamentals,
        universe_membership_monthly=universe,
    )
    panel.to_parquet(CAL_DIR / "panel_merged_daily.parquet", index=False)
    log.info(f"[Step0d] Panel rebuilt: {panel.shape}, max_date={panel['date'].max()}")


# ═══════════════════════════════════════════════
# Step 1: 뉴스 수집
# ═══════════════════════════════════════════════
def step1_collect(target_date):
    """네이버 검색 API로 전일 뉴스 수집"""
    if str(PROJECT / "scripts") not in sys.path:
        sys.path.insert(0, str(PROJECT / "scripts"))
    from collect_news_naver_api import run_daily
    count = run_daily(target_date)
    log.info(f"[Step1] {target_date}: {count} articles collected")
    return count


# ═══════════════════════════════════════════════
# Step 2: 감성분석
# ═══════════════════════════════════════════════
_clf = None

def _get_classifier():
    global _clf
    if _clf is None:
        from transformers import pipeline
        import torch
        device = 0 if torch.cuda.is_available() else -1
        log.info(f"[Step2] Loading KR-FinBERT-SC (device={'GPU' if device==0 else 'CPU'})")
        _clf = pipeline("sentiment-analysis", model="snunlp/KR-FinBERT-SC",
                        device=device, max_length=512, truncation=True)
    return _clf


def _score(r):
    if r["label"] == "positive": return r["score"]
    if r["label"] == "negative": return -r["score"]
    return 0.0


def step2_sentiment(target_date):
    """수집된 뉴스에 감성 점수 추가"""
    clf = _get_classifier()
    total = 0
    files = sorted(NEWS_API_DIR.glob("news_*.parquet"))
    for f in files:
        df = pd.read_parquet(f)
        if len(df) == 0:
            continue
        df["date"] = pd.to_datetime(df["date"]).dt.normalize()
        target_rows = df[df["date"] == pd.Timestamp(target_date)]
        if len(target_rows) == 0:
            continue
        needs_analysis = target_rows["sentiment"].isna() if "sentiment" in df.columns else pd.Series(True, index=target_rows.index)
        todo_idx = needs_analysis[needs_analysis].index
        if len(todo_idx) == 0:
            continue
        titles = df.loc[todo_idx, "title"].fillna("").tolist()
        results = clf(titles)
        sentiments = [_score(r) for r in results]
        if "sentiment" not in df.columns:
            df["sentiment"] = np.nan
        df.loc[todo_idx, "sentiment"] = sentiments
        df.to_parquet(f, index=False)
        total += len(todo_idx)

    log.info(f"[Step2] Analyzed {total} articles")
    return total


# ═══════════════════════════════════════════════
# Step 3: news_sentiment_daily 갱신
# ═══════════════════════════════════════════════
def step3_aggregate_news(target_date):
    """신규 기사 일별 집계 → EWM 재계산"""
    articles = []
    for f in sorted(NEWS_API_DIR.glob("news_*.parquet")):
        df = pd.read_parquet(f)
        if "sentiment" not in df.columns:
            continue
        df["ticker"] = f.stem.replace("news_", "")
        df["date"] = pd.to_datetime(df["date"]).dt.normalize()
        day_df = df[df["date"] == pd.Timestamp(target_date)]
        if len(day_df) > 0:
            articles.append(day_df[["ticker", "date", "sentiment"]])

    if not articles:
        log.info("[Step3] No articles for target date — skip")
        return 0

    new_articles = pd.concat(articles, ignore_index=True)
    new_articles["ticker"] = new_articles["ticker"].astype(str).str.zfill(6)

    g = new_articles.groupby(["date", "ticker"])["sentiment"]
    agg = g.agg(
        positive_count=lambda x: (x > 0).sum(),
        negative_count=lambda x: (x < 0).sum(),
        total_count="count",
    ).reset_index()
    agg["news_sentiment"] = (agg["positive_count"] - agg["negative_count"]) / (agg["total_count"] + K)
    agg["news_conviction"] = (agg["positive_count"] + agg["negative_count"]) / (agg["total_count"] + K)
    agg["news_volume"] = agg["total_count"]
    new_daily = agg[["date", "ticker", "news_sentiment", "news_conviction", "news_volume"]]

    output = BACKUP / "news_sentiment_daily.parquet"
    existing = pd.read_parquet(output)
    existing_raw = existing[["date", "ticker", "news_sentiment", "news_conviction", "news_volume"]].copy()
    combined = pd.concat([existing_raw, new_daily], ignore_index=True)
    combined = combined.drop_duplicates(subset=["date", "ticker"], keep="last")

    combined = combined.sort_values(["ticker", "date"]).reset_index(drop=True)
    combined["news_sentiment_ewm5"] = combined.groupby("ticker")["news_sentiment"].transform(
        lambda v: v.ewm(span=5, adjust=False, min_periods=1).mean()
    )
    combined["news_sentiment_ewm20"] = combined.groupby("ticker")["news_sentiment"].transform(
        lambda v: v.ewm(span=20, adjust=False, min_periods=1).mean()
    )
    combined["news_sentiment_surprise"] = combined["news_sentiment"] - combined["news_sentiment_ewm20"]

    combined.to_parquet(output, index=False)
    log.info(f"[Step3] news_sentiment_daily: {len(combined):,} rows, added {len(new_daily)} for {target_date}")
    return len(new_daily)


# ═══════════════════════════════════════════════
# Step 4: esg_daily 갱신
# ═══════════════════════════════════════════════
def step4_esg(target_date):
    """신규 기사에서 ESG 키워드 매칭 → esg_daily에 append"""
    kw_file = PROJECT / "configs" / "esg_keywords.yaml"
    with open(kw_file, encoding="utf-8") as f:
        keywords = yaml.safe_load(f)

    articles = []
    for f in sorted(NEWS_API_DIR.glob("news_*.parquet")):
        df = pd.read_parquet(f)
        if "sentiment" not in df.columns:
            continue
        df["ticker"] = f.stem.replace("news_", "")
        df["date"] = pd.to_datetime(df["date"]).dt.normalize()
        day_df = df[df["date"] == pd.Timestamp(target_date)]
        if len(day_df) > 0:
            articles.append(day_df)

    if not articles:
        log.info("[Step4] No articles — skip")
        return 0

    all_articles = pd.concat(articles, ignore_index=True)
    all_articles["ticker"] = all_articles["ticker"].astype(str).str.zfill(6)

    def _to_pred(s):
        if s > 0.1: return 1
        if s < -0.1: return -1
        return 0

    records = []
    for _, row in all_articles.iterrows():
        text = str(row.get("title", "")) + " " + str(row.get("description", ""))
        pred = _to_pred(row["sentiment"])
        for category, kw_list in keywords.items():
            if any(kw in text for kw in kw_list):
                records.append({
                    "date": row["date"],
                    "ticker": row["ticker"],
                    "pred_label": pred,
                    "ESG_Label": category,
                })

    if not records:
        log.info("[Step4] No ESG keywords matched — skip")
        return 0

    esg_new = pd.DataFrame(records)
    esg_new["pred_label"] = esg_new["pred_label"].astype(int)

    output = BACKUP / "esg_daily.parquet"
    existing = pd.read_parquet(output)
    combined = pd.concat([existing, esg_new], ignore_index=True)
    combined = combined.sort_values(["date", "ticker", "ESG_Label"]).reset_index(drop=True)
    combined.to_parquet(output, index=False)

    log.info(f"[Step4] esg_daily: {len(combined):,} rows, added {len(esg_new)} for {target_date}")
    return len(esg_new)


# ═══════════════════════════════════════════════
# Step 5: 패널 뉴스/ESG 머지 + Track A 예측 + with_reasons
# ═══════════════════════════════════════════════
def step5_panel_and_reasons():
    """뉴스/ESG 패널 머지 → Track A 랭킹 생성 → with_reasons 재생성"""
    if str(PROJECT / "scripts") not in sys.path:
        sys.path.insert(0, str(PROJECT / "scripts"))
    from rebuild_panel_and_reasons import merge_panel, rebuild_reasons

    # 1. 뉴스/ESG 머지
    panel = merge_panel()

    # 2. dataset_daily 삭제 (Track A가 최신 panel을 사용하도록)
    for ext in [".parquet", ".csv"]:
        stale = CAL_DIR / f"dataset_daily{ext}"
        if stale.exists():
            stale.unlink()
            log.info(f"[Step5] Removed stale dataset_daily{ext}")

    # 3. Track A 랭킹 예측
    if str(BACKTEST_DIR) not in sys.path:
        sys.path.insert(0, str(BACKTEST_DIR))
    from src.pipeline.track_a_pipeline import run_track_a_pipeline
    config_path = str(BACKTEST_DIR / "configs" / "config.yaml")
    run_track_a_pipeline(config_path, force_rebuild=True)
    log.info("[Step5] Track A prediction complete")

    # 4. with_reasons 재생성
    rebuild_reasons(panel)
    log.info("[Step5] Panel merged + Track A + with_reasons rebuilt")


# ═══════════════════════════════════════════════
# Step 6: MySQL 리로드
# ═══════════════════════════════════════════════
def step6_mysql():
    """docker cp → LOAD DATA"""
    for side in ["long", "short"]:
        pq_file = CAL_DIR / f"ranking_{side}_daily_with_reasons.parquet"
        df = pd.read_parquet(pq_file)
        df["in_universe"] = df["in_universe"].astype(int)
        csv_path = BACKUP / f"ranking_{side}.csv"
        df.to_csv(csv_path, index=False, lineterminator="\r\n")

        cp_cmd = f'docker cp "{csv_path}" kospi-mysql:/tmp/ranking_{side}.csv'
        subprocess.run(cp_cmd, shell=True, check=True, timeout=120)

        cols = ",".join(df.columns)
        table = f"ranking_{side}_daily_with_reasons"
        sql = (
            f"SET GLOBAL local_infile = 1; "
            f"TRUNCATE TABLE {table}; "
            f"LOAD DATA LOCAL INFILE '/tmp/ranking_{side}.csv' "
            f"INTO TABLE {table} "
            f"FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\\\"' "
            f"LINES TERMINATED BY '\\r\\n' "
            f"IGNORE 1 LINES ({cols}); "
            f"SELECT COUNT(*) AS loaded FROM {table};"
        )
        load_cmd = f'docker exec -i kospi-mysql mysql --local-infile=1 -uroot -p{DB_PASSWORD} kospi200 -e "{sql}"'
        result = subprocess.run(load_cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            log.error(f"[Step6] MySQL {side} error: {result.stderr}")
        else:
            log.info(f"[Step6] MySQL {side}: {result.stdout.strip()}")

    log.info("[Step6] MySQL reload complete")


# ═══════════════════════════════════════════════
# 메인 오케스트레이션
# ═══════════════════════════════════════════════
def run_pipeline(target_date=None, on_step=None):
    """전체 파이프라인 실행. on_step(step_idx, status) for progress tracking."""
    def _s(idx, status="running"):
        if on_step:
            on_step(idx, status)

    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()

    log.info(f"{'='*60}")
    log.info(f"Daily Full Pipeline: {target_date}")
    log.info(f"{'='*60}")
    t_start = time.time()

    # Step 0a: 유니버스 확장
    _s(0)
    t0 = time.time()
    step0a_universe(target_date)
    log.info(f"  Step0a done: {time.time()-t0:.0f}s")
    _s(0, "done")

    # Step 0b: OHLCV 수집
    _s(1)
    t0 = time.time()
    has_ohlcv = step0b_ohlcv(target_date)
    log.info(f"  Step0b done: {time.time()-t0:.0f}s")
    _s(1, "done")

    if not has_ohlcv:
        for i in range(2, 10):
            _s(i, "skip")
        log.info("No OHLCV data (holiday?) — pipeline done")
        return

    # Step 0c: 기술적 피처
    _s(2)
    t0 = time.time()
    step0c_features()
    log.info(f"  Step0c done: {time.time()-t0:.0f}s")
    _s(2, "done")

    # Step 0d: 패널 재구축
    _s(3)
    t0 = time.time()
    step0d_panel()
    log.info(f"  Step0d done: {time.time()-t0:.0f}s")
    _s(3, "done")

    # Step 1: 뉴스 수집
    _s(4)
    t0 = time.time()
    n_collected = step1_collect(target_date)
    log.info(f"  Step1 done: {time.time()-t0:.0f}s")
    _s(4, "done")

    # Step 2~4: 감성분석/집계/ESG
    if n_collected > 0:
        _s(5)
        t0 = time.time()
        step2_sentiment(target_date)
        log.info(f"  Step2 done: {time.time()-t0:.0f}s")
        _s(5, "done")

        _s(6)
        t0 = time.time()
        step3_aggregate_news(target_date)
        log.info(f"  Step3 done: {time.time()-t0:.0f}s")
        _s(6, "done")

        _s(7)
        t0 = time.time()
        step4_esg(target_date)
        log.info(f"  Step4 done: {time.time()-t0:.0f}s")
        _s(7, "done")
    else:
        _s(5, "skip"); _s(6, "skip"); _s(7, "skip")
        log.info("  No news collected — skipping steps 2-4")

    # Step 5: 패널 머지 + Track A + with_reasons
    _s(8)
    t0 = time.time()
    step5_panel_and_reasons()
    log.info(f"  Step5 done: {time.time()-t0:.0f}s")
    _s(8, "done")

    # Step 6: MySQL
    _s(9)
    t0 = time.time()
    step6_mysql()
    log.info(f"  Step6 done: {time.time()-t0:.0f}s")
    _s(9, "done")

    elapsed = time.time() - t_start
    log.info(f"{'='*60}")
    log.info(f"Pipeline complete: {elapsed:.0f}s ({elapsed/60:.1f}min)")
    log.info(f"{'='*60}")


def run_pipeline_sync():
    """스케줄러에서 호출할 동기 함수"""
    run_pipeline()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Daily Full Pipeline")
    parser.add_argument("--date", help="Target date (YYYY-MM-DD), default: yesterday")
    args = parser.parse_args()
    target = datetime.strptime(args.date, "%Y-%m-%d").date() if args.date else None
    run_pipeline(target)
