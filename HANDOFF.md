# KOSPI200 프로젝트 — AI 핸드오프 가이드

> 새 채팅이나 다른 AI에게 이 프로젝트를 넘길 때 이 파일을 첫 번째로 제공하세요.

## 1단계: 반드시 읽어야 할 파일

### 필수 (프로젝트 이해)
| 순서 | 파일 | 이유 |
|------|------|------|
| 1 | `CLAUDE.md` | 프로젝트 전체 컨텍스트, 아키텍처, 현재 상태 |
| 2 | `HANDOFF.md` | 이 파일. 핸드오프 가이드 |
| 3 | `README.md` | 설치/실행 방법, 기술 스택, 프로젝트 소개 |
| 4 | `.env.example` | 환경변수 목록 (실제 .env는 gitignore) |

### 코드 구조 파악
| 순서 | 파일 | 이유 |
|------|------|------|
| 5 | `src/backend/app/main.py` | FastAPI 앱 진입점, SPA 서빙 |
| 6 | `src/backend/app/config.py` | 전체 설정 (DB, JWT, CORS, 스케줄러) |
| 7 | `src/backend/app/routers/rankings.py` | 핵심 랭킹 API |
| 8 | `src/backend/app/routers/backtest.py` | 백테스트 API |
| 9 | `src/backend/app/routers/ai.py` | AI 분석 리포트 API (Gemini/Groq) |
| 10 | `src/backend/app/routers/admin.py` | 관리자 API (파이프라인 트리거) |
| 11 | `src/frontend/src/App.tsx` | React 라우터 (6페이지) |
| 12 | `src/frontend/src/lib/api.ts` | API 클라이언트 |
| 13 | `src/frontend/src/types/ranking.ts` | 핵심 타입 + 한글 매핑 + 점수/색상 헬퍼 |

### 데이터 파이프라인
| 순서 | 파일 | 이유 |
|------|------|------|
| 14 | `scripts/daily_news_pipeline.py` | 11단계 일일 파이프라인 (핵심) |
| 15 | `scripts/rebuild_panel_and_reasons.py` | 패널 머지 + MySQL 리로드 |
| 16 | `before/ranking_backtest/configs/config.yaml` | ML 모델/파이프라인 설정 |

### ML 모델 (수정 시에만)
| 순서 | 파일 | 이유 |
|------|------|------|
| 17 | `before/ranking_backtest/src/stages/modeling/l5_train_models.py` | ML 학습 (Time Decay, 앙상블) |
| 18 | `before/ranking_backtest/configs/feature_weights_long_ic_optimized.yaml` | Long feature weights |
| 19 | `before/ranking_backtest/configs/feature_weights_short_hitratio_optimized.yaml` | Short feature weights |

---

## 2단계: 프로젝트 현황 요약 (복사-붙여넣기용)

```
KOSPI200 AI 랭킹 서비스 (Session WRAP-UP 완료, 2026-03-11)

스택: FastAPI + React 19 + MySQL + Python ML (XGBoost/Ridge/RF)
패널: 708K rows × 52 features (OHLCV+뉴스+ESG+재무+외부지수)
자동화: 06:00 KST 일일 파이프라인 (11단계, ~25분)
UI: React SPA 6페이지 (랭킹/종목상세/백테스트/투자가이드/관리자/로그인)

프로젝트 방향성: "주식을 잘 모르는 사람이 투자 도움을 받을 수 있는 서비스"

완료 세션: A1~A2 → B1~B2 → C1~C2 → D1 → UI-FIX-1~2 → BEGINNER-1~2 → BACKTEST-REDESIGN → WRAP-UP
현재 상태: 개발 완료, 서버 배포 대기
```

---

## 3단계: 세션별 변경 이력 (최신순)

### Session WRAP-UP (2026-03-11)
- 코드 정리: Jinja2 레거시 templates/ 삭제, .gitignore 보완, .env.example placeholder 추가
- 시크릿 스캔 + 하드코딩 비밀번호 제거
- CLAUDE.md / HANDOFF.md / README.md 전면 재작성
- requirements.txt 정리 (jinja2 제거)
- stages/ 로컬 정리 (archive/ 이동)
- 최종 빌드 검증 + git push

### Session BACKTEST-REDESIGN (2026-03-11)
- 백테스트 페이지 전면 재설계 (9개 작업)
- BacktestOverviewCards, EquityCurveChart, DrawdownChart, MonthlyReturnsChart 등 신규 컴포넌트
- 반응형 그리드 레이아웃 + 다크모드 지원

### Session BEGINNER-2 (2026-03-11)
- 순위 해석 텍스트, 카테고리 호버 설명, TOP3 요약 강화
- CAGR/누적수익률 정정, 기간 프리셋 버튼
- 데이터 신선도 표시 (/api/rankings/freshness)
- 시장 현황 위젯 (/api/market/status)
- 투자 가이드 페이지 (/guide) + 투자 성향 진단

### Session BEGINNER-1 (2026-03-11)
- 히어로 배너, 장기/단기 툴팁, 푸터 면책
- 피처 한글화 30개, 투자 포인트 자동 생성
- 현재가 표시 API, 백테스트 제목/전략 한글화
- 네비게이션: "백테스트" → "과거 성과"

### Session UI-FIX-1~2 (2026-03-11)
- 카테고리 한글화 + 아이콘, 랭킹 카드/테이블 재디자인
- TOP 3 하이라이트, AI 분석 500 에러 수정
- 백테스트 차트 전면 수정 (선형보간 + 벤치마크 정규화)
- MySQL 에쿼티 테이블 CSV 리로드

### Session D1 (2026-03-10)
- L5 `_build_model()` return 위치 버그 수정
- Time Decay λ=3.0 구현
- MySQL NaN→0.0 변환, 당일 랭킹 날짜 복제
- CORS 환경변수화, JWT 경고, Dockerfile 개선

### Session C1~C2
- 외부 지수 7개 추가 (FMP API)
- Walk-Forward 검증 119/114 folds
- Feature weights IC 기반 교정

### Session B1~B2
- 기술적 지표 3개 추가 (RSI, MACD, Bollinger)
- XGBoost 정규화, MACD 제거 (C2에서 재교정)

### Session A1~A2
- 초기 MVP: 데이터 수집 + ML 모델 + FastAPI + MySQL
- GitHub 배포

---

## 4단계: 다음 작업 로드맵

### 즉시 해야 할 것
| 우선순위 | 항목 | 상세 |
|----------|------|------|
| 1 | 서버 배포 | VPS + Docker Compose + nginx + SSL |
| 2 | L5 재학습 | Time Decay + 앙상블 수정 반영 → 백테스트 성과 확인 |
| 3 | Groq API 키 | 재발급 (현재 403) |

### 추후 작업
| 항목 | 내용 |
|------|------|
| 커스텀 랭킹 | 사용자 피처 선택 → 개인화 순위 |
| 구독/수익화 | 유료 구독 또는 애드센스 |
| CI/CD | 테스트 코드 + GitHub Actions |
| UX P2 | 유사 종목 추천, 업종 필터, 관심 종목, 종목 비교 |

---

## 5단계: 로컬 환경 시작 방법

```bash
# 1. Docker MySQL 시작
docker start kospi-mysql

# 2. 백엔드 서버
cd src/backend
uvicorn app.main:app --port 8000

# 3. 프론트엔드 (수정할 때만)
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
| 에쿼티 데이터 | bt120_long/bt20_short는 일간, bt120_ens/bt20_ens는 sparse |
| 프론트 빌드 | 코드 수정 후 반드시 `npm run build` → 서버 재시작 |

---

## 7단계: Git 커밋 히스토리

```
(WRAP-UP)  chore: 프로젝트 정리 + README 재작성 + 핸드오프 최종화
9b9da28 feat: BACKTEST-REDESIGN 백테스트 페이지 전면 재설계 (작업 1~9)
6c39d39 feat: BEGINNER-2 P1 초보 투자자 친화 단기 개선 (12항목)
83e58f9 feat: BEGINNER-1 P0 초보 투자자 친화 전면 개선 (10항목)
830667c fix: 백테스트 X축 년도 표시 + phase 필터 제거 + UX 검토 문서
cdb6603 fix: 백테스트 차트 전면 수정 (선형 보간 + 벤치마크 정규화)
05d32fa fix: AI 분석 500 에러 수정 + 백테스트 차트 휠 줌
b77ab56 fix: 색상 소프트톤 + 단기/장기 탭 순서 swap + 레이더 차트 짤림 수정
51ec637 feat: UI-FIX 상품화 (한글화 + 카드 재디자인 + TOP3 + AI 리포트)
8ce9c03 docs: CLAUDE.md 최신화 + HANDOFF.md 핸드오프 가이드 작성
b61b26e fix: 파이프라인 완료 후 랭킹 날짜를 당일로 표시
5096d64 fix: MySQL 리로드 NaN 에러 수정
95e227d feat: Session D1 실전 투입 강화 (L5 앙상블 버그 + Time Decay + 보안)
60e74e0 feat: React + shadcn/ui 프론트엔드 + FastAPI SPA 서빙
b43b89d feat: Session C2 예측 심화 최적화 (WF 검증 + feature weights 교정)
4dea821 feat: Session B2 예측 최적화 Quick Win (MACD 제거 + XGB 정규화)
dee79bc feat: 기술적 지표 3개 추가 (RSI_14/MACD_signal/bollinger_pctb)
a9f52c9 docs: CLAUDE.md에 FMP API + 참고자료 + 로드맵 참조 추가
028d53c Initial commit: KOSPI200 AI Ranking MVP
```
