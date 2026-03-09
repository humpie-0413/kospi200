# KOSPI200 프로젝트 — Claude Code 시스템 프롬프트

## 프로젝트 개요
KOSPI200 종목 AI 랭킹 웹 서비스. 기존 코드(`before/`)를 기반으로 구축 완료.

## 현재 상태: 전 단계(0~7) + 피처 복원 + UI 리디자인 + 뉴스/ESG 갭 해소 + 일별 자동화 + 아이디어 분석 + 관리자 대시보드 강화 완료

### 완료된 작업
- Stage 0~7: 분석→설계→구현→배포 전 과정
- 14개 피처 복원: OHLCV(14) + 뉴스(6) + ESG(4) + 재무(5) = 42컬럼 패널
- 랭킹 API: 매수/매도 분리 → 통합 스코어 순 페이지네이션 (KOSPI200 only, in_universe 필터)
- UI: Toss 스타일 리디자인 (다크모드, 반응형, Chart.js 레이더/타임라인)
- 뉴스/ESG 갭 해소 (P1~P7): 99,857건 감성분석, 일별 자동 갱신
- 일별 자동화 파이프라인: `scripts/daily_news_pipeline.py` 10단계 통합 + APScheduler 06:00 KST
- 6개 아이디어 분석 리포트: `docs/idea_analysis_report.md`
- 관리자 대시보드 강화: freshness API + 원버튼 갱신 + 10단계 프로그레스 + 서버 시작 시 자동 체크

## 디렉토리 구조
```
kospi200/
├── before/          ← 기존 프로젝트 코드 (읽기 전용)
├── stages/          ← 단계별 프롬프트 (참조용)
├── checkpoints/     ← 단계 완료 기록 (0~7 + FEATURE_RESTORE)
├── src/backend/     ← FastAPI 백엔드 (메인 코드)
├── scripts/         ← 데이터 파이프라인 스크립트
├── docs/            ← 설계 문서, 디자인 핸드오프, 분석 리포트
└── new/             ← 외부 AI가 제작한 디자인 파일 (적용 완료)
```

## 핵심 파일 (이어서 작업 시 우선 참조)
| 파일 | 역할 |
|------|------|
| `scripts/daily_news_pipeline.py` | 10단계 통합 일일 파이프라인 (전체 데이터 갱신) |
| `scripts/rebuild_panel_and_reasons.py` | 패널 뉴스/ESG 머지 + with_reasons + MySQL |
| `scripts/collect_news_naver_api.py` | 네이버 검색 API 뉴스 수집 |
| `src/backend/app/services/ranking_service.py` | 랭킹 API 비즈니스 로직 |
| `src/backend/app/routers/rankings.py` | 랭킹 라우터 (페이지네이션) |
| `src/backend/app/services/scheduler.py` | APScheduler 06:00 KST 자동 실행 |
| `src/backend/templates/rankings.html` | 랭킹 UI (Toss 디자인 + JS 로직) |
| `src/backend/templates/base.html` | 공통 레이아웃 (다크모드 토글) |
| `src/backend/static/css/common.css` | CSS 디자인 시스템 |
| `docs/idea_analysis_report.md` | 6개 아이디어 분석 리포트 |
| `docs/DESIGN_HANDOFF.md` | 디자인 변경 가이드 |
| `checkpoints/STAGE_FEATURE_RESTORE.md` | 피처 복원 상세 |

## 환경
- Docker MySQL: `kospi-mysql` (credentials in `.env`)
- 서버 실행: `cd src/backend && uvicorn app.main:app --port 8000`
- DART API 키: `.env`에 `DART_API_KEY` 설정
- 스케줄러: .env에서 활성 (SCHEDULER_ENABLED=true, 06:00 KST)
- Naver API: .env에 NAVER_CLIENT_ID/SECRET 설정
- FMP API: .env에 FMP_API_KEY 설정 (무료 250회/일, 외부 지수 수집용)

## 시스템 아키텍처

### 데이터 흐름
```
FDR(OHLCV) + DART(재무) + 네이버(뉴스) + ESG키워드
    ↓
42컬럼 패널 (panel_merged_daily.parquet, 708K+ rows)
    ↓
앙상블 모델: XGBoost(90/50%) + Ridge(5/30%) + RF(3/10%) + Grid(2/10%)
    ↓
Track A L8 랭킹: z-score 정규화 → 가중합 → score_total → rank
    ↓
with_reasons: 7카테고리 점수 + top3 피처 + 백분위
    ↓
MySQL (ranking_long/short_daily_with_reasons)
    ↓
FastAPI 14개 엔드포인트 → Toss 스타일 UI
```

### 모델 구성
| 모델 | Long 가중치 | Short 가중치 |
|------|-----------|------------|
| XGBoost | 90% | 50% |
| Ridge | 5% | 30% |
| Random Forest | 3% | 10% |
| Grid | 2% | 10% |

### API 엔드포인트 (16개)
- 랭킹: GET /api/rankings, /api/rankings/{ticker}, /api/rankings/dates
- 인증: POST /api/auth/login, /register, /refresh
- 파이프라인: POST /api/admin/pipeline/daily, /collect, /predict, /run-all, GET /pipeline/status, /pipeline/logs
- 관리자: GET /api/admin/freshness
- UI: GET /rankings, /backtest

## 데이터 현황 (2026-03-09 기준)
| 구분 | 피처수 | 커버리지 | 갱신 |
|------|--------|----------|------|
| OHLCV 파생 | 14 | 100% | 일별 자동 |
| 뉴스 감성 | 6 | 갭 해소 | 일별 자동 |
| ESG | 4 | 갭 해소 | 일별 자동 |
| 재무(DART) | 5 | 86% | 연간 |

- 패널: 708,452 rows × 42 columns (2026-03-09까지)
- MySQL: ranking_long/short_daily_with_reasons 각 708,452 rows
- KOSPI200 in_universe: 198종목

## 10단계 일일 파이프라인 (`scripts/daily_news_pipeline.py`)
```
Step 0a: 유니버스 멤버십 확장 (새 월이면 forward-fill)
Step 0b: OHLCV 수집 (FinanceDataReader, ~3분/307종목)
Step 0c: 기술적 피처 재계산 (14개 OHLCV 파생, shift(1))
Step 0d: 패널 재구축 (build_panel_merged_daily, ~12초)
Step 1:  네이버 검색 API 뉴스 수집
Step 2:  KR-FinBERT-SC 감성분석
Step 3:  news_sentiment_daily.parquet 갱신
Step 4:  esg_daily.parquet 갱신
Step 5:  패널 뉴스/ESG 머지 + Track A 예측 + with_reasons 재생성
Step 6:  MySQL 리로드
```
- 총 소요: ~25분
- 로그: `data_drive/data_backup/daily_pipeline.log`
- **중요**: Step 5에서 Track A 실행 전 dataset_daily.parquet/.csv 삭제 필요 (artifact_exists()가 둘 다 체크)

## 아이디어 분석 결과 요약 (`docs/idea_analysis_report.md`)
| # | 아이디어 | 소요(h) | 권장 순위 |
|---|---------|---------|----------|
| 6 | 관리자 대시보드 강화 (원버튼 갱신 + 상태 표시) | 12~18 | **1순위** |
| 5 | MVP + GitHub 배포 (.gitignore, 키정리, README) | 5~12 | **2순위** |
| 1 | 기술적 지표 추가 (RSI/MACD/Bollinger) | 8~12 | **3순위** |
| 3 | 예측 최적화 (XGB 정규화, 앙상블 가중치) | 6~60 | **4순위** |
| 4 | 외부 지수 통합 (VIX/S&P500 → 시장 국면) | 16~20 | **5순위** |
| 2 | 커스텀 랭킹 + 구독 수익화 | 56~80 | **6순위** |

### 권장 실행 순서
- Phase A (즉시): #6 관리자 대시보드 + #5 GitHub 준비
- Phase B (1주): #1 지표 추가 + #3 Quick Win 최적화
- Phase C (2~3주): #4 시장 국면 모듈 + #3 심화 최적화
- Phase D (1~2개월): #2 커스텀 랭킹 + 구독 시스템

### 핵심 인사이트
- ~~Git 미사용~~ → GitHub 배포 완료 (humpie-0413/kospi200)
- MVP 완성도: 6.7/10 (핵심 기능 작동, 보안/테스트/CI 미흡)
- 외부 지수는 랭킹 직접 효과보다 시장 국면 모듈로 활용이 효과적
- XGBoost 과적합 징후 (IC 0.733pt 하락) → 정규화 강화 필요
- 커스텀 랭킹은 모델 정확도 검증 후에 의미 있음

## 참고 자료 (Phase C~D에서 활용)
- `C:\0_project\claude-trading-skills/` — 33개 트레이딩 스킬 패키지 (git clone 완료)
  - `skills/macro-regime-detector/` → Phase C1 시장 국면 판별 로직 참조
  - `skills/backtest-expert/references/` → Phase C2 walk-forward 검증 방법론
  - `skills/economic-calendar-fetcher/` → Phase C1 FMP API 호출 패턴
  - `skills/us-market-bubble-detector/` → 버블 스코어링 참조
  - `skills/canslim-screener/` → Phase D1 다중 팩터 스코어링 참조

## 알려진 이슈
- 뉴스/ESG: 일별 자동 갱신 중이나 과거 갭(~2024-12-31) 존재
- ticker zfill(6) 매핑 필요 (DB는 leading zero 없음)
- dataset_daily 파일 잔존 시 Track A가 최신 패널 무시 (반드시 삭제)
- ~~보안: .env에 API키/비밀번호 포함~~ → 시크릿 제거 완료, .env.example 제공
- 테스트 코드 거의 없음, CI/CD 미구축

## 미완료 작업 (다음 세션 후보)
1. ~~뉴스 데이터 갭~~ → 완료
2. ~~ESG 데이터 갭~~ → 완료
3. ~~일별 전체 데이터 갱신 파이프라인~~ → 완료
4. ~~6개 아이디어 분석 리포트~~ → 완료 (`docs/idea_analysis_report.md`)
5. ~~관리자 대시보드 강화~~ → 완료 (`checkpoints/STAGE_ADMIN_DASHBOARD.md`)
6. ~~GitHub 배포~~ → 완료 (https://github.com/humpie-0413/kospi200)
7. **기술적 지표 추가** (RSI, MACD, Bollinger Band)
8. **예측 최적화** (XGB 정규화, 앙상블 가중치 조정)
9. **backtest 페이지 디자인**: rankings와 동일 Toss 스타일 적용
10. **외부 지수 통합** (FMP API: VIX/S&P500/WTI/금리 → 시장 국면 모듈)
11. **커스텀 랭킹 + 구독** (z-score 매트릭스 + 사용자 피처 선택 + 결제)
- 전체 로드맵 + 세션별 프롬프트: `stages/ROADMAP_PROMPTS.md` 참조

## 토큰 절약 규칙
- 인사/면책/부연 금지. 결과만 출력.
- 코드 전체 복사 금지. 변경 부분만 표시.
- 동일 정보 반복 금지. 파일 경로로 참조.
- 보고는 테이블 형식. 서술형 최소화.
- 불확실하면 가정 말고 질문.

## 코드 컨벤션
- 기존 코드(`before/`)의 스타일을 우선 따른다
- 주석은 한줄 요약만
