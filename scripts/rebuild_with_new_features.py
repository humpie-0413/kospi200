"""Session B1: RSI/MACD/BB 피처 추가 후 패널 재구축 + Track A 재실행"""
import sys
import time
from pathlib import Path

PROJECT = Path(__file__).resolve().parent.parent
BACKTEST_DIR = PROJECT / "before" / "ranking_backtest"
RAW_DIR = BACKTEST_DIR / "runtime" / "data" / "raw_data"
CAL_DIR = BACKTEST_DIR / "runtime" / "data" / "cal_data"
BACKUP = PROJECT / "data_drive" / "data_backup"

sys.path.insert(0, str(BACKTEST_DIR))
sys.path.insert(0, str(PROJECT / "scripts"))

import pandas as pd

def main():
    t0 = time.time()

    # Step 0c: 기술적 피처 재계산 (RSI_14, MACD_signal, bollinger_pctb 포함)
    print("=" * 60)
    print("[Step 0c] Technical features recalculation...")
    from src.tracks.shared.stages.data.l1_technical_features import calculate_technical_features

    ohlcv_path = RAW_DIR / "ohlcv_daily.parquet"
    df = pd.read_parquet(ohlcv_path)
    print(f"  Input: {df.shape}")

    # 새 피처가 이미 있으면 제거 (깨끗한 재계산)
    for col in ["RSI_14", "MACD_signal", "bollinger_pctb"]:
        if col in df.columns:
            df = df.drop(columns=[col])

    df = calculate_technical_features(df)

    # 새 피처 확인
    new_feats = ["RSI_14", "MACD_signal", "bollinger_pctb"]
    for f in new_feats:
        if f in df.columns:
            nna = df[f].notna().sum()
            print(f"  {f}: {nna:,} non-null ({nna/len(df)*100:.1f}%)")
        else:
            print(f"  WARNING: {f} NOT FOUND!")

    df.to_parquet(ohlcv_path, index=False)
    print(f"  Output: {df.shape}, saved to {ohlcv_path}")
    print(f"  Elapsed: {time.time()-t0:.1f}s")

    # Step 0d: 패널 재구축
    print("=" * 60)
    print("[Step 0d] Panel rebuild...")
    from src.tracks.shared.stages.data.l3_panel_merge import build_panel_merged_daily

    ohlcv = pd.read_parquet(ohlcv_path)
    fundamentals = pd.read_parquet(RAW_DIR / "fundamentals_annual.parquet")
    universe = pd.read_parquet(RAW_DIR / "universe_k200_membership_monthly.parquet")

    panel, warns = build_panel_merged_daily(
        ohlcv_daily=ohlcv,
        fundamentals_annual=fundamentals,
        universe_membership_monthly=universe,
    )
    panel.to_parquet(CAL_DIR / "panel_merged_daily.parquet", index=False)
    print(f"  Panel: {panel.shape}, max_date={panel['date'].max()}")

    # 새 피처 존재 확인
    for f in new_feats:
        if f in panel.columns:
            nna = panel[f].notna().sum()
            print(f"  {f} in panel: {nna:,} non-null")
        else:
            print(f"  WARNING: {f} NOT in panel!")
    print(f"  Elapsed: {time.time()-t0:.1f}s")

    # Step 5: 뉴스/ESG 머지 + Track A + with_reasons
    print("=" * 60)
    print("[Step 5] Panel merge + Track A ranking + with_reasons...")
    from rebuild_panel_and_reasons import merge_panel, rebuild_reasons

    panel_merged = merge_panel()

    # dataset_daily 삭제 (Track A가 최신 panel 사용)
    for ext in [".parquet", ".csv"]:
        stale = CAL_DIR / f"dataset_daily{ext}"
        if stale.exists():
            stale.unlink()
            print(f"  Removed stale dataset_daily{ext}")

    # 기존 ranking 캐시 삭제 (force rebuild)
    for name in ["ranking_short_daily", "ranking_long_daily", "ranking_integrated_daily",
                  "ranking_short_daily_stabilized", "ranking_long_daily_stabilized"]:
        for ext in [".parquet", ".csv"]:
            p = CAL_DIR / f"{name}{ext}"
            if p.exists():
                p.unlink()
                print(f"  Removed cached {name}{ext}")

    from src.pipeline.track_a_pipeline import run_track_a_pipeline
    config_path = str(BACKTEST_DIR / "configs" / "config.yaml")
    result = run_track_a_pipeline(config_path, force_rebuild=True)
    print(f"  Short ranking: {len(result['ranking_short_daily']):,} rows")
    print(f"  Long ranking: {len(result['ranking_long_daily']):,} rows")

    rebuild_reasons(panel_merged)
    print(f"  with_reasons rebuilt")
    print(f"  Elapsed: {time.time()-t0:.1f}s")

    # Step 6: MySQL 리로드
    print("=" * 60)
    print("[Step 6] MySQL reload...")
    import subprocess, os
    from dotenv import load_dotenv
    load_dotenv(PROJECT / ".env")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    for side in ["long", "short"]:
        pq_file = CAL_DIR / f"ranking_{side}_daily_with_reasons.parquet"
        if not pq_file.exists():
            print(f"  WARNING: {pq_file} not found, skipping {side}")
            continue
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
        r = subprocess.run(load_cmd, shell=True, capture_output=True, text=True, timeout=300)
        if r.returncode != 0:
            print(f"  MySQL {side} error: {r.stderr}")
        else:
            print(f"  MySQL {side}: {r.stdout.strip()}")

    total = time.time() - t0
    print("=" * 60)
    print(f"DONE. Total elapsed: {total:.1f}s ({total/60:.1f}min)")

if __name__ == "__main__":
    main()
