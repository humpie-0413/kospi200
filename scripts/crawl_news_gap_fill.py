"""
갭 채우기 크롤러: 2025-01-01 ~ 현재
기존 final_sequential_crawler_monthly.py 로직 그대로, 경로/날짜만 변경

실행: python scripts/crawl_news_gap_fill.py
중단: Ctrl+C → 재시작 시 자동 이어서 진행
"""

import sys
import os
from pathlib import Path
from datetime import datetime

# Windows cp949 인코딩 에러 방지
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# 기존 크롤러 임포트
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / 'before' / 'archive' / 'new'))
from final_sequential_crawler_monthly import FinalSequentialCrawler

# 경로
UNIVERSE_PATH = PROJECT_ROOT / 'before' / 'ranking_backtest' / 'runtime' / 'data' / 'cal_data' / 'universe_k200_membership_monthly.parquet'
OUTPUT_DIR = PROJECT_ROOT / 'data_drive' / 'data_backup' / 'news_crawl'

# 갭 기간
GAP_START = datetime(2025, 1, 1)
GAP_END = datetime.now()


if __name__ == '__main__':
    import final_sequential_crawler_monthly as crawl_mod
    # 전체 기간을 갭 기간으로 오버라이드
    crawl_mod.FULL_PERIOD_START = GAP_START
    crawl_mod.FULL_PERIOD_END = GAP_END

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print(f"Gap fill: {GAP_START.date()} ~ {GAP_END.date()}")
    print(f"Universe: {UNIVERSE_PATH}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)

    crawler = FinalSequentialCrawler(
        universe_path=str(UNIVERSE_PATH),
        delay=0.5,
        output_dir=str(OUTPUT_DIR)
    )

    crawler.run_all()
