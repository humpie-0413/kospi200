# KOSPI200 프로젝트 — Claude Code 시스템 프롬프트

## 프로젝트 개요
KOSPI200 종목 AI 랭킹 웹 서비스. 주식 초보자를 위한 투자 도우미.

## 현재 상태: Session WRAP-UP 완료 — 배포 대기

### 완료된 세션 이력
| 세션 | 내용 |
|------|------|
| A1~A2 | MVP: 자동화 + GitHub 배포 |
| B1~B2 | 기술적 지표 + 모델 최적화 |
| C1~C2 | 외부 지수 + Walk-Forward 검증 |
| D1 | L5 앙상블 버그 수정 + Time Decay + 프로덕션 보안 |
| UI-FIX-1~2 | 한글화 + 카드 재디자인 + TOP3 + AI 리포트 + 백테스트 차트 |
| BEGINNER-1 | P0 초보자 친화 전면 개선 (10항목) |
| BEGINNER-2 | P1 초보자 친화 단기 개선 (12항목) |
| BACKTEST-REDESIGN | 백테스트 페이지 전면 재설계 (9작업) |
| WRAP-UP | 프로젝트 정리 + README 재작성 + 핸드오프 최종화 |

### 핵심 수치
- 52컬럼 패널: OHLCV(16) + 뉴스(6) + ESG(4) + 재무(5) + 외부지수(7) = 708K+ rows
- React SPA: 6페이지 (랭킹/종목상세/백테스트/투자가이드/관리자/로그인)
- FastAPI 백엔드: 18개 API + JWT 인증 + APScheduler 06:00 KST
- 11단계 일일 파이프라인 (~25분)

## 디렉토리 구조
```
kospi200/
├── src/backend/         ← FastAPI 백엔드
├── src/frontend/        ← React SPA (Vite + shadcn/ui)
├── scripts/             ← 데이터 파이프라인 스크립트
├── configs/             ← ESG 키워드 등 설정
├── docs/                ← 설계 문서, 분석 리포트
├── before/              ← 기존 ML 코드 (.gitignore, 로컬 전용)
├── data_drive/          ← 데이터 저장소 (.gitignore)
├── checkpoints/         ← 단계 완료 기록 (.gitignore)
└── stages/              ← 단계별 프롬프트 (.gitignore)
```

## 핵심 파일
| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | 프로젝트 전체 컨텍스트 (이 파일) |
| `HANDOFF.md` | 핸드오프 가이드 (새 작업자용) |
| `scripts/daily_news_pipeline.py` | 11단계 일일 파이프라인 |
| `scripts/rebuild_panel_and_reasons.py` | 패널 머지 + MySQL 리로드 |
| `src/backend/app/main.py` | FastAPI 앱 + SPA 서빙 |
| `src/backend/app/config.py` | 전체 설정 (DB, JWT, CORS) |
| `src/backend/app/routers/` | API 라우터 (rankings, backtest, admin, ai, auth, market) |
| `src/frontend/src/App.tsx` | React 라우터 (6페이지) |
| `src/frontend/src/lib/api.ts` | API 클라이언트 |
| `src/frontend/src/types/ranking.ts` | 핵심 타입 + 한글 매핑 |
| `before/ranking_backtest/src/stages/modeling/l5_train_models.py` | ML 모델 학습 |
| `before/ranking_backtest/configs/config.yaml` | 모델/파이프라인 설정 |

## 환경
- Docker MySQL: `kospi-mysql` (DB: kospi200)
- 서버: `cd src/backend && uvicorn app.main:app --port 8000`
- 프론트 빌드: `cd src/frontend && npm run build`
- 스케줄러: .env `SCHEDULER_ENABLED=true` (06:00 KST)
- API 키: .env에 NAVER, DART, FMP, GEMINI, GROQ

## 프론트엔드 스택
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| React Router | 7 | SPA 라우팅 (6페이지) |
| Tailwind CSS | 4 | 스타일링 |
| shadcn/ui | - | UI 컴포넌트 |
| Recharts | 3 | 차트 (레이더, 라인, 영역) |
| Vite | 7 | 빌드 도구 |

## API 엔드포인트 (18개)
- 랭킹: GET /api/rankings, /{ticker}, /dates, /timeline/{ticker}, /history, /performance, /freshness
- 종목: GET /api/rankings/{ticker}/price
- 백테스트: GET /api/backtest/metrics, /equity-curve, /summary
- 시장: GET /api/market/status
- AI: GET /api/ai/analysis/{ticker}
- 인증: POST /api/auth/login, /refresh
- 관리자: GET /api/admin/freshness, /pipeline/status, /pipeline/logs
- 관리자: POST /api/admin/pipeline/daily, /collect, /predict, /run-all
- 헬스: GET /api/health

## 11단계 일일 파이프라인
```
Step 0a: 유니버스 멤버십 확장
Step 0b: OHLCV 수집 (FinanceDataReader)
Step 0c: 기술적 피처 재계산
Step 0d: 패널 재구축
Step 0e: 외부 지수 수집 (FMP/FDR)
Step 1:  뉴스 수집 (네이버 API)
Step 2:  KR-FinBERT-SC 감성분석
Step 3:  news_sentiment_daily 갱신
Step 4:  esg_daily 갱신
Step 5:  패널 머지 + Track A + with_reasons
Step 6:  MySQL 리로드 + 당일 날짜 복제
```

## 알려진 이슈
- `before/`는 .gitignore → L5 변경사항 로컬 전용
- ens 전략 sparse (L5 재학습 필요)
- Groq API 키 403 (재발급 필요)
- CI/CD + 테스트 코드 없음

## 미완료 작업
1. **서버 배포** (VPS + 도메인 + Docker + nginx + SSL)
2. **L5 재학습** (Time Decay + 앙상블 수정 반영)
3. **커스텀 랭킹 + 구독 수익화**
4. **CI/CD + 테스트 코드**
5. **Groq API 키 재발급**
6. **애드센스** (서버 배포 후)

## 토큰 절약 규칙
- 인사/면책/부연 금지. 결과만 출력.
- 코드 전체 복사 금지. 변경 부분만 표시.
- 동일 정보 반복 금지. 파일 경로로 참조.
- 보고는 테이블 형식. 서술형 최소화.
- 불확실하면 가정 말고 질문.

## 코드 컨벤션
- 기존 코드(`before/`)의 스타일을 우선 따른다
- 주석은 한줄 요약만
