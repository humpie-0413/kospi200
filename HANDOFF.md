# KOSPI200 프로젝트 — AI 핸드오프 가이드

> 새 채팅이나 다른 AI에게 이 프로젝트를 넘길 때 이 파일을 첫 번째로 제공하세요.

## 1단계: 반드시 읽어야 할 파일 (우선순위 순)

### 필수 (프로젝트 이해)
| 순서 | 파일 | 이유 |
|------|------|------|
| 1 | `CLAUDE.md` | 프로젝트 전체 컨텍스트, 아키텍처, 현재 상태, 미완료 작업 |
| 2 | `HANDOFF.md` | 이 파일. 핸드오프 가이드 |
| 3 | `.env.example` | 환경변수 목록 (실제 .env는 gitignore) |

### 코드 구조 파악
| 순서 | 파일 | 이유 |
|------|------|------|
| 4 | `src/backend/app/main.py` | FastAPI 앱 진입점, SPA 서빙, 미들웨어 |
| 5 | `src/backend/app/config.py` | 전체 설정 (DB, JWT, CORS, 스케줄러) |
| 6 | `src/backend/app/routers/rankings.py` | 핵심 랭킹 API |
| 7 | `src/backend/app/routers/admin.py` | 관리자 API (파이프라인 트리거) |
| 8 | `src/frontend/src/App.tsx` | React 라우터, 5페이지 구조 |
| 9 | `src/frontend/src/lib/api.ts` | API 클라이언트 (모든 엔드포인트) |

### 데이터 파이프라인
| 순서 | 파일 | 이유 |
|------|------|------|
| 10 | `scripts/daily_news_pipeline.py` | 11단계 일일 파이프라인 (핵심) |
| 11 | `scripts/rebuild_panel_and_reasons.py` | 패널 머지 + MySQL 리로드 |
| 12 | `before/ranking_backtest/configs/config.yaml` | ML 모델/파이프라인 전체 설정 |

### ML 모델 (수정 시에만)
| 순서 | 파일 | 이유 |
|------|------|------|
| 13 | `before/ranking_backtest/src/stages/modeling/l5_train_models.py` | ML 학습 코드 (Time Decay, 앙상블) |
| 14 | `before/ranking_backtest/configs/feature_weights_long_ic_optimized.yaml` | Long feature weights |
| 15 | `before/ranking_backtest/configs/feature_weights_short_hitratio_optimized.yaml` | Short feature weights |
| 16 | `scripts/walk_forward_validation.py` | Walk-Forward 검증 스크립트 |

---

## 2단계: 프로젝트 현황 요약 (복사-붙여넣기용)

```
KOSPI200 AI 랭킹 서비스 (Session D1 완료, 2026-03-10)

스택: FastAPI + React 19 + MySQL + Python ML (XGBoost/Ridge/RF)
패널: 708K rows × 52 features (OHLCV+뉴스+ESG+재무+외부지수)
자동화: 06:00 KST 일일 파이프라인 (11단계, ~25분)
UI: React SPA 5페이지 (랭킹/종목상세/백테스트/관리자/로그인)

최근 변경 (D1):
- L5 앙상블 버그 수정 (4모델 정상 동작)
- Time Decay 구현 (H120 IR +38.5%)
- MySQL NaN 에러 수정
- 파이프라인 완료 후 당일 날짜 표시
- 프로덕션 보안 강화 (CORS/JWT/Docker)

미완료:
- L5 재학습 (Time Decay 반영 백테스트)
- backtest 페이지 개선
- 커스텀 랭킹 + 구독
- CI/CD + 테스트
```

---

## 3단계: 로컬 환경 시작 방법

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

## 4단계: 주의사항

| 항목 | 설명 |
|------|------|
| `before/` | .gitignore에 포함. L5 변경사항은 git에 안 올라감 |
| NaN 처리 | MySQL CSV 로드 시 반드시 NaN→0.0 변환 |
| dataset_daily | Track A 실행 전 반드시 삭제 (artifact_exists 체크) |
| ticker | DB는 leading zero 없음, zfill(6) 매핑 필요 |
| 당일 날짜 | step6_mysql에서 TEMPORARY TABLE로 오늘 날짜 복제 |
| JWT | 기본값 `change-me-in-production` → 프로덕션 시 반드시 변경 |
| Jinja 템플릿 | `src/backend/templates/`는 레거시, 사용 안 함 |

---

## 5단계: Git 커밋 히스토리

```
b61b26e fix: 파이프라인 완료 후 랭킹 날짜를 당일로 표시
5096d64 fix: MySQL 리로드 NaN 에러 수정
95e227d feat: Session D1 실전 투입 강화 (L5 앙상블 버그 + Time Decay + 보안)
60e74e0 feat: React + shadcn/ui 프론트엔드 + FastAPI SPA 서빙
b43b89d feat: Session C2 예측 심화 최적화 (WF 검증 + feature weights 교정)
4dea821 feat: Session B2 예측 최적화 Quick Win
dee79bc feat: 기술적 지표 3개 추가
a9f52c9 docs: CLAUDE.md에 FMP API + 참고자료 추가
028d53c Initial commit: KOSPI200 AI Ranking MVP
```
