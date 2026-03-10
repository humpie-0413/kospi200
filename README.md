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

## 설치 방법

### 사전 요구사항
- Python 3.11+
- Node.js 18+
- Docker (MySQL용)
- Git

### 1. 클론

```bash
git clone https://github.com/humpie-0413/kospi200.git
cd kospi200
```

### 2. MySQL

```bash
docker run -d --name kospi-mysql \
  -e MYSQL_ROOT_PASSWORD=<비밀번호> \
  -e MYSQL_DATABASE=kospi200 \
  -p 3306:3306 mysql:8.0 --local-infile=1
```

### 3. 환경변수

```bash
cp .env.example src/backend/.env
# .env 파일을 열고 실제 API 키 입력
```

### 4. 백엔드

```bash
cd src/backend
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 5. 프론트엔드

```bash
cd src/frontend
npm install
npm run build    # 프로덕션 (dist/ → FastAPI가 서빙)
npm run dev      # 개발 (localhost:5173)
```

### 6. 관리자 계정

```bash
cd src/backend
python seed_admin.py admin <비밀번호>
```

### 7. 파이프라인 실행

```bash
python scripts/daily_news_pipeline.py
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

## 이어서 작업하기

1. `HANDOFF.md` 읽기 (핸드오프 가이드)
2. `CLAUDE.md` 읽기 (프로젝트 전체 컨텍스트)
3. `stages/ROADMAP_PROMPTS.md` 읽기 (남은 작업 프롬프트)

## 면책

본 프로젝트는 학습/연구 목적이며, 투자 판단의 책임은 이용자 본인에게 있습니다.
AI 분석은 과거 데이터 기반이며 미래 수익을 보장하지 않습니다.

## 라이선스

Private - All rights reserved.
