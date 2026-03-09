# KOSPI200 AI Ranking

KOSPI200 종목 AI 기반 매수/매도 랭킹 서비스. 42개 피처(OHLCV 파생 + 뉴스 감성 + ESG + 재무)를 활용한 앙상블 모델 예측 → 일별 랭킹 제공.

## Architecture

```
FDR(OHLCV) + DART(재무) + Naver(뉴스) + ESG키워드
    ↓
42컬럼 패널 (708K+ rows)
    ↓
앙상블: XGBoost(90%) + Ridge(5%) + RF(3%) + Grid(2%)
    ↓
z-score 정규화 → 가중합 → score_total → rank
    ↓
MySQL → FastAPI API → Toss-style Web UI
```

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | FastAPI, SQLAlchemy 2.0, PyJWT, APScheduler |
| Frontend | Jinja2, Chart.js 3.9, Vanilla JS |
| Database | MySQL 8.0 (Docker) |
| ML | XGBoost, scikit-learn, KR-FinBERT-SC |
| Data | FinanceDataReader, OpenDartReader, Naver Search API |
| Deploy | Docker, uvicorn |

## Setup

### 1. Prerequisites

- Python 3.11+
- Docker (for MySQL)

### 2. Database

```bash
docker run -d --name kospi-mysql \
  -e MYSQL_ROOT_PASSWORD=yourpassword \
  -e MYSQL_DATABASE=kospi200 \
  -p 3306:3306 \
  mysql:8.0 --local-infile=1
```

### 3. Environment

```bash
cp .env.example src/backend/.env
# Edit src/backend/.env with your credentials
```

### 4. Install

```bash
pip install -r src/backend/requirements.txt
```

### 5. Admin User

```bash
cd src/backend
python seed_admin.py admin yourpassword
```

### 6. Run Server

```bash
cd src/backend
uvicorn app.main:app --port 8000
```

Open `http://localhost:8000/rankings`

### 7. Daily Pipeline

```bash
python scripts/daily_news_pipeline.py
```

Runs automatically at 06:00 KST via APScheduler when `SCHEDULER_ENABLED=true`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | (required) |
| `DB_NAME` | Database name | `kospi200` |
| `JWT_SECRET` | JWT signing key | (required) |
| `NAVER_CLIENT_ID` | Naver Search API ID | (required for news) |
| `NAVER_CLIENT_SECRET` | Naver Search API Secret | (required for news) |
| `DART_API_KEY` | DART financial API key | (required for fundamentals) |
| `SCHEDULER_ENABLED` | Auto daily pipeline | `true` |
| `SCHEDULER_HOUR` | Pipeline run hour (KST) | `6` |
| `RATE_LIMIT` | API rate limit | `60/minute` |

## Project Structure

```
kospi200/
├── src/backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, middleware
│   │   ├── config.py            # Settings from .env
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── auth/                # JWT authentication
│   │   ├── models/              # ORM models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # API & page routers
│   │   ├── services/            # Business logic, scheduler
│   │   └── pipeline/            # Pipeline wrapper
│   ├── templates/               # Jinja2 (Toss-style UI)
│   └── static/css/              # Design system
├── scripts/                     # Data pipeline scripts
│   ├── daily_news_pipeline.py   # 10-step daily pipeline
│   ├── collect_news_naver_api.py
│   └── rebuild_panel_and_reasons.py
└── docs/                        # Design docs & reports
```

## API Endpoints

| Method | URL | Auth | Description |
|--------|-----|------|-------------|
| GET | `/api/rankings` | - | 랭킹 목록 (페이지네이션) |
| GET | `/api/rankings/{ticker}` | - | 종목별 상세 |
| GET | `/api/rankings/dates` | - | 조회 가능 날짜 |
| POST | `/api/auth/login` | - | 로그인 |
| POST | `/api/auth/refresh` | JWT | 토큰 갱신 |
| POST | `/api/admin/pipeline/run-all` | Admin | 전체 파이프라인 실행 |
| GET | `/api/admin/pipeline/status` | Admin | 실행 상태 |
| GET | `/api/admin/freshness` | Admin | 데이터 신선도 |

## Screenshots

<!-- TODO: Add screenshots -->

## License

Private - All rights reserved.
