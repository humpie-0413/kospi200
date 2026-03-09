"""P6+P7: 패널 뉴스/ESG 컬럼 갱신 → with_reasons 재생성 → MySQL 리로드
독립 실행 스크립트 (프로젝트 내부 import 없이).
"""
import os
import pandas as pd
import numpy as np
from pathlib import Path
from scipy.stats import norm
from dotenv import load_dotenv
import logging, sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

PROJECT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT / "src" / "backend" / ".env")
CAL_DIR = PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "cal_data"
BACKUP = PROJECT / "data_drive" / "data_backup"
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")

NEWS_COLS = ["news_sentiment", "news_conviction", "news_volume",
             "news_sentiment_ewm5", "news_sentiment_ewm20", "news_sentiment_surprise"]
ESG_COLS = ["esg_score", "environmental_score", "social_score", "governance_score"]
K = 5  # shrinkage


# ─── P6a: 뉴스 피처 머지 ───
def build_news_features(news_daily: pd.DataFrame) -> pd.DataFrame:
    """news_sentiment_daily → lag=1 적용 후 반환"""
    df = news_daily.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["ticker"] = df["ticker"].astype(str).str.zfill(6)
    df = df.sort_values(["ticker", "date"]).reset_index(drop=True)
    # lag 1 적용
    for col in ["news_sentiment", "news_conviction", "news_volume",
                 "news_sentiment_ewm5", "news_sentiment_ewm20", "news_sentiment_surprise"]:
        if col in df.columns:
            df[col] = df.groupby("ticker")[col].shift(1)
    return df


# ─── P6b: ESG 피처 생성 ───
def build_esg_features(esg_raw: pd.DataFrame) -> pd.DataFrame:
    """esg_daily (article-level) → 일별 집계 → 4피처 + lag=1"""
    df = esg_raw.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["ticker"] = df["ticker"].astype(str).str.zfill(6)
    lab = pd.to_numeric(df["pred_label"], errors="coerce").fillna(0).astype(int)

    # 전체 P/N/T
    df["_is_p"] = (lab == 1).astype(int)
    df["_is_n"] = (lab == -1).astype(int)

    g = df.groupby(["date", "ticker"])
    agg = g.agg(P=("_is_p", "sum"), N=("_is_n", "sum"), T=("_is_p", "count")).reset_index()
    agg["esg_score"] = (agg["P"] - agg["N"]) / (agg["T"] + K)

    # E/S/G 별
    for label_name in ["Environmental", "Social", "Governance"]:
        sub = df[df["ESG_Label"] == label_name].copy()
        if len(sub) == 0:
            agg[f"{label_name.lower()}_score"] = 0.0
            continue
        g2 = sub.groupby(["date", "ticker"])
        a2 = g2.agg(lP=("_is_p", "sum"), lN=("_is_n", "sum"), lT=("_is_p", "count")).reset_index()
        a2[f"{label_name.lower()}_score"] = (a2["lP"] - a2["lN"]) / (a2["lT"] + K)
        agg = agg.merge(a2[["date", "ticker", f"{label_name.lower()}_score"]],
                        on=["date", "ticker"], how="left")
        agg[f"{label_name.lower()}_score"] = agg[f"{label_name.lower()}_score"].fillna(0.0)

    result = agg[["date", "ticker"] + ESG_COLS].copy()
    result = result.sort_values(["ticker", "date"]).reset_index(drop=True)
    # lag 1
    for col in ESG_COLS:
        result[col] = result.groupby("ticker")[col].shift(1)
    return result


# ─── P6c: 패널 머지 ───
def merge_panel():
    log.info("Loading panel...")
    panel = pd.read_parquet(CAL_DIR / "panel_merged_daily.parquet")
    panel["date"] = pd.to_datetime(panel["date"])
    panel["ticker"] = panel["ticker"].astype(str).str.zfill(6)
    log.info(f"Panel: {panel.shape}")

    # 기존 뉴스/ESG 컬럼 드롭
    panel = panel.drop(columns=NEWS_COLS + ESG_COLS, errors="ignore")

    # 뉴스 피처
    log.info("Building news features...")
    news_daily = pd.read_parquet(BACKUP / "news_sentiment_daily.parquet")
    news_feats = build_news_features(news_daily)
    panel = panel.merge(news_feats[["date", "ticker"] + NEWS_COLS],
                        on=["date", "ticker"], how="left")

    # ESG 피처
    log.info("Building ESG features...")
    esg_raw = pd.read_parquet(BACKUP / "esg_daily.parquet")
    esg_feats = build_esg_features(esg_raw)
    panel = panel.merge(esg_feats[["date", "ticker"] + ESG_COLS],
                        on=["date", "ticker"], how="left")

    # 저장
    panel.to_parquet(CAL_DIR / "panel_merged_daily.parquet", index=False)
    log.info(f"Panel saved: {panel.shape}")

    # 검증
    p25 = panel[panel.date >= "2025-01-01"]
    for c in NEWS_COLS + ESG_COLS:
        nn = p25[c].notna().sum()
        log.info(f"  2025+ {c}: {nn}/{len(p25)} non-null")

    return panel


# ─── P6d: with_reasons 재생성 ───
FEATURE_CATEGORY = {
    "momentum_3m": "momentum", "momentum_6m": "momentum", "momentum_rank": "momentum",
    "price_momentum": "momentum", "price_momentum_20d": "momentum", "price_momentum_60d": "momentum",
    "momentum_reversal": "momentum", "ret_daily": "momentum",
    "volatility": "risk", "volatility_20d": "risk", "volatility_60d": "risk",
    "downside_volatility_60d": "risk", "max_drawdown_60d": "risk",
    "net_income": "profitability", "roe": "profitability",
    "equity": "value", "total_liabilities": "value", "debt_ratio": "value",
    "turnover": "liquidity", "volume_ratio": "liquidity",
    "news_sentiment": "sentiment", "news_sentiment_ewm5": "sentiment",
    "news_sentiment_ewm20": "sentiment", "news_sentiment_surprise": "sentiment",
    "news_volume": "sentiment",
    "esg_score": "esg", "environmental_score": "esg",
    "social_score": "esg", "governance_score": "esg",
}
CATEGORIES = ["momentum", "risk", "profitability", "value", "liquidity", "sentiment", "esg"]


def load_feature_list(yaml_path):
    import yaml
    with open(yaml_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    feats = []
    for v in data.values():
        if isinstance(v, list):
            feats.extend(v)
        elif isinstance(v, dict):
            for vv in v.values():
                if isinstance(vv, list):
                    feats.extend(vv)
    return feats


def compute_reasons_and_percentiles(panel, feature_cols, top_n=3):
    available = [f for f in feature_cols if f in panel.columns]
    n = len(panel)
    result = {}
    for i in range(1, top_n + 1):
        result[f"top_feature_{i}"] = [""] * n
        result[f"contrib_{i}"] = [0.0] * n
        result[f"percentile_{i}"] = [0.0] * n
    for cat in CATEGORIES:
        result[f"cat_{cat}"] = np.zeros(n)

    zscore_matrix = pd.DataFrame(0.0, index=panel.index, columns=available)
    pctile_matrix = pd.DataFrame(0.0, index=panel.index, columns=available)

    for _, group in panel.groupby("date"):
        for feat in available:
            vals = group[feat]
            mu, std = vals.mean(), vals.std()
            if std > 1e-8:
                zscore_matrix.loc[group.index, feat] = (vals - mu) / std
            pctile_matrix.loc[group.index, feat] = vals.rank(pct=True).values * 100

    weight = 1.0 / len(available) if available else 1.0
    contrib_matrix = zscore_matrix * weight

    cat_feats = {cat: [f for f in available if FEATURE_CATEGORY.get(f) == cat] for cat in CATEGORIES}
    for cat in CATEGORIES:
        feats = cat_feats[cat]
        if feats:
            cat_z = zscore_matrix[feats].mean(axis=1)
            result[f"cat_{cat}"] = (norm.cdf(cat_z.values) * 100).clip(0, 100)

    for i, idx in enumerate(panel.index):
        row_contrib = contrib_matrix.loc[idx]
        row_pctile = pctile_matrix.loc[idx]
        top = row_contrib.abs().nlargest(top_n)
        for rank, feat_name in enumerate(top.index, 1):
            result[f"top_feature_{rank}"][i] = feat_name
            result[f"contrib_{rank}"][i] = float(row_contrib[feat_name])
            result[f"percentile_{rank}"][i] = round(float(row_pctile[feat_name]), 1)

    return pd.DataFrame(result, index=panel.index)


def build_with_reasons(ranking_file, panel, feature_cols, output_file):
    ranking = pd.read_parquet(CAL_DIR / ranking_file)
    ranking["date"] = pd.to_datetime(ranking["date"])
    score_col = next((c for c in ["score_total", "score_total_long", "score_total_short", "score_ens"]
                      if c in ranking.columns), None)
    if not score_col:
        raise ValueError(f"No score column in {ranking_file}")

    result = ranking[["date", "ticker"]].copy()
    result["score_total"] = ranking[score_col].values
    rank_col = next((c for c in ["rank_total", "rank_total_long", "rank_total_short"]
                     if c in ranking.columns), None)
    result["rank_total"] = ranking[rank_col].values if rank_col else np.nan
    # panel의 in_universe 우선 (universe 멤버십 forward fill 반영)
    panel_iu = panel[["date", "ticker", "in_universe"]].drop_duplicates(subset=["date", "ticker"])
    panel_iu["date"] = pd.to_datetime(panel_iu["date"])
    result = result.merge(panel_iu, on=["date", "ticker"], how="left")
    result["in_universe"] = result["in_universe"].fillna(False)

    panel_sub = panel[["date", "ticker"] + [f for f in feature_cols if f in panel.columns]].copy()
    panel_sub["date"] = pd.to_datetime(panel_sub["date"])
    merged = result.merge(panel_sub, on=["date", "ticker"], how="left")

    extras = compute_reasons_and_percentiles(merged, feature_cols)
    for col in extras.columns:
        result[col] = extras[col].values

    out_path = CAL_DIR / output_file
    result.to_parquet(out_path, index=False)
    log.info(f"  {output_file}: {len(result):,} rows, max_date={result.date.max().date()}")
    return result


def rebuild_reasons(panel):
    feat_dir = PROJECT / "before" / "ranking_backtest" / "configs"
    short_feats = load_feature_list(feat_dir / "features_short_v1.yaml")
    long_feats = load_feature_list(feat_dir / "features_long_v1.yaml")
    log.info(f"Features: short={len(short_feats)}, long={len(long_feats)}")

    log.info("Building ranking_short_daily_with_reasons...")
    build_with_reasons("ranking_short_daily.parquet", panel, short_feats,
                       "ranking_short_daily_with_reasons.parquet")
    log.info("Building ranking_long_daily_with_reasons...")
    build_with_reasons("ranking_long_daily.parquet", panel, long_feats,
                       "ranking_long_daily_with_reasons.parquet")


# ─── P7: MySQL 리로드 ───
def reload_mysql():
    import subprocess, tempfile, os

    for side in ["long", "short"]:
        pq_file = CAL_DIR / f"ranking_{side}_daily_with_reasons.parquet"
        df = pd.read_parquet(pq_file)
        df["in_universe"] = df["in_universe"].astype(int)
        # CSV 저장 (LOAD DATA 용)
        csv_path = BACKUP / f"ranking_{side}.csv"
        df.to_csv(csv_path, index=False, lineterminator="\r\n")
        log.info(f"CSV: {csv_path} ({len(df):,} rows)")

        table = f"ranking_{side}_daily_with_reasons"
        cols = ",".join(df.columns)
        sql = f"""
SET GLOBAL local_infile = 1;
TRUNCATE TABLE {table};
LOAD DATA LOCAL INFILE '{csv_path.as_posix()}'
INTO TABLE {table}
FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '"'
LINES TERMINATED BY '\\r\\n'
IGNORE 1 LINES
({cols});
SELECT COUNT(*) AS loaded FROM {table};
"""
        sql_file = BACKUP / f"_load_{side}.sql"
        sql_file.write_text(sql, encoding="utf-8")
        cmd = f'docker exec -i kospi-mysql mysql --local-infile=1 -uroot -p{DB_PASSWORD} kospi200 < "{sql_file.as_posix()}"'
        log.info(f"Loading {table}...")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            log.error(f"MySQL error: {result.stderr}")
        else:
            log.info(f"MySQL stdout: {result.stdout.strip()}")
        sql_file.unlink(missing_ok=True)


def verify_mysql():
    import subprocess
    sql = """
SELECT '=== 2025+ sentiment check ===' AS msg;
SELECT date, ticker, cat_sentiment, cat_esg
FROM ranking_long_daily_with_reasons
WHERE date >= '2025-01-02' AND cat_sentiment != 50
LIMIT 5;
SELECT '=== row counts ===' AS msg;
SELECT 'long' AS side, COUNT(*) AS cnt FROM ranking_long_daily_with_reasons
UNION ALL
SELECT 'short', COUNT(*) FROM ranking_short_daily_with_reasons;
"""
    cmd = f'docker exec -i kospi-mysql mysql -uroot -p{DB_PASSWORD} kospi200 -e "{sql}"'
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60)
    log.info(f"Verification:\n{result.stdout}")
    if result.returncode != 0:
        log.error(f"Error: {result.stderr}")


if __name__ == "__main__":
    # P6: 패널 머지
    panel = merge_panel()

    # P6d: with_reasons 재생성
    rebuild_reasons(panel)

    # P7: MySQL 리로드
    reload_mysql()
    verify_mysql()

    log.info("P6+P7 complete!")
