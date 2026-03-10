# KOSPI200 프로젝트 — AI 핸드오프 가이드

> 새 채팅이나 다른 AI에게 이 프로젝트를 넘길 때 이 파일을 첫 번째로 제공하세요.

## 1단계: 반드시 읽어야 할 파일 (우선순위 순)

### 필수 (프로젝트 이해)
| 순서 | 파일 | 이유 |
|------|------|------|
| 1 | `CLAUDE.md` | 프로젝트 전체 컨텍스트, 아키텍처, 현재 상태, 미완료 작업 |
| 2 | `HANDOFF.md` | 이 파일. 핸드오프 가이드 |
| 3 | `docs/UX_REVIEW_BEGINNER_INVESTOR.md` | **UI/UX 전면 검토 문서** — 다음 작업 로드맵 |
| 4 | `.env.example` | 환경변수 목록 (실제 .env는 gitignore) |

### 코드 구조 파악
| 순서 | 파일 | 이유 |
|------|------|------|
| 5 | `src/backend/app/main.py` | FastAPI 앱 진입점, SPA 서빙, 미들웨어 |
| 6 | `src/backend/app/config.py` | 전체 설정 (DB, JWT, CORS, 스케줄러) |
| 7 | `src/backend/app/routers/rankings.py` | 핵심 랭킹 API |
| 8 | `src/backend/app/routers/backtest.py` | 백테스트 API |
| 9 | `src/backend/app/routers/ai.py` | AI 분석 리포트 API (Gemini/Groq) |
| 10 | `src/backend/app/routers/admin.py` | 관리자 API (파이프라인 트리거) |
| 11 | `src/frontend/src/App.tsx` | React 라우터, 5페이지 구조 |
| 12 | `src/frontend/src/lib/api.ts` | API 클라이언트 (모든 엔드포인트) |
| 13 | `src/frontend/src/types/ranking.ts` | 핵심 타입 + 한글 매핑 + 점수/색상 헬퍼 |

### 데이터 파이프라인
| 순서 | 파일 | 이유 |
|------|------|------|
| 14 | `scripts/daily_news_pipeline.py` | 11단계 일일 파이프라인 (핵심) |
| 15 | `scripts/rebuild_panel_and_reasons.py` | 패널 머지 + MySQL 리로드 |
| 16 | `before/ranking_backtest/configs/config.yaml` | ML 모델/파이프라인 전체 설정 |

### ML 모델 (수정 시에만)
| 순서 | 파일 | 이유 |
|------|------|------|
| 17 | `before/ranking_backtest/src/stages/modeling/l5_train_models.py` | ML 학습 코드 (Time Decay, 앙상블) |
| 18 | `before/ranking_backtest/configs/feature_weights_long_ic_optimized.yaml` | Long feature weights |
| 19 | `before/ranking_backtest/configs/feature_weights_short_hitratio_optimized.yaml` | Short feature weights |

---

## 2단계: 프로젝트 현황 요약 (복사-붙여넣기용)

```
KOSPI200 AI 랭킹 서비스 (Session UI-FIX-2 완료, 2026-03-11)

스택: FastAPI + React 19 + MySQL + Python ML (XGBoost/Ridge/RF)
패널: 708K rows × 52 features (OHLCV+뉴스+ESG+재무+외부지수)
자동화: 06:00 KST 일일 파이프라인 (11단계, ~25분)
UI: React SPA 5페이지 (랭킹/종목상세/백테스트/관리자/로그인)

프로젝트 방향성: "주식을 잘 모르는 사람이 투자 도움을 받을 수 있는 서비스"

완료 세션 히스토리:
- D1: L5 앙상블 버그 + Time Decay + MySQL NaN + 프로덕션 보안
- UI-FIX-1: 카테고리 한글화 + 카드 재디자인 + TOP3 + AI 리포트
- UI-FIX-2: 색상 소프트톤 + 탭 순서 + 레이더 짤림 + AI 500 수정
           + 백테스트 차트 전면 수정 (선형보간+벤치마크 정규화)
           + 에쿼티 커브 MySQL 리로드 (~2026-02-10)
           + X축 년도 표시 + phase 필터 제거
           + 초보 투자자 관점 UX 전면 검토 문서 작성

다음 작업 → docs/UX_REVIEW_BEGINNER_INVESTOR.md 의 P0 로드맵 참고
```

---

## 3단계: 세션별 변경 이력 (최신순)

### Session UI-FIX-2 (2026-03-11) — 현재 세션

**코드 변경 (커밋됨):**
- `fix: 백테스트 차트 전면 수정 (선형 보간 + 벤치마크 정규화)` — cdb6603
- `fix: AI 분석 500 에러 수정 + 백테스트 차트 휠 줌` — 05d32fa
- `fix: 색상 소프트톤 + 단기/장기 탭 순서 swap + 레이더 차트 짤림 수정` — b77ab56
- `feat: UI-FIX 상품화 (한글화 + 카드 재디자인 + TOP3)` — 51ec637

**코드 변경 (미커밋):**
- `EquityCurveChart.tsx`: X축 `v.slice(2,10)` → YY-MM-DD 표시
- `BacktestPage.tsx`: 에쿼티 커브에서 phase 필터 제거

**DB 변경 (코드 외):**
- MySQL 에쿼티 테이블 4개 CSV에서 리로드:
  - `bt_equity_curve_bt120_long`: 105행→2480행 (~2026-02-10, 일간)
  - `bt_equity_curve_bt20_short`: sparse→2210행 (~2024-12-30, 일간)
  - `bt_equity_curve_bt120_ens`: 105행 (sparse, ~2024-06-20, 원본 그대로)
  - `bt_equity_curve_bt20_ens`: 105행 (sparse, ~2024-06-20, 원본 그대로)

**문서 작성:**
- `docs/UX_REVIEW_BEGINNER_INVESTOR.md` — 초보 투자자 관점 전면 검토 + P0~P3 로드맵

**알려진 이슈:**
- Groq API 키 403 (재발급 필요)
- ens 전략 2개는 sparse 데이터 (L5 재학습 필요)
- 프론트엔드 빌드 완료, 서버 실행 중

---

### Session UI-FIX-1 (2026-03-11) — 이전 세션

**주요 변경:**
- `types/ranking.ts` 전면 재작성: CATEGORY_ICONS/LABELS, getScoreColor (sky/slate/rose), rankToScore, particle()
- `TopThreeSection.tsx` 신규: TOP 3 메달 카드
- `CategoryBadge.tsx` 신규: 미니 배지
- `RankingCard.tsx`, `RankingTable.tsx` 전면 재작성
- `CategoryBars.tsx`, `CategoryRadar.tsx` 한글화
- `TickerDetail.tsx` 점수 표시 개선
- `FilterPanel.tsx` 단기/장기 탭 순서 swap
- `StockDetailPage.tsx` 점수/탭 개선
- `AiAnalysis.tsx` 신규: AI 분석 리포트 컴포넌트
- `backtest_service.py` 선형보간 + 벤치마크 정규화
- `ai.py` get_ticker_name 수정 (500 에러 해결)

---

## 4단계: 다음 작업 로드맵

### 즉시 해야 할 것 (P0)
> 상세: `docs/UX_REVIEW_BEGINNER_INVESTOR.md` 섹션 5

| 항목 | 내용 |
|------|------|
| 히어로 배너 | 메인 페이지 상단 사이트 소개 + 도식 |
| 장기/단기 가이드 | 탭에 툴팁 ("처음이라면 장기 추천") |
| 면책 문구 | 푸터 고정 ("투자 참고용, 손실 책임은 이용자") |
| 피처 한글 매핑 | momentum_3m → "3개월 상승률" + 툴팁 |
| 투자 포인트 카드 | 종목 상세 상단 자동 생성 요약 |
| 현재가 표시 | DB OHLCV 데이터 활용 |
| 백테스트 안내 | 제목/전략/phase 리네이밍 + 행동 가이드 |

### 기술 부채
| 항목 | 내용 |
|------|------|
| L5 재학습 | Time Decay + 앙상블 수정 반영 → 백테스트 성과 확인 |
| ens 에쿼티 | bt120_ens, bt20_ens sparse → 재학습 후 일간 데이터 생성 필요 |
| CI/CD | 테스트 코드 없음, 배포 자동화 없음 |
| Groq API 키 | 403 에러 → 재발급 필요 |

---

## 5단계: 로컬 환경 시작 방법

```bash
# 1. Docker MySQL 시작
docker start kospi-mysql

# 2. 백엔드 서버
cd src/backend
uvicorn app.main:app --port 8000

# 3. 프론트엔드 개발 (수정할 때만)
cd src/frontend
npm run dev        # 개발 서버 (localhost:5173)
npm run build      # 프로덕션 빌드 → dist/

# 4. 파이프라인 수동 실행
python scripts/daily_news_pipeline.py

# 5. MySQL만 리로드
python scripts/reload_mysql_only.py
```

---

## 6단계: 주의사항

| 항목 | 설명 |
|------|------|
| `before/` | .gitignore에 포함. L5 변경사항은 git에 안 올라감 |
| NaN 처리 | MySQL CSV 로드 시 반드시 NaN→0.0 변환 |
| dataset_daily | Track A 실행 전 반드시 삭제 (artifact_exists 체크) |
| ticker | DB는 leading zero 없음, zfill(6) 매핑 필요 |
| 당일 날짜 | step6_mysql에서 TEMPORARY TABLE로 오늘 날짜 복제 |
| JWT | 기본값 `change-me-in-production` → 프로덕션 시 반드시 변경 |
| Jinja 템플릿 | `src/backend/templates/`는 레거시, 사용 안 함 |
| 에쿼티 데이터 | bt120_long/bt20_short는 일간, bt120_ens/bt20_ens는 sparse |
| 프론트 빌드 | 코드 수정 후 반드시 `npm run build` → 서버 재시작 |

---

## 7단계: Git 커밋 히스토리

```
cdb6603 fix: 백테스트 차트 전면 수정 (선형 보간 + 벤치마크 정규화)
05d32fa fix: AI 분석 500 에러 수정 + 백테스트 차트 휠 줌
b77ab56 fix: 색상 소프트톤 + 단기/장기 탭 순서 swap + 레이더 차트 짤림 수정
51ec637 feat: UI-FIX 상품화 (한글화 + 카드 재디자인 + TOP3 + AI 리포트 + 백테스트/파이프라인 개선)
8ce9c03 docs: CLAUDE.md 최신화 + HANDOFF.md 핸드오프 가이드 작성
b61b26e fix: 파이프라인 완료 후 랭킹 날짜를 당일로 표시
5096d64 fix: MySQL 리로드 NaN 에러 수정
95e227d feat: Session D1 실전 투입 강화 (L5 앙상블 버그 + Time Decay + 보안)
60e74e0 feat: React + shadcn/ui 프론트엔드 + FastAPI SPA 서빙
b43b89d feat: Session C2 예측 심화 최적화 (WF 검증 + feature weights 교정)
```
