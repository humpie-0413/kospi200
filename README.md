# KOSPI200 AI 랭킹 서비스

> AI가 매일 분석하는 KOSPI200 종목 순위 — 주식 초보자를 위한 투자 도우미

## 스크린샷

<!-- 추후 추가: 랭킹 페이지, 종목 상세, 백테스트 스크린샷 -->

## 프로젝트 소개

KOSPI200에 속한 200개 종목을 7가지 관점(기술적 분석, 뉴스 감성, ESG, 재무 건전성, 외부 지수, 밸류에이션, 시장 모멘텀)으로 매일 평가하여 AI 랭킹을 제공합니다.

- **타겟 유저**: 주식 초보자
- **핵심 기능**: AI 종목 랭킹, 종목 상세 분석(레이더 차트 + AI 리포트), 과거 성과 시뮬레이션

## 아키텍처

```
데이터 수집 (pykrx/FDR + DART + 네이버 뉴스 + FMP)
    ↓
52컬럼 패널 (708K+ rows)
    ↓
ML 분석 (z-score × feature weights → 랭킹)
    ↓
MySQL → FastAPI (18 API) → React SPA (6페이지)
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | React 19, TypeScript, Vite, Tailwind CSS 4, shadcn/ui, Recharts |
| 백엔드 | FastAPI, SQLAlchemy 2.0, APScheduler, PyJWT |
| 데이터 | pandas, pykrx, FinanceDataReader |
| ML | XGBoost, Ridge, RandomForest, scikit-learn |
| NLP | KR-FinBERT-SC (한국어 금융 감성분석) |
| DB | MySQL 8 (Docker) |
| 외부 API | 네이버 검색, DART, FMP, Gemini/Groq |

## 설치 방법 (GitHub + Google Drive)

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- Docker (MySQL용)
- Git

### 1. 클론 + 의존성

```bash
git clone https://github.com/humpie-0413/kospi200.git
cd kospi200
pip install -r requirements.txt
```

### 2. 환경변수

```bash
cp .env.example src/backend/.env
# src/backend/.env 열어서 DB_PASSWORD, API 키 등 실제 값 입력
```

### 3. Docker MySQL 시작

```bash
docker-compose up -d
# 또는 직접:
# docker run -d --name kospi-mysql \
#   -e MYSQL_ROOT_PASSWORD=<비밀번호> \
#   -e MYSQL_DATABASE=kospi200 \
#   -p 3306:3306 mysql:8.0 --local-infile=1
```

### 4. 데이터 다운로드 (Google Drive)

```bash
python scripts/setup_data.py
# Google Drive에서 2개 zip 자동 다운로드 + 압축 해제

# 파일 확인만:
python scripts/setup_data.py --verify-only
```

### 5. MySQL 데이터 로드

```bash
python scripts/init_mysql.py
# 15개 테이블 생성 + 데이터 적재 + 행수 검증
```

### 6. 프론트엔드 빌드

```bash
cd src/frontend
npm install
npm run build    # dist/ → FastAPI가 서빙
```

### 7. 서버 실행

```bash
cd src/backend
uvicorn app.main:app --port 8000
# 브라우저: http://localhost:8000
```

### 8. 관리자 계정 (선택)

```bash
cd src/backend
python seed_admin.py admin <비밀번호>
```

### 9. 일일 갱신 (선택)

```bash
python scripts/daily_update.py              # 전체 파이프라인
python scripts/daily_update.py --ohlcv-only  # OHLCV만 갱신
python scripts/daily_update.py --date 2026-03-20  # 특정 날짜
```

매일 06:00 KST 자동 실행 (`SCHEDULER_ENABLED=true`).

## 프로젝트 구조

```
kospi200/
├── src/
│   ├── backend/
│   │   ├── app/
│   │   │   ├── main.py           # FastAPI 앱 + SPA 서빙
│   │   │   ├── config.py         # 환경변수 설정
│   │   │   ├── database.py       # SQLAlchemy 엔진
│   │   │   ├── auth/             # JWT 인증
│   │   │   ├── models/           # ORM 모델
│   │   │   ├── routers/          # API 라우터
│   │   │   ├── services/         # 비즈니스 로직
│   │   │   └── pipeline/         # 파이프라인 래퍼
│   │   ├── requirements.txt
│   │   └── seed_admin.py
│   └── frontend/
│       ├── src/
│       │   ├── App.tsx           # 라우터 (6페이지)
│       │   ├── pages/            # 페이지 컴포넌트
│       │   ├── components/       # UI 컴포넌트
│       │   ├── hooks/            # 커스텀 훅
│       │   ├── lib/api.ts        # API 클라이언트
│       │   └── types/            # TypeScript 타입
│       └── package.json
├── scripts/
│   ├── daily_news_pipeline.py    # 11단계 일일 파이프라인
│   └── rebuild_panel_and_reasons.py
├── configs/                      # ESG 키워드 등
├── docs/                         # 설계 문서
├── .env.example
├── CLAUDE.md                     # AI 컨텍스트
└── HANDOFF.md                    # 핸드오프 가이드
```

## 주요 기능

1. **AI 종목 랭킹**: 200개 종목을 7가지 관점으로 평가, 장기/단기 전략 선택
2. **종목 상세 분석**: 레이더 차트 + AI 분석 리포트 + 현재가 + 투자 포인트
3. **과거 성과 검증**: "100만원 넣었다면?" 에쿼티 커브 + 드로다운 + 월간 수익률
4. **투자 가이드**: 초보자 맞춤 용어 설명 + 3단계 가이드 + 성향 진단
5. **시장 현황**: VIX/S&P500/시장 국면 실시간 표시
6. **관리자 대시보드**: 원버튼 데이터 갱신 + 실시간 로그

## 필요한 API 키

| API | 용도 | 발급 |
|-----|------|------|
| 네이버 검색 | 뉴스 수집 | developers.naver.com |
| DART | 재무제표 | opendart.fss.or.kr |
| FMP | 외부 지수 | financialmodelingprep.com |
| Gemini/Groq | AI 분석 리포트 | aistudio.google.com / console.groq.com |

## 배포 (미완료)

추후 배포 시:
1. VPS 서버 준비 (Ubuntu 24.04)
2. Docker Compose (MySQL + FastAPI + nginx)
3. Let's Encrypt SSL
4. 도메인 연결

상세: `stages/ROADMAP_PROMPTS.md` DEPLOY 섹션 참조

## 미완료 작업

- [ ] 서버 배포 (VPS + 도메인 + HTTPS)
- [ ] L5 모델 재학습 (Time Decay 반영)
- [ ] 커스텀 랭킹 (사용자 피처 선택)
- [ ] 구독/수익화 (애드센스 or 유료)
- [ ] CI/CD + 테스트 코드

상세: `CLAUDE.md`, `HANDOFF.md` 참조

## 개발 이력

| 세션 | 내용 |
|------|------|
| A1~A2 | MVP: 자동화 + GitHub 배포 |
| B1~B2 | 기술적 지표 + 모델 최적화 |
| C1~C2 | 외부 지수 + Walk-Forward 검증 |
| D1 | L5 앙상블 수정 + Time Decay |
| UI-FIX-1~2 | 한글화 + 상품화 + AI 리포트 |
| BEGINNER-1~2 | 초보자 친화 UX (P0+P1 22항목) |
| BACKTEST-REDESIGN | 백테스트 전면 재설계 |
| WRAP-UP | 프로젝트 정리 + 문서 최종화 |

## 프로젝트 확인 / 이어서 작업하기

### 처음 보는 사람 (코드 리뷰, 구조 파악)

1. 이 README를 끝까지 읽기
2. `src/frontend/src/App.tsx` — 프론트엔드 6페이지 라우팅 구조 확인
3. `src/backend/app/main.py` — 백엔드 진입점 + API 라우터 마운트 확인
4. `src/backend/app/routers/` — 각 API 엔드포인트 코드
5. `scripts/daily_news_pipeline.py` — 데이터 파이프라인 전체 흐름

### 이어서 개발하는 사람 (AI 포함)

1. **`HANDOFF.md` 필독** — 핸드오프 가이드. 읽어야 할 파일 순서, 현황 요약, 세션별 변경 이력, 주의사항이 모두 정리되어 있음
2. **`CLAUDE.md` 필독** — 프로젝트 전체 컨텍스트. 아키텍처, API 목록, 파이프라인 구조, 미완료 작업 등
3. `stages/ROADMAP_PROMPTS.md` — 남은 작업(배포, 커스텀 랭킹, 수익화)에 대한 프롬프트
4. `docs/UX_REVIEW_BEGINNER_INVESTOR.md` — UI/UX 검토 문서 + P0~P3 로드맵

### 로컬에서 실행해보기

```bash
# 1. 사전 준비: Docker, Python 3.11+, Node.js 18+

# 2. 클론 + 의존성
git clone https://github.com/humpie-0413/kospi200.git
cd kospi200
pip install -r requirements.txt

# 3. 환경변수
cp .env.example src/backend/.env
# src/backend/.env 열어서 DB_PASSWORD 등 입력

# 4. MySQL + 데이터
docker-compose up -d
python scripts/setup_data.py
python scripts/init_mysql.py

# 5. 프론트엔드 빌드
cd src/frontend && npm install && npm run build && cd ../..

# 6. 서버 실행
cd src/backend && uvicorn app.main:app --port 8000

# 7. http://localhost:8000 접속
```

### 데이터가 없을 때

Google Drive에서 데이터를 받지 않았다면 DB가 비어있어 랭킹이 표시되지 않습니다:

```bash
python scripts/setup_data.py    # Google Drive 자동 다운로드
python scripts/init_mysql.py    # MySQL 적재
```

또는 API 키가 있다면 파이프라인으로 처음부터 생성:
```bash
python scripts/daily_news_pipeline.py   # ~25분
```

## 면책

본 프로젝트는 학습/연구 목적이며, 투자 판단의 책임은 이용자 본인에게 있습니다.
AI 분석은 과거 데이터 기반이며 미래 수익을 보장하지 않습니다.

## 라이선스

Private - All rights reserved.
