# KOSPI200 프로젝트 — Claude Code 시스템 프롬프트

## 프로젝트 개요
KOSPI200 종목 AI 랭킹 웹 서비스. 기존 코드(`before/`)를 기반으로 구축 완료.

## 현재 상태: Session D1 완료 — 실전 투입 강화

### 완료된 작업
- Stage 0~7: 분석→설계→구현→배포 전 과정
- 52컬럼 패널: OHLCV(16) + 뉴스(6) + ESG(4) + 재무(5) + 외부지수(7) = 708K+ rows
- React SPA: 5페이지 (랭킹/종목상세/백테스트/관리자/로그인) + Recharts + Tailwind + shadcn/ui
- FastAPI 백엔드: 16개 API + JWT 인증 + APScheduler 06:00 KST
- Session C2: WF 검증 119/114 folds → feature weights 교정
- **Session D1**: L5 앙상블 버그 수정 + Time Decay 구현 + 프로덕션 보안 + MySQL NaN 수정

### Session D1 핵심 변경 (2026-03-10)
- **L5 `_build_model()` 치명적 버그 수정**: return 위치 오류 → 앙상블 4모델 정상 동작
- **Time Decay 구현**: λ=3.0, H120 IR +38.5% (L5 코드 반영, config.yaml `use_time_decay: true`)
- **MySQL NaN 수정**: float 컬럼 NaN → 0.0 변환 (LOAD DATA 실패 해결)
- **당일 랭킹 표시**: 파이프라인 완료 후 최신 랭킹을 오늘 날짜로 복제
- **프로덕션 보안**: CORS 환경변수화, JWT 경고, .dockerignore, Dockerfile 개선

## 디렉토리 구조
```
kospi200/
├── before/              ← 기존 ML 코드 (.gitignore, 로컬 전용)
├── src/backend/         ← FastAPI 백엔드
├── src/frontend/        ← React SPA (Vite + shadcn/ui)
├── scripts/             ← 데이터 파이프라인 스크립트
├── configs/             ← ESG 키워드 등 설정
├── data_drive/          ← 데이터 저장소 (.gitignore)
├── docs/                ← 설계 문서, 분석 리포트
├── checkpoints/         ← 단계 완료 기록
└── stages/              ← 단계별 프롬프트 (참조용)
```

## 핵심 파일 (이어서 작업 시 우선 참조)
| 파일 | 역할 |
|------|------|
| `CLAUDE.md` | 프로젝트 전체 컨텍스트 (이 파일) |
| `scripts/daily_news_pipeline.py` | 11단계 일일 파이프라인 (전체 데이터 갱신) |
| `scripts/rebuild_panel_and_reasons.py` | 패널 머지 + with_reasons + MySQL 리로드 |
| `before/ranking_backtest/src/stages/modeling/l5_train_models.py` | ML 모델 학습 (Time Decay + 앙상블) |
| `before/ranking_backtest/configs/config.yaml` | 전체 모델/파이프라인 설정 |
| `src/backend/app/main.py` | FastAPI 앱 + SPA 서빙 |
| `src/backend/app/routers/admin.py` | 관리자 API (파이프라인 트리거) |
| `src/backend/app/pipeline/wrapper.py` | 파이프라인 래퍼 (asyncio) |
| `src/frontend/src/App.tsx` | React 라우터 (5페이지) |
| `src/frontend/src/lib/api.ts` | API 클라이언트 |
| `src/frontend/src/hooks/useRankings.ts` | 랭킹 데이터 훅 |

## 환경
- Docker MySQL: `kospi-mysql` (root/1234, DB: kospi200)
- 서버 실행: `cd src/backend && uvicorn app.main:app --port 8000`
- 프론트엔드 빌드: `cd src/frontend && npm run build`
- 스케줄러: .env에서 활성 (SCHEDULER_ENABLED=true, 06:00 KST)
- API 키: .env에 NAVER_CLIENT_ID/SECRET, FMP_API_KEY, DART_API_KEY

## 시스템 아키텍처

### 데이터 흐름
```
FDR(OHLCV) + DART(재무) + 네이버(뉴스) + ESG키워드 + FMP(외부지수)
    ↓
52컬럼 패널 (panel_merged_daily.parquet, 708K+ rows)
    ↓
Track A L8 랭킹: z-score × feature_weights → score_total → rank
    ↓
with_reasons: 7카테고리 점수 + top3 피처 + 백분위
    ↓
MySQL (ranking_long/short_daily_with_reasons) + 당일 날짜 복제
    ↓
FastAPI 16개 엔드포인트 → React SPA
```

### 프론트엔드 스택
| 기술 | 버전 | 용도 |
|------|------|------|
| React | 19 | UI 프레임워크 |
| React Router | 7 | SPA 라우팅 (5페이지) |
| Tailwind CSS | 4 | 스타일링 |
| shadcn/ui | - | UI 컴포넌트 |
| Recharts | 3 | 차트 (레이더, 라인, 영역) |
| Vite | 7 | 빌드 도구 |

### API 엔드포인트 (16개)
- 랭킹: GET /api/rankings, /rankings/{ticker}, /rankings/dates, /rankings/timeline/{ticker}, /rankings/history, /rankings/performance
- 백테스트: GET /api/backtest/metrics, /equity-curve, /summary
- 인증: POST /api/auth/login, /refresh
- 관리자: GET /api/admin/freshness, /pipeline/status, /pipeline/logs
- 관리자: POST /api/admin/pipeline/daily, /collect, /predict, /run-all
- 헬스: GET /api/health

## 11단계 일일 파이프라인 (`scripts/daily_news_pipeline.py`)
```
Step 0a: 유니버스 멤버십 확장
Step 0b: OHLCV 수집 (FinanceDataReader)
Step 0c: 기술적 피처 재계산 (14개 OHLCV 파생)
Step 0d: 패널 재구축
Step 0e: 외부 지수 수집 (FMP/FDR)
Step 1:  뉴스 수집 (네이버 API)
Step 2:  KR-FinBERT-SC 감성분석
Step 3:  news_sentiment_daily 갱신
Step 4:  esg_daily 갱신
Step 5:  패널 머지 + Track A + with_reasons
Step 6:  MySQL 리로드 + 당일 날짜 복제
```
- 총 소요: ~25분, 06:00 KST 자동 실행
- Step 6에서 NaN→0.0 변환 + secure_file_priv 경로 사용
- 파이프라인 완료 시 당일 날짜로 랭킹 표시

## 알려진 이슈
- 뉴스/ESG: 과거 갭(~2024-12-31) 존재
- ticker zfill(6) 매핑 필요
- dataset_daily 파일 잔존 시 Track A가 최신 패널 무시 (삭제 필요)
- before/ 디렉토리는 .gitignore → L5 변경사항은 로컬 전용
- 테스트 코드 없음, CI/CD 미구축
- Jinja 템플릿(`src/backend/templates/`)은 레거시, React SPA가 대체

## 미완료 작업 (다음 세션 후보)
1. ~~뉴스/ESG 갭~~ → 완료
2. ~~관리자 대시보드~~ → 완료
3. ~~GitHub 배포~~ → 완료
4. ~~기술적 지표~~ → 완료
5. ~~예측 최적화~~ → C2 완료
6. ~~외부 지수~~ → C1 완료
7. ~~React 프론트엔드~~ → D1 완료
8. ~~L5 앙상블 버그~~ → D1 수정
9. ~~Time Decay~~ → D1 구현
10. ~~MySQL NaN 에러~~ → D1 수정
11. **backtest 페이지 디자인 개선**
12. **커스텀 랭킹 + 구독 수익화**
13. **CI/CD + 테스트 코드**
14. **L5 재학습 실행** (Time Decay + 앙상블 수정 반영, 백테스트 성과 확인)

## 토큰 절약 규칙
- 인사/면책/부연 금지. 결과만 출력.
- 코드 전체 복사 금지. 변경 부분만 표시.
- 동일 정보 반복 금지. 파일 경로로 참조.
- 보고는 테이블 형식. 서술형 최소화.
- 불확실하면 가정 말고 질문.

## 코드 컨벤션
- 기존 코드(`before/`)의 스타일을 우선 따른다
- 주석은 한줄 요약만
