"""일일 데이터 갱신 스크립트

실행: python scripts/daily_update.py [--date YYYY-MM-DD]

단계:
  1. Docker MySQL 확인
  2. OHLCV 수집 (FinanceDataReader)
  3. 기술적 피처 재계산
  4. 패널 재구축
  5. 외부 지수 수집
  6. 뉴스 수집 + 감성분석
  7. 패널 머지 + 랭킹 재생성
  8. MySQL 리로드

전체 파이프라인(before/ 코드 필요): ~25분
OHLCV만 갱신(before/ 없이): ~3분
"""
import os
import sys
import time
import subprocess
import argparse
import logging
from pathlib import Path
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("daily_update")

PROJECT = Path(__file__).resolve().parent.parent

# .env 로드
try:
    from dotenv import load_dotenv
    load_dotenv(PROJECT / "src" / "backend" / ".env")
except ImportError:
    pass

CONTAINER = "kospi-mysql"
DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "kospi200")
BACKTEST_DIR = PROJECT / "before" / "ranking_backtest"
HAS_ML_CODE = (BACKTEST_DIR / "src").exists()


def check_prerequisites():
    """사전 조건 확인"""
    # Docker MySQL
    r = subprocess.run(f"docker inspect -f '{{{{.State.Running}}}}' {CONTAINER}",
                       shell=True, capture_output=True, text=True)
    if r.returncode != 0 or "true" not in r.stdout.lower():
        log.error(f"Docker MySQL ({CONTAINER}) 미실행")
        log.error("  docker-compose up -d")
        return False

    # DB 비밀번호
    if not DB_PASSWORD:
        log.error("DB_PASSWORD 미설정 — src/backend/.env 확인")
        return False

    log.info(f"Docker MySQL: OK")
    log.info(f"ML 코드(before/): {'있음 → 전체 파이프라인' if HAS_ML_CODE else '없음 → OHLCV만 갱신'}")
    return True


def run_full_pipeline(target_date):
    """전체 11단계 파이프라인 실행 (before/ 코드 필요)"""
    # daily_news_pipeline.py 임포트
    scripts_dir = str(PROJECT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)

    from daily_news_pipeline import run_pipeline
    log.info("전체 파이프라인 실행 중...")
    run_pipeline(target_date)


def run_ohlcv_only(target_date):
    """OHLCV만 갱신 + MySQL 리로드 (before/ 없이도 동작)"""
    import pandas as pd
    import numpy as np

    log.info(f"OHLCV만 갱신 모드: {target_date}")

    # 1. FinanceDataReader로 OHLCV 수집
    try:
        import FinanceDataReader as fdr
    except ImportError:
        log.error("FinanceDataReader 미설치: pip install finance-datareader")
        return

    raw_dir = BACKTEST_DIR / "runtime" / "data" / "raw_data"
    ohlcv_path = raw_dir / "ohlcv_daily.parquet"
    if not ohlcv_path.exists():
        log.error(f"ohlcv_daily.parquet 없음: {ohlcv_path}")
        log.error("먼저 python scripts/setup_data.py 실행")
        return

    df = pd.read_parquet(ohlcv_path)
    df["date"] = pd.to_datetime(df["date"])
    target_ts = pd.Timestamp(target_date)

    if target_ts in df["date"].values:
        log.info(f"OHLCV에 이미 {target_date} 데이터 있음")
    else:
        tickers = sorted(df["ticker"].unique().tolist())
        log.info(f"OHLCV 수집: {target_date}, {len(tickers)}종목")

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
                log.info(f"  진행: {i+1}/{len(tickers)}")

        if not new_rows:
            log.info(f"{target_date}에 OHLCV 없음 (휴장일?)")
            return

        log.info(f"  수집 완료: {len(new_rows)}종목")

    # 2. ohlcv_daily MySQL 리로드
    log.info("ohlcv_daily MySQL 리로드...")
    df_reload = pd.read_parquet(ohlcv_path)
    target_cols = ["date", "ticker", "open", "high", "low", "close", "volume"]
    for c in target_cols:
        if c not in df_reload.columns:
            df_reload[c] = 0
    df_out = df_reload[target_cols].copy()
    for c in ["open", "high", "low", "close", "volume"]:
        df_out[c] = pd.to_numeric(df_out[c], errors="coerce").fillna(0).astype(int)

    import tempfile
    tmp = Path(tempfile.mkdtemp())
    csv_path = tmp / "ohlcv_daily.csv"
    df_out.to_csv(csv_path, index=False, lineterminator="\r\n")

    dest = f"/var/lib/mysql-files/ohlcv_daily.csv"
    subprocess.run(f'docker cp "{csv_path}" {CONTAINER}:{dest}', shell=True, check=True, timeout=120)

    cols = ",".join(target_cols)
    sql = (
        f"TRUNCATE TABLE ohlcv_daily; "
        f"LOAD DATA INFILE '{dest}' INTO TABLE ohlcv_daily "
        f"FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\\\"' "
        f"LINES TERMINATED BY '\\r\\n' IGNORE 1 LINES ({cols}); "
        f"SELECT COUNT(*) AS loaded FROM ohlcv_daily;"
    )
    cmd = f'docker exec -i {CONTAINER} mysql -uroot -p{DB_PASSWORD} {DB_NAME} -e "{sql}"'
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=300)
    if r.returncode == 0:
        log.info(f"  ohlcv_daily: {r.stdout.strip()}")
    else:
        log.error(f"  MySQL 에러: {r.stderr}")


def main():
    parser = argparse.ArgumentParser(description="일일 데이터 갱신")
    parser.add_argument("--date", help="대상 날짜 (YYYY-MM-DD), 기본: 어제")
    parser.add_argument("--ohlcv-only", action="store_true", help="OHLCV만 갱신 (ML 파이프라인 생략)")
    args = parser.parse_args()

    target = datetime.strptime(args.date, "%Y-%m-%d").date() if args.date else (datetime.now() - timedelta(days=1)).date()

    log.info("=" * 50)
    log.info(f"일일 갱신: {target}")
    log.info("=" * 50)

    if not check_prerequisites():
        sys.exit(1)

    t_start = time.time()

    if args.ohlcv_only or not HAS_ML_CODE:
        run_ohlcv_only(target)
    else:
        run_full_pipeline(target)

    elapsed = time.time() - t_start
    log.info("=" * 50)
    log.info(f"완료: {elapsed:.0f}초 ({elapsed/60:.1f}분)")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
