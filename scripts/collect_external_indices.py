"""외부 지수 일별 수집 + 파생 피처 + 시장 국면 판별

FMP API 우선, FinanceDataReader fallback.
출력: data_drive/data_backup/external_indices_daily.parquet
"""
import os
import sys
import logging
import requests
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

PROJECT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT / "src" / "backend" / ".env")
BACKUP = PROJECT / "data_drive" / "data_backup"
OUTPUT = BACKUP / "external_indices_daily.parquet"

FMP_API_KEY = os.environ.get("FMP_API_KEY", "")

# 수집 대상 지수
INDICES = {
    "spy":   {"fmp": "SPY",       "fdr": "SPY",       "desc": "S&P500 ETF"},
    "vix":   {"fmp": "%5EVIX",    "fdr": "^VIX",      "desc": "CBOE VIX"},
    "oil":   {"fmp": "CLUSD",     "fdr": "CL=F",      "desc": "WTI Crude Oil"},
    "us10y": {"fmp": "%5ETNX",    "fdr": "^TNX",      "desc": "US 10Y Treasury"},
    "dxy":   {"fmp": "DX-Y.NYB",  "fdr": "DX=F",      "desc": "Dollar Index"},
}

# 파생 피처 컬럼명
DERIVED_COLS = [
    "sp500_ret_1d", "vix_level", "vix_change_1d",
    "oil_ret_1d", "us10y_level", "dxy_ret_1d",
]
REGIME_COL = "market_regime"


# ─── FMP API 수집 ───
def fetch_fmp(symbol_key: str, start: str, end: str) -> pd.DataFrame:
    """FMP historical-price-full API"""
    if not FMP_API_KEY:
        return pd.DataFrame()
    sym = INDICES[symbol_key]["fmp"]
    url = (
        f"https://financialmodelingprep.com/api/v3/historical-price-full/{sym}"
        f"?from={start}&to={end}&apikey={FMP_API_KEY}"
    )
    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        hist = data.get("historical", [])
        if not hist:
            return pd.DataFrame()
        df = pd.DataFrame(hist)[["date", "close"]]
        df["date"] = pd.to_datetime(df["date"])
        df = df.rename(columns={"close": f"{symbol_key}_close"})
        return df.sort_values("date").reset_index(drop=True)
    except Exception as e:
        log.warning(f"FMP {symbol_key} failed: {e}")
        return pd.DataFrame()


# ─── FDR fallback ───
def fetch_fdr(symbol_key: str, start: str, end: str) -> pd.DataFrame:
    """FinanceDataReader fallback"""
    try:
        import FinanceDataReader as fdr
        sym = INDICES[symbol_key]["fdr"]
        df = fdr.DataReader(sym, start, end)
        if df is None or len(df) == 0:
            return pd.DataFrame()
        df = df.reset_index()
        # FDR: date may be 'Date', 'date', or 'index' (unnamed index)
        cols_lower = {c.lower(): c for c in df.columns}
        date_col = cols_lower.get("date", None) or (
            "index" if "index" in df.columns else None
        )
        close_col = cols_lower.get("close", None)
        if date_col is None or close_col is None:
            log.warning(f"FDR {symbol_key}: unexpected columns {list(df.columns)}")
            return pd.DataFrame()
        result = df[[date_col, close_col]].copy()
        result.columns = ["date", f"{symbol_key}_close"]
        result["date"] = pd.to_datetime(result["date"])
        return result.sort_values("date").reset_index(drop=True)
    except Exception as e:
        log.warning(f"FDR {symbol_key} failed: {e}")
        return pd.DataFrame()


def fetch_index(symbol_key: str, start: str, end: str) -> pd.DataFrame:
    """FMP 우선, FDR fallback"""
    df = fetch_fmp(symbol_key, start, end)
    if len(df) > 0:
        log.info(f"  {symbol_key}: FMP OK ({len(df)} rows)")
        return df
    df = fetch_fdr(symbol_key, start, end)
    if len(df) > 0:
        log.info(f"  {symbol_key}: FDR fallback ({len(df)} rows)")
        return df
    log.error(f"  {symbol_key}: FAILED (no data)")
    return pd.DataFrame()


# ─── 전체 수집 ───
def collect_all(start: str = "2016-01-01", end: str = None) -> pd.DataFrame:
    """모든 외부 지수 수집 → date 기준 merge"""
    if end is None:
        end = datetime.now().strftime("%Y-%m-%d")
    log.info(f"Collecting external indices: {start} ~ {end}")

    merged = None
    for key in INDICES:
        df = fetch_index(key, start, end)
        if len(df) == 0:
            continue
        if merged is None:
            merged = df
        else:
            merged = merged.merge(df, on="date", how="outer")

    if merged is None or len(merged) == 0:
        log.error("No external index data collected!")
        return pd.DataFrame()

    merged = merged.sort_values("date").reset_index(drop=True)
    # ffill 결측 (공휴일 차이)
    for col in merged.columns:
        if col != "date":
            merged[col] = merged[col].ffill()
    log.info(f"Raw indices: {merged.shape}")
    return merged


# ─── 파생 피처 계산 ───
def compute_derived_features(raw: pd.DataFrame) -> pd.DataFrame:
    """종가 → 수익률/레벨/변화율 + T-1 lag"""
    df = raw.sort_values("date").copy()

    # 파생 피처 (T일 기준)
    df["sp500_ret_1d"] = df["spy_close"].pct_change() * 100
    df["vix_level"] = df["vix_close"]
    df["vix_change_1d"] = df["vix_close"].pct_change() * 100
    df["oil_ret_1d"] = df["oil_close"].pct_change() * 100
    df["us10y_level"] = df["us10y_close"]
    df["dxy_ret_1d"] = df["dxy_close"].pct_change() * 100

    # S&P500 20일 이동평균 (regime 판별용)
    df["spy_ma20"] = df["spy_close"].rolling(20, min_periods=10).mean()
    df["spy_above_ma20"] = (df["spy_close"] > df["spy_ma20"]).astype(int)

    # T-1 lag (lookahead 방지: 한국 T일에 전일 미국 데이터 사용)
    lag_cols = DERIVED_COLS + ["spy_above_ma20"]
    for col in lag_cols:
        df[col] = df[col].shift(1)

    return df


# ─── 시장 국면 판별 ───
def classify_regime(row) -> str:
    """VIX 레벨 + S&P500 MA20 기반 3단계 국면"""
    vix = row.get("vix_level", np.nan)
    above_ma = row.get("spy_above_ma20", np.nan)

    if pd.isna(vix):
        return "neutral"

    # VIX 기반 1차 분류
    if vix < 15:
        base = "bull"
    elif vix > 25:
        base = "bear"
    else:
        base = "neutral"

    # S&P500 MA20 보조: 불일치 시 neutral로 완화
    if not pd.isna(above_ma):
        if base == "bull" and above_ma == 0:
            base = "neutral"  # VIX 낮지만 하락 추세
        elif base == "bear" and above_ma == 1:
            base = "neutral"  # VIX 높지만 상승 추세

    return base


def add_regime(df: pd.DataFrame) -> pd.DataFrame:
    """market_regime 컬럼 추가"""
    df[REGIME_COL] = df.apply(classify_regime, axis=1)
    counts = df[REGIME_COL].value_counts()
    log.info(f"Regime distribution: {counts.to_dict()}")
    return df


# ─── 저장 ───
def save(df: pd.DataFrame, incremental: bool = True):
    """parquet 저장 (incremental merge)"""
    cols = ["date"] + DERIVED_COLS + [REGIME_COL]
    out = df[cols].dropna(subset=["date"]).copy()

    if incremental and OUTPUT.exists():
        existing = pd.read_parquet(OUTPUT)
        existing["date"] = pd.to_datetime(existing["date"])
        combined = pd.concat([existing, out], ignore_index=True)
        combined = combined.drop_duplicates(subset=["date"], keep="last")
        out = combined.sort_values("date").reset_index(drop=True)

    out.to_parquet(OUTPUT, index=False)
    log.info(f"Saved: {OUTPUT.name} ({len(out):,} rows, {out.date.min().date()} ~ {out.date.max().date()})")
    return out


# ─── 일별 갱신 ───
def update_daily(target_date=None):
    """일별 파이프라인용: 최근 30일만 갱신 (rolling window 피처 계산용)"""
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()

    start = (pd.Timestamp(target_date) - pd.Timedelta(days=60)).strftime("%Y-%m-%d")
    end = str(target_date)

    raw = collect_all(start, end)
    if len(raw) == 0:
        log.warning("No data collected for daily update")
        return pd.DataFrame()

    df = compute_derived_features(raw)
    df = add_regime(df)
    return save(df, incremental=True)


# ─── 전체 재구축 ───
def rebuild_all(start: str = "2016-01-01", end: str = None):
    """전체 기간 재구축"""
    raw = collect_all(start, end)
    if len(raw) == 0:
        return pd.DataFrame()
    df = compute_derived_features(raw)
    df = add_regime(df)
    return save(df, incremental=False)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Collect external indices")
    parser.add_argument("--mode", choices=["daily", "rebuild"], default="daily")
    parser.add_argument("--date", help="Target date (YYYY-MM-DD)")
    parser.add_argument("--start", default="2016-01-01")
    args = parser.parse_args()

    if args.mode == "rebuild":
        rebuild_all(args.start)
    else:
        target = datetime.strptime(args.date, "%Y-%m-%d").date() if args.date else None
        update_daily(target)
