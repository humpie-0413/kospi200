"""MySQL 초기 데이터 로드 — 모든 테이블 생성 + 데이터 적재

실행: python scripts/init_mysql.py
전제: Docker MySQL 컨테이너(kospi-mysql)가 실행 중이어야 함

테이블 목록:
  - ranking_long_daily_with_reasons / ranking_short_daily_with_reasons
  - ranking_long_daily / ranking_short_daily
  - ohlcv_daily
  - bt_equity_curve_bt120_long / bt120_ens / bt20_short / bt20_ens
  - bt_metrics_bt120_long / bt120_ens / bt20_short / bt20_ens
  - benchmark_069500_daily
  - users (테이블만 생성, 데이터 없음)
"""
import os
import sys
import subprocess
import tempfile
import logging
from pathlib import Path

import pandas as pd
import numpy as np
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("init_mysql")

PROJECT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT / "src" / "backend" / ".env")

DB_PASSWORD = os.environ.get("DB_PASSWORD", "")
DB_NAME = os.environ.get("DB_NAME", "kospi200")
CONTAINER = "kospi-mysql"

CAL_DIR = PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "cal_data"
RAW_DIR = PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "raw_data"
BACKUP_DIR = PROJECT / "data_drive" / "data_backup"
MYSQL_IMPORT = "/var/lib/mysql-files"


def mysql_exec(sql: str, capture=True) -> subprocess.CompletedProcess:
    """docker exec로 MySQL 쿼리 실행"""
    cmd = f'docker exec -i {CONTAINER} mysql -uroot -p{DB_PASSWORD} {DB_NAME} -e "{sql}"'
    return subprocess.run(cmd, shell=True, capture_output=capture, text=True, timeout=300)


def check_docker():
    """Docker MySQL 컨테이너 실행 확인"""
    r = subprocess.run(f"docker inspect -f '{{{{.State.Running}}}}' {CONTAINER}",
                       shell=True, capture_output=True, text=True)
    if r.returncode != 0 or "true" not in r.stdout.lower():
        log.error(f"Docker 컨테이너 '{CONTAINER}' 미실행. 먼저 실행:")
        log.error(f"  docker-compose up -d")
        sys.exit(1)
    log.info(f"Docker MySQL ({CONTAINER}) 실행 중")


def create_tables():
    """모든 테이블 CREATE TABLE IF NOT EXISTS"""
    log.info("테이블 생성 중...")

    # 랭킹 with_reasons 테이블 (long/short 동일 스키마)
    for side in ["long", "short"]:
        sql = f"""
CREATE TABLE IF NOT EXISTS ranking_{side}_daily_with_reasons (
    date DATE NOT NULL,
    ticker VARCHAR(6) NOT NULL,
    score_total FLOAT,
    rank_total FLOAT,
    top_feature_1 VARCHAR(50),
    contrib_1 FLOAT,
    top_feature_2 VARCHAR(50),
    contrib_2 FLOAT,
    top_feature_3 VARCHAR(50),
    contrib_3 FLOAT,
    percentile_1 FLOAT,
    percentile_2 FLOAT,
    percentile_3 FLOAT,
    cat_momentum FLOAT,
    cat_risk FLOAT,
    cat_profitability FLOAT,
    cat_value FLOAT,
    cat_liquidity FLOAT,
    cat_sentiment FLOAT,
    cat_esg FLOAT,
    in_universe TINYINT(1),
    PRIMARY KEY (date, ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
        mysql_exec(sql.replace("\n", " "))

    # 랭킹 일반 테이블
    mysql_exec("""
CREATE TABLE IF NOT EXISTS ranking_long_daily (
    date DATE NOT NULL, ticker VARCHAR(6) NOT NULL,
    score_total FLOAT, rank_total FLOAT,
    score_total_long FLOAT, rank_total_long FLOAT,
    score_used FLOAT, rank_used FLOAT,
    selected_top TINYINT(1), rebalance_day TINYINT(1),
    version_tag VARCHAR(50), in_universe TINYINT(1),
    PRIMARY KEY (date, ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    mysql_exec("""
CREATE TABLE IF NOT EXISTS ranking_short_daily (
    date DATE NOT NULL, ticker VARCHAR(6) NOT NULL,
    score_total FLOAT, rank_total FLOAT,
    score_total_short FLOAT, rank_total_short FLOAT,
    in_universe TINYINT(1),
    PRIMARY KEY (date, ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    # OHLCV
    mysql_exec("""
CREATE TABLE IF NOT EXISTS ohlcv_daily (
    date DATE NOT NULL, ticker VARCHAR(6) NOT NULL,
    open INT, high INT, low INT, close INT, volume BIGINT,
    PRIMARY KEY (date, ticker)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    # 벤치마크
    mysql_exec("""
CREATE TABLE IF NOT EXISTS benchmark_069500_daily (
    date DATE NOT NULL PRIMARY KEY,
    close INT, ret_1d FLOAT, equity FLOAT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    # 백테스트 에쿼티 커브 (4개 전략)
    for strategy in ["bt120_long", "bt120_ens", "bt20_short", "bt20_ens"]:
        mysql_exec(f"""
CREATE TABLE IF NOT EXISTS bt_equity_curve_{strategy} (
    date DATE NOT NULL, phase VARCHAR(20) NOT NULL,
    equity FLOAT, drawdown FLOAT,
    PRIMARY KEY (date, phase)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    # 백테스트 메트릭스 (4개 전략)
    for strategy in ["bt120_long", "bt120_ens", "bt20_short", "bt20_ens"]:
        mysql_exec(f"""
CREATE TABLE IF NOT EXISTS bt_metrics_{strategy} (
    phase VARCHAR(20) NOT NULL PRIMARY KEY,
    top_k INT, holding_days INT, cost_bps FLOAT,
    gross_total_return FLOAT, net_total_return FLOAT,
    gross_cagr FLOAT, net_cagr FLOAT,
    gross_sharpe FLOAT, net_sharpe FLOAT,
    gross_mdd FLOAT, net_mdd FLOAT,
    gross_hit_ratio FLOAT, net_hit_ratio FLOAT,
    avg_turnover_oneway FLOAT, ic FLOAT, rank_ic FLOAT,
    gross_calmar_ratio FLOAT, net_calmar_ratio FLOAT,
    date_start VARCHAR(50), date_end VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    # 사용자
    mysql_exec("""
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_admin TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".replace("\n", " "))

    log.info("테이블 생성 완료 (15개)")


def load_csv_to_mysql(csv_path: Path, table_name: str, columns: list[str] | None = None):
    """CSV → docker cp → LOAD DATA INFILE"""
    dest = f"{MYSQL_IMPORT}/{csv_path.name}"
    cp_cmd = f'docker cp "{csv_path}" {CONTAINER}:{dest}'
    r = subprocess.run(cp_cmd, shell=True, capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        log.error(f"docker cp 실패: {r.stderr}")
        return False

    cols_str = f"({','.join(columns)})" if columns else ""
    sql = (
        f"TRUNCATE TABLE {table_name}; "
        f"LOAD DATA INFILE '{dest}' "
        f"INTO TABLE {table_name} "
        f"FIELDS TERMINATED BY ',' OPTIONALLY ENCLOSED BY '\\\"' "
        f"LINES TERMINATED BY '\\r\\n' "
        f"IGNORE 1 LINES {cols_str}; "
        f"SELECT COUNT(*) AS loaded FROM {table_name};"
    )
    r = mysql_exec(sql)
    if r.returncode != 0:
        log.error(f"LOAD DATA 실패 ({table_name}): {r.stderr}")
        return False

    log.info(f"  {table_name}: {r.stdout.strip()}")
    return True


def parquet_to_csv(parquet_path: Path, output_csv: Path, columns: list[str] | None = None,
                   fix_nan=True, int_cols=None):
    """parquet → CSV 변환 (NaN→0 + CRLF)"""
    df = pd.read_parquet(parquet_path)
    if columns:
        missing = [c for c in columns if c not in df.columns]
        if missing:
            for c in missing:
                df[c] = 0.0 if c not in (int_cols or []) else 0
        df = df[columns]

    if fix_nan:
        float_cols = df.select_dtypes(include=["float64", "float32"]).columns
        df[float_cols] = df[float_cols].fillna(0.0)
        str_cols = df.select_dtypes(include=["object"]).columns
        df[str_cols] = df[str_cols].fillna("")

    if int_cols:
        for c in int_cols:
            if c in df.columns:
                df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)

    # bool → int
    bool_cols = df.select_dtypes(include=["bool"]).columns
    for c in bool_cols:
        df[c] = df[c].astype(int)

    df.to_csv(output_csv, index=False, lineterminator="\r\n")
    return df.columns.tolist(), len(df)


def load_ranking_tables():
    """ranking_long/short_daily_with_reasons 로드"""
    log.info("랭킹 테이블 로드 중...")
    tmp_dir = Path(tempfile.mkdtemp())

    for side in ["long", "short"]:
        pq = CAL_DIR / f"ranking_{side}_daily_with_reasons.parquet"
        if not pq.exists():
            log.warning(f"  {pq.name} 없음 — 건너뜀")
            continue

        csv_path = tmp_dir / f"ranking_{side}.csv"
        cols, rows = parquet_to_csv(pq, csv_path)
        log.info(f"  CSV 변환: {side} {rows:,}행")
        load_csv_to_mysql(csv_path, f"ranking_{side}_daily_with_reasons", cols)

    # ranking_long_daily / ranking_short_daily
    for side in ["long", "short"]:
        pq = CAL_DIR / f"ranking_{side}_daily.parquet"
        if not pq.exists():
            log.warning(f"  {pq.name} 없음 — 건너뜀")
            continue

        csv_path = tmp_dir / f"ranking_{side}_plain.csv"
        cols, rows = parquet_to_csv(pq, csv_path)
        log.info(f"  CSV 변환: {side}_plain {rows:,}행")
        load_csv_to_mysql(csv_path, f"ranking_{side}_daily", cols)


def load_ohlcv():
    """ohlcv_daily 로드"""
    log.info("OHLCV 테이블 로드 중...")
    pq = RAW_DIR / "ohlcv_daily.parquet"
    if not pq.exists():
        log.warning("ohlcv_daily.parquet 없음 — 건너뜀")
        return

    tmp_dir = Path(tempfile.mkdtemp())
    csv_path = tmp_dir / "ohlcv_daily.csv"

    target_cols = ["date", "ticker", "open", "high", "low", "close", "volume"]
    cols, rows = parquet_to_csv(pq, csv_path, columns=target_cols,
                                int_cols=["open", "high", "low", "close", "volume"])
    log.info(f"  CSV 변환: {rows:,}행")
    load_csv_to_mysql(csv_path, "ohlcv_daily", target_cols)


def load_benchmark():
    """benchmark_069500_daily 로드"""
    log.info("벤치마크 테이블 로드 중...")
    pq = CAL_DIR / "benchmark_069500_daily.parquet"
    if not pq.exists():
        log.warning("benchmark_069500_daily.parquet 없음 — 건너뜀")
        return

    tmp_dir = Path(tempfile.mkdtemp())
    csv_path = tmp_dir / "benchmark.csv"
    target_cols = ["date", "close", "ret_1d", "equity"]
    cols, rows = parquet_to_csv(pq, csv_path, columns=target_cols, int_cols=["close"])
    log.info(f"  CSV 변환: {rows:,}행")
    load_csv_to_mysql(csv_path, "benchmark_069500_daily", target_cols)


def load_backtest_equity():
    """bt_equity_curve 4개 전략 로드 (CSV 원본)"""
    log.info("백테스트 에쿼티 커브 로드 중...")
    strategies = ["bt120_long", "bt120_ens", "bt20_short", "bt20_ens"]
    for strat in strategies:
        csv_file = CAL_DIR / f"bt_equity_curve_{strat}.csv"
        if not csv_file.exists():
            log.warning(f"  {csv_file.name} 없음 — 건너뜀")
            continue

        # CSV를 읽어서 NaN 처리 후 재저장 (CRLF)
        df = pd.read_csv(csv_file)
        df = df.fillna(0.0)
        tmp_dir = Path(tempfile.mkdtemp())
        clean_csv = tmp_dir / csv_file.name
        df.to_csv(clean_csv, index=False, lineterminator="\r\n")

        table = f"bt_equity_curve_{strat}"
        cols = df.columns.tolist()
        load_csv_to_mysql(clean_csv, table, cols)


def load_backtest_metrics():
    """bt_metrics 4개 전략 로드 (CSV 원본)"""
    log.info("백테스트 메트릭스 로드 중...")
    strategies = ["bt120_long", "bt120_ens", "bt20_short", "bt20_ens"]
    for strat in strategies:
        csv_file = CAL_DIR / f"bt_metrics_{strat}.csv"
        if not csv_file.exists():
            log.warning(f"  {csv_file.name} 없음 — 건너뜀")
            continue

        df = pd.read_csv(csv_file)
        df = df.fillna(0.0)
        tmp_dir = Path(tempfile.mkdtemp())
        clean_csv = tmp_dir / csv_file.name
        df.to_csv(clean_csv, index=False, lineterminator="\r\n")

        table = f"bt_metrics_{strat}"
        cols = df.columns.tolist()
        load_csv_to_mysql(clean_csv, table, cols)


def replicate_today():
    """최신 랭킹 날짜를 오늘로 복제 (당일 표시용)"""
    from datetime import datetime
    today = datetime.now().date().isoformat()
    log.info(f"오늘 날짜({today})로 랭킹 복제 중...")

    for side in ["long", "short"]:
        table = f"ranking_{side}_daily_with_reasons"
        sql = (
            f"CREATE TEMPORARY TABLE _tmp AS "
            f"SELECT * FROM {table} WHERE date = (SELECT MAX(date) FROM {table}); "
            f"UPDATE _tmp SET date = '{today}'; "
            f"INSERT IGNORE INTO {table} SELECT * FROM _tmp; "
            f"DROP TEMPORARY TABLE _tmp; "
            f"SELECT MAX(date) AS latest FROM {table};"
        )
        r = mysql_exec(sql)
        if r.returncode == 0:
            log.info(f"  {side}: {r.stdout.strip()}")
        else:
            log.warning(f"  {side} 복제 실패: {r.stderr.strip()}")


def verify_all():
    """전체 테이블 행수 확인"""
    log.info("=" * 50)
    log.info("테이블 검증")
    log.info("=" * 50)

    tables = [
        "ranking_long_daily_with_reasons",
        "ranking_short_daily_with_reasons",
        "ranking_long_daily",
        "ranking_short_daily",
        "ohlcv_daily",
        "benchmark_069500_daily",
        "bt_equity_curve_bt120_long",
        "bt_equity_curve_bt120_ens",
        "bt_equity_curve_bt20_short",
        "bt_equity_curve_bt20_ens",
        "bt_metrics_bt120_long",
        "bt_metrics_bt120_ens",
        "bt_metrics_bt20_short",
        "bt_metrics_bt20_ens",
        "users",
    ]

    for t in tables:
        r = mysql_exec(f"SELECT COUNT(*) AS cnt FROM {t};")
        if r.returncode == 0:
            cnt = r.stdout.strip().split("\n")[-1].strip()
            log.info(f"  {t}: {cnt}행")
        else:
            log.warning(f"  {t}: 조회 실패")


def main():
    log.info("=" * 50)
    log.info("MySQL 초기 데이터 로드")
    log.info("=" * 50)

    check_docker()
    create_tables()
    load_ranking_tables()
    load_ohlcv()
    load_benchmark()
    load_backtest_equity()
    load_backtest_metrics()
    replicate_today()
    verify_all()

    log.info("=" * 50)
    log.info("MySQL 초기화 완료!")
    log.info("서버 실행: cd src/backend && uvicorn app.main:app --port 8000")
    log.info("=" * 50)


if __name__ == "__main__":
    main()
