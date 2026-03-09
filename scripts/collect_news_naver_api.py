"""
네이버 검색 오픈 API — 일별 뉴스 수집 (매일 06:00 실행용)

전일 뉴스만 수집. 200종목 × 1 call = 200 calls/day (한도 25,000의 0.8%)
갭 채우기는 crawl_news_gap_fill.py 사용.

실행: python scripts/collect_news_naver_api.py
테스트: python scripts/collect_news_naver_api.py --test 005930
"""

import os
import requests
import re
import json
import time
import logging
import argparse
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
from email.utils import parsedate_to_datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler()]
)
log = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / 'src' / 'backend' / '.env')

DATA_DIR = PROJECT_ROOT / 'data_drive' / 'data_backup' / 'news_api'
UNIVERSE_PATH = PROJECT_ROOT / 'before' / 'ranking_backtest' / 'runtime' / 'data' / 'cal_data' / 'universe_k200_membership_monthly.parquet'
MAPPING_PATH = PROJECT_ROOT / 'before' / 'ui' / 'dashboard' / 'sample' / 'ticker_name_mapping.json'

API_URL = 'https://openapi.naver.com/v1/search/news.json'
HEADERS = {
    'X-Naver-Client-Id': os.environ['NAVER_CLIENT_ID'],
    'X-Naver-Client-Secret': os.environ['NAVER_CLIENT_SECRET']
}
DISPLAY = 100
SLEEP = 0.1
KST = ZoneInfo('Asia/Seoul')


def clean_html(text: str) -> str:
    return re.sub(r'<[^>]+>', '', text).strip() if text else ''


def parse_pubdate(s: str) -> datetime:
    dt = parsedate_to_datetime(s)
    return dt.astimezone(KST).replace(tzinfo=None)


def search_news(query: str, display: int = DISPLAY, start: int = 1) -> dict:
    params = {'query': query, 'display': display, 'start': start, 'sort': 'date'}
    resp = requests.get(API_URL, headers=HEADERS, params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def save_ticker_parquet(ticker: str, articles: list):
    """종목별 parquet append"""
    out_path = DATA_DIR / f'news_{ticker}.parquet'
    df_new = pd.DataFrame(articles)
    if out_path.exists():
        df_old = pd.read_parquet(out_path)
        df = pd.concat([df_old, df_new], ignore_index=True)
        df = df.drop_duplicates(subset=['link'], keep='last')
    else:
        df = df_new
    df = df.sort_values('date').reset_index(drop=True)
    df.to_parquet(out_path, index=False)
    return len(df)


def load_universe() -> list:
    u = pd.read_parquet(UNIVERSE_PATH)
    return sorted(u[u['ym'] == u['ym'].max()]['ticker'].tolist())


def load_mapping() -> dict:
    with open(MAPPING_PATH, encoding='utf-8') as f:
        return json.load(f)


def run_daily(target_date=None):
    """전일(또는 지정일) 뉴스 수집"""
    if target_date is None:
        target_date = (datetime.now() - timedelta(days=1)).date()

    tickers = load_universe()
    mapping = load_mapping()
    total = 0

    log.info(f'Daily collect: {target_date}, {len(tickers)} tickers')

    for i, ticker in enumerate(tickers):
        name = mapping.get(ticker)
        if not name:
            continue

        try:
            data = search_news(query=name)
        except Exception as e:
            log.warning(f'{ticker} API error: {e}')
            continue

        articles = []
        seen = set()
        for item in data.get('items', []):
            try:
                pub_dt = parse_pubdate(item['pubDate'])
            except Exception:
                continue
            if pub_dt.date() != target_date:
                continue
            link = item.get('originallink') or item.get('link', '')
            if link in seen:
                continue
            seen.add(link)
            articles.append({
                'ticker': ticker,
                'date': datetime.combine(target_date, datetime.min.time()),
                'title': clean_html(item.get('title', '')),
                'description': clean_html(item.get('description', '')),
                'link': link,
                'pub_datetime': pub_dt,
            })

        if articles:
            save_ticker_parquet(ticker, articles)
            total += len(articles)

        if (i + 1) % 50 == 0:
            log.info(f'  [{i+1}/{len(tickers)}] {total} articles so far')

        time.sleep(SLEEP)

    log.info(f'Done: {total} articles collected for {target_date}')
    return total


def run_test(ticker: str = '005930'):
    """단일 종목 테스트 (오늘 뉴스)"""
    mapping = load_mapping()
    name = mapping.get(ticker)
    if not name:
        log.error(f'{ticker} not in mapping')
        return

    data = search_news(query=name)
    items = data.get('items', [])
    log.info(f'{ticker}({name}): {len(items)} items from API')

    for item in items[:3]:
        pub = parse_pubdate(item['pubDate'])
        log.info(f'  {pub.date()} | {clean_html(item["title"])[:60]}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='네이버 API 일별 뉴스 수집')
    parser.add_argument('--test', metavar='TICKER', help='단일 종목 테스트')
    parser.add_argument('--date', help='수집 날짜 (YYYY-MM-DD, 기본: 어제)')
    args = parser.parse_args()

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if args.test:
        run_test(args.test)
    else:
        target = datetime.strptime(args.date, '%Y-%m-%d').date() if args.date else None
        run_daily(target)
