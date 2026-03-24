"""Google Drive에서 데이터 다운로드 → 프로젝트 경로에 배치

실행: python scripts/setup_data.py
옵션: --verify-only (파일 확인만)

2개 zip을 순서대로 다운로드 + 프로젝트 루트에 압축 해제
"""
import os
import sys
import zipfile
import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("setup_data")

PROJECT = Path(__file__).resolve().parent.parent

# Google Drive 파일 목록 (순서대로 다운로드)
GDRIVE_FILES = [
    {"id": "1uWySVDpfrobOoOTEIcHW_ZUiNgo69QTl", "name": "kospi200_data_1.zip"},
    {"id": "1hvIjvxHOu7Xt473V5C-14CHMS_HnMYs6", "name": "kospi200_data_2.zip"},
]


def download_from_gdrive(file_id: str, dest: Path) -> bool:
    """Google Drive에서 대용량 파일 다운로드 (gdown 또는 requests)"""
    # 1차: gdown 시도
    try:
        import gdown
        url = f"https://drive.google.com/uc?id={file_id}"
        log.info(f"gdown으로 다운로드 중... (ID: {file_id})")
        gdown.download(url, str(dest), quiet=False)
        if dest.exists() and dest.stat().st_size > 1000:
            return True
        log.warning("gdown 다운로드 실패, requests로 재시도...")
    except ImportError:
        log.info("gdown 미설치, requests로 다운로드...")

    # 2차: requests 직접 다운로드
    try:
        import requests
    except ImportError:
        log.error("requests 패키지 필요: pip install requests")
        return False

    session = requests.Session()
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    response = session.get(url, stream=True)

    # 대용량 파일 확인 토큰
    for key, value in response.cookies.items():
        if key.startswith("download_warning"):
            url = f"https://drive.google.com/uc?export=download&confirm={value}&id={file_id}"
            response = session.get(url, stream=True)
            break

    if response.status_code != 200:
        log.error(f"다운로드 실패: HTTP {response.status_code}")
        return False

    total = int(response.headers.get("content-length", 0))
    downloaded = 0
    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192 * 16):
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = downloaded * 100 / total
                print(f"\r  다운로드: {downloaded / 1024 / 1024:.1f}MB / {total / 1024 / 1024:.1f}MB ({pct:.0f}%)", end="")
    print()
    return dest.exists() and dest.stat().st_size > 1000


def extract_archive(archive_path: Path, dest: Path):
    """zip 또는 tar.gz 압축 해제 (프로젝트 루트로)"""
    log.info(f"압축 해제 중: {archive_path} → {dest}")
    name = archive_path.name.lower()

    if name.endswith(".zip"):
        with zipfile.ZipFile(archive_path, "r") as zf:
            log.info(f"  파일 수: {len(zf.namelist())}")
            zf.extractall(dest)
    elif name.endswith(".tar.gz") or name.endswith(".tgz"):
        import tarfile
        with tarfile.open(archive_path, "r:gz") as tf:
            log.info(f"  파일 수: {len(tf.getnames())}")
            tf.extractall(dest)
    elif name.endswith(".tar"):
        import tarfile
        with tarfile.open(archive_path, "r:") as tf:
            log.info(f"  파일 수: {len(tf.getnames())}")
            tf.extractall(dest)
    else:
        log.error(f"지원하지 않는 형식: {name} (zip/tar.gz/tgz 지원)")
        sys.exit(1)

    log.info("압축 해제 완료")


def verify_data():
    """필수 데이터 파일 존재 확인"""
    cal_dir = PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "cal_data"
    raw_dir = PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "raw_data"
    backup_dir = PROJECT / "data_drive" / "data_backup"

    checks = {
        "ranking_long_daily_with_reasons": cal_dir / "ranking_long_daily_with_reasons.parquet",
        "ranking_short_daily_with_reasons": cal_dir / "ranking_short_daily_with_reasons.parquet",
        "ranking_long_daily": cal_dir / "ranking_long_daily.parquet",
        "ranking_short_daily": cal_dir / "ranking_short_daily.parquet",
        "panel_merged_daily": cal_dir / "panel_merged_daily.parquet",
        "benchmark": cal_dir / "benchmark_069500_daily.parquet",
        "bt_equity_bt120_long": cal_dir / "bt_equity_curve_bt120_long.csv",
        "bt_equity_bt20_short": cal_dir / "bt_equity_curve_bt20_short.csv",
        "bt_metrics_bt120_long": cal_dir / "bt_metrics_bt120_long.csv",
        "bt_metrics_bt20_short": cal_dir / "bt_metrics_bt20_short.csv",
        "ohlcv_daily": raw_dir / "ohlcv_daily.parquet",
        "fundamentals": raw_dir / "fundamentals_annual.parquet",
        "universe": raw_dir / "universe_k200_membership_monthly.parquet",
        "news_sentiment": backup_dir / "news_sentiment_daily.parquet",
        "esg_daily": backup_dir / "esg_daily.parquet",
        "external_indices": backup_dir / "external_indices_daily.parquet",
    }

    ok, fail = 0, 0
    for name, path in checks.items():
        if path.exists():
            size_mb = path.stat().st_size / 1024 / 1024
            log.info(f"  OK  {name}: {size_mb:.1f}MB")
            ok += 1
        else:
            log.warning(f"  MISS {name}: {path}")
            fail += 1

    log.info(f"검증 결과: {ok} OK / {fail} MISSING")
    return fail == 0


def main():
    parser = argparse.ArgumentParser(description="Google Drive 데이터 다운로드 + 배치")
    parser.add_argument("--verify-only", action="store_true", help="파일 존재 확인만")
    args = parser.parse_args()

    if args.verify_only:
        ok = verify_data()
        sys.exit(0 if ok else 1)

    # 필수 디렉토리 생성
    (PROJECT / "data_drive" / "data_backup" / "news_api").mkdir(parents=True, exist_ok=True)
    (PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "raw_data").mkdir(parents=True, exist_ok=True)
    (PROJECT / "before" / "ranking_backtest" / "runtime" / "data" / "cal_data").mkdir(parents=True, exist_ok=True)

    # 2개 zip 순서대로 다운로드 + 압축 해제
    for i, entry in enumerate(GDRIVE_FILES, 1):
        file_id = entry["id"]
        file_name = entry["name"]
        dest = PROJECT / file_name

        log.info(f"[{i}/{len(GDRIVE_FILES)}] {file_name}")

        # 이미 다운로드된 파일 있으면 재사용
        if dest.exists() and dest.stat().st_size > 1000:
            log.info(f"  기존 파일 사용: {dest.stat().st_size / 1024 / 1024:.0f}MB")
        else:
            ok = download_from_gdrive(file_id, dest)
            if not ok:
                log.error(f"  다운로드 실패: {file_name}")
                sys.exit(1)

        extract_archive(dest, PROJECT)

    # 검증
    log.info("=" * 50)
    log.info("데이터 검증")
    log.info("=" * 50)
    ok = verify_data()

    if ok:
        log.info("=" * 50)
        log.info("데이터 설치 완료!")
        log.info("다음 단계: python scripts/init_mysql.py")
        log.info("=" * 50)
    else:
        log.warning("일부 파일 누락 — zip 내용 확인 필요")


if __name__ == "__main__":
    main()
