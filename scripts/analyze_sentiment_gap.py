"""P3: 갭 뉴스(2025-01~2026-02) 감성분석 — KR-FinBERT-SC (CPU/GPU 자동)"""
import pandas as pd
import numpy as np
from pathlib import Path
import json, time, logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

NEWS_DIR = Path(__file__).resolve().parent.parent / "data_drive" / "data_backup" / "news_crawl"
PROGRESS_FILE = NEWS_DIR / "sentiment_progress.json"
BATCH_SIZE = 64


def load_progress():
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text(encoding="utf-8"))
    return {"completed": [], "failed": []}


def save_progress(prog):
    PROGRESS_FILE.write_text(json.dumps(prog, ensure_ascii=False, indent=2), encoding="utf-8")


def build_pipeline():
    from transformers import pipeline
    import torch
    device = 0 if torch.cuda.is_available() else -1
    log.info(f"Device: {'GPU' if device == 0 else 'CPU'}")
    return pipeline("sentiment-analysis", model="snunlp/KR-FinBERT-SC",
                     device=device, max_length=512, truncation=True)


def score_from_result(r):
    """positive → +conf, negative → -conf, neutral → 0"""
    lab = r["label"]
    if lab == "positive":
        return r["score"]
    elif lab == "negative":
        return -r["score"]
    return 0.0


def process_ticker(clf, ticker, force=False):
    fpath = NEWS_DIR / f"news_{ticker}.parquet"
    if not fpath.exists():
        return False
    df = pd.read_parquet(fpath)
    if len(df) == 0:
        return False
    if "sentiment" in df.columns and not force:
        return True

    titles = df["title"].fillna("").tolist()
    sentiments = []
    for i in range(0, len(titles), BATCH_SIZE):
        batch = titles[i:i + BATCH_SIZE]
        results = clf(batch)
        sentiments.extend([score_from_result(r) for r in results])
    df["sentiment"] = sentiments
    df.to_parquet(fpath, index=False)
    return True


def main():
    prog = load_progress()
    clf = build_pipeline()

    files = sorted(NEWS_DIR.glob("news_*.parquet"))
    log.info(f"Total files: {len(files)}, already done: {len(prog['completed'])}")

    for idx, f in enumerate(files, 1):
        ticker = f.stem.replace("news_", "")
        if ticker in prog["completed"]:
            continue
        try:
            t0 = time.time()
            ok = process_ticker(clf, ticker)
            elapsed = time.time() - t0
            if ok:
                prog["completed"].append(ticker)
                n = len(pd.read_parquet(f))
                log.info(f"[{idx}/{len(files)}] {ticker}: {n} articles, {elapsed:.1f}s")
            else:
                prog["failed"].append(ticker)
        except Exception as e:
            log.error(f"[{idx}/{len(files)}] {ticker} FAILED: {e}")
            prog["failed"].append(ticker)
        if idx % 10 == 0:
            save_progress(prog)

    save_progress(prog)
    log.info(f"Done. completed={len(prog['completed'])}, failed={len(prog['failed'])}")


if __name__ == "__main__":
    main()
