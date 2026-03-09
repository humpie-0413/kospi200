"""P5: 감성분석된 갭 뉴스 → ESG 키워드 필터 → esg_daily.parquet 갱신
기존 l3e_esg_sentiment.py 스키마: date, ticker, pred_label(-1/0/1), ESG_Label
"""
import pandas as pd
import numpy as np
import yaml
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE = Path(__file__).resolve().parent.parent
NEWS_DIR = BASE / "data_drive" / "data_backup" / "news_crawl"
ESG_OUTPUT = BASE / "data_drive" / "data_backup" / "esg_daily.parquet"
KEYWORDS_FILE = BASE / "configs" / "esg_keywords.yaml"


def sentiment_to_pred(s):
    """sentiment float → pred_label int (-1/0/1)"""
    if s > 0.1:
        return 1
    elif s < -0.1:
        return -1
    return 0


def load_keywords():
    with open(KEYWORDS_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_gap_articles():
    """갭 뉴스 파일 로드 (sentiment 필수)"""
    files = sorted(NEWS_DIR.glob("news_*.parquet"))
    dfs = []
    for f in files:
        df = pd.read_parquet(f)
        if "sentiment" not in df.columns:
            continue
        df["ticker"] = f.stem.replace("news_", "")
        dfs.append(df)
    if not dfs:
        raise RuntimeError("No sentiment data found")
    all_df = pd.concat(dfs, ignore_index=True)
    all_df["date"] = pd.to_datetime(all_df["date"]).dt.normalize()
    all_df["ticker"] = all_df["ticker"].astype(str).str.zfill(6)
    return all_df


def extract_esg_records(articles, keywords):
    """뉴스에서 ESG 키워드 매칭 → esg_daily 스키마"""
    records = []
    for _, row in articles.iterrows():
        text = str(row.get("title", "")) + " " + str(row.get("summary", "")) + " " + str(row.get("description", ""))
        pred = sentiment_to_pred(row["sentiment"])
        for category, kw_list in keywords.items():
            if any(kw in text for kw in kw_list):
                records.append({
                    "date": row["date"],
                    "ticker": row["ticker"],
                    "pred_label": pred,
                    "ESG_Label": category,
                })
    return pd.DataFrame(records)


def main():
    keywords = load_keywords()
    log.info(f"ESG keywords: E={len(keywords['Environmental'])}, S={len(keywords['Social'])}, G={len(keywords['Governance'])}")

    articles = load_gap_articles()
    log.info(f"Gap articles: {len(articles):,}")

    esg_new = extract_esg_records(articles, keywords)
    log.info(f"ESG records extracted: {len(esg_new):,}")

    if len(esg_new) == 0:
        log.warning("No ESG records — check keywords")
        return

    # 기존 esg_daily 로드 + 합치기
    existing = pd.read_parquet(ESG_OUTPUT)
    log.info(f"Existing esg_daily: {len(existing):,} rows, {existing.date.min().date()} ~ {existing.date.max().date()}")

    esg_new["date"] = pd.to_datetime(esg_new["date"])
    esg_new["ticker"] = esg_new["ticker"].astype(str).str.zfill(6)
    esg_new["pred_label"] = esg_new["pred_label"].astype(int)

    combined = pd.concat([existing, esg_new], ignore_index=True)
    combined = combined.sort_values(["date", "ticker", "ESG_Label"]).reset_index(drop=True)

    combined.to_parquet(ESG_OUTPUT, index=False)
    log.info(f"Saved: {len(combined):,} rows, {combined.date.min().date()} ~ {combined.date.max().date()}")

    # 검증
    after_2025 = combined[combined.date >= "2025-01-01"]
    log.info(f"2025+ rows: {len(after_2025):,}")
    log.info(f"2025+ ESG_Label dist:\n{after_2025.ESG_Label.value_counts().to_string()}")


if __name__ == "__main__":
    main()
