# KOSPI200 프로젝트 현황 보고서

> 작성일: 2026-03-08

---

## 1. 프로젝트 개요

KOSPI200 종목의 ML 기반 LONG/SHORT 랭킹 예측 + 백테스트 시각화 웹 서비스.
기존 CLI 파이프라인(`before/`)을 분석하여 FastAPI 웹 서비스로 재구축.

---

## 2. 완료 단계

| Stage | 내용 | 상태 |
|-------|------|------|
| 0 | 기존 코드 탐색 (5,404개 파일, 구조 파악) | 완료 |
| 1 | 코드 분석 (7개 카테고리, 70% 완성도 판정) | 완료 |
| 2 | 사용자 검토 (요구사항 확정: 공개 조회 + 관리자 트리거) | 완료 |
| 3 | 구현 계획 (30개 태스크, 기술 스택 확정) | 완료 |
| 4 | 백엔드 구축 (14 API, 9 ORM 모델, 19 Python 모듈) | 완료 |
| 5 | 프론트엔드 구축 (6 페이지, Chart.js, Bootstrap 5) | 완료 |
| 6 | 통합 검증 (15/15 테스트 PASS, 5개 버그 수정) | 완료 |
| 7 | 배포 준비 (Dockerfile, docker-compose, README) | 완료 |
| - | 파이프라인 연결 (`before/` 실제 코드 연결) | 완료 |
| - | Docker MySQL + 라이브 서버 테스트 | 완료 |

---

## 3. 현재 실행 환경

| 항목 | 상태 |
|------|------|
| Docker MySQL | `kospi-mysql` 컨테이너 (credentials in `.env`) |
| FastAPI 서버 | `http://localhost:8000` 실행 중 |
| 관리자 계정 | `seed_admin.py`로 생성 |
| 데이터 | 빈 DB (파이프라인 실행 시 생성) |
| 스케줄러 | 비활성 (`.env`에서 `SCHEDULER_ENABLED=false`) |

---

## 4. 아키텍처

```
[사용자 브라우저]
       │
       ▼
[FastAPI (uvicorn:8000)]
  ├── /              → Jinja2 렌더링 (rankings.html)
  ├── /backtest      → Jinja2 렌더링 (backtest.html)
  ├── /login         → Jinja2 렌더링 (login.html)
  ├── /admin         → Jinja2 렌더링 (admin.html)
  ├── /api/rankings  → JSON (공개)
  ├── /api/backtest  → JSON (공개)
  ├── /api/auth      → JWT 로그인
  └── /api/admin     → 파이프라인 트리거 (JWT 필수)
       │
       ▼
[MySQL 8.0 (Docker)]
  ├── ranking_*      ← 랭킹 데이터
  ├── bt_*           ← 백테스트 데이터
  ├── benchmark_*    ← 벤치마크
  ├── users          ← 관리자 계정
  └── pipeline_logs  ← 실행 이력
       │
       ▼
[before/ranking_backtest]
  ├── DataCollectionPipeline.run_all()  ← L0~L4 데이터 수집
  └── run_track_a_pipeline()            ← Track A 랭킹 예측
```

---

## 5. 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| Backend | FastAPI + Uvicorn | 0.115.0 / 0.30.0 |
| ORM | SQLAlchemy (동기) | 2.0.35 |
| DB | MySQL | 8.0 (Docker) |
| 인증 | PyJWT + bcrypt | 2.9.0 / 4.2.0 |
| 스케줄러 | APScheduler | 3.10.4 |
| Rate Limit | slowapi | 0.1.9 |
| Template | Jinja2 | 3.1.4 |
| Frontend | Bootstrap 5.1.3, Chart.js 3.9.1 | CDN |
| Pipeline | pandas, numpy, scikit-learn, pyarrow | latest |
| 배포 | Docker + docker-compose | - |

---

## 6. 파일 구조

```
kospi200/
├── .gitignore
├── README.md
├── docker-compose.yml
├── checkpoints/              ← Stage 0~7 완료 기록 (8개)
├── docs/
│   ├── analysis-report.md    ← 코드 분석 보고서
│   ├── MANUAL_TASKS.md       ← 수동 작업 목록
│   └── PROJECT_STATUS.md     ← 이 문서
├── stages/                   ← 단계별 프롬프트 (stage0~7)
├── before/                   ← 기존 프로젝트 (읽기 전용)
└── src/backend/              ← 신규 구축 코드
    ├── Dockerfile
    ├── requirements.txt      ← 17개 패키지
    ├── seed_admin.py         ← 관리자 생성 스크립트
    ├── .env.example
    ├── app/
    │   ├── main.py           ← FastAPI 앱 (lifespan, CORS, 에러핸들러)
    │   ├── config.py         ← 환경변수 설정 (pydantic-settings)
    │   ├── database.py       ← SQLAlchemy 엔진/세션
    │   ├── auth/
    │   │   ├── jwt.py        ← 토큰 생성/검증
    │   │   └── dependencies.py ← get_current_user, require_admin
    │   ├── models/           ← ORM 모델 (9개 테이블)
    │   │   ├── ranking.py    ← 4 모델 (long/short × daily/with_reasons)
    │   │   ├── backtest.py   ← 3 모델 + 동적 전략 테이블 매핑
    │   │   ├── user.py
    │   │   └── pipeline_log.py
    │   ├── schemas/          ← Pydantic 스키마
    │   │   ├── auth.py
    │   │   ├── ranking.py
    │   │   └── backtest.py
    │   ├── routers/          ← API 라우터
    │   │   ├── rankings.py   ← 3 엔드포인트 (공개)
    │   │   ├── backtest.py   ← 3 엔드포인트 (공개)
    │   │   ├── auth.py       ← 2 엔드포인트 (login, refresh)
    │   │   ├── admin.py      ← 5 엔드포인트 (JWT 필수)
    │   │   └── pages.py      ← 5 페이지 렌더링
    │   ├── services/
    │   │   ├── ranking_service.py   ← 랭킹 조회 로직
    │   │   ├── backtest_service.py  ← 백테스트 조회 로직
    │   │   └── scheduler.py        ← APScheduler (매일 06:00)
    │   └── pipeline/
    │       ├── wrapper.py    ← before/ 코드 직접 호출 (to_thread)
    │       └── state.py      ← 실행 상태 (threading.Lock)
    ├── templates/            ← Jinja2 (7개)
    │   ├── base.html         ← 공통 레이아웃 (Navbar, CDN)
    │   ├── rankings.html     ← TOP20 LONG/SHORT, 날짜 선택, 피처 아이콘
    │   ├── backtest.html     ← 4전략 탭, 메트릭 카드, 에쿼티 커브
    │   ├── login.html        ← 관리자 로그인
    │   ├── admin.html        ← 파이프라인 트리거/상태/로그
    │   ├── 404.html
    │   └── 500.html
    └── static/css/
        └── common.css        ← 공통 스타일
```

---

## 7. API 엔드포인트 (14개)

### 공개 API

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/api/health` | 헬스체크 |
| GET | `/api/rankings` | 당일 랭킹 TOP-K (LONG/SHORT) |
| GET | `/api/rankings/dates` | 조회 가능 날짜 목록 |
| GET | `/api/rankings/history` | 과거 랭킹 이력 (페이지네이션) |
| GET | `/api/backtest/metrics` | 백테스트 성과 지표 |
| GET | `/api/backtest/equity-curve` | 에쿼티 커브 + 벤치마크 |
| GET | `/api/backtest/summary` | 전략별 요약 |

### 인증 API

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/auth/login` | 관리자 로그인 → JWT 발급 |
| POST | `/api/auth/refresh` | Access Token 갱신 |

### 관리자 API (JWT 필수)

| Method | URL | 설명 |
|--------|-----|------|
| POST | `/api/admin/pipeline/collect` | 데이터 수집 트리거 |
| POST | `/api/admin/pipeline/predict` | 랭킹 예측 트리거 |
| POST | `/api/admin/pipeline/run-all` | 전체 파이프라인 실행 |
| GET | `/api/admin/pipeline/status` | 파이프라인 실행 상태 |
| GET | `/api/admin/pipeline/logs` | 파이프라인 실행 로그 |

---

## 8. 라이브 서버 테스트 결과 (2026-03-08)

| 테스트 | 기대 | 결과 |
|--------|------|------|
| Health check | 200 | PASS |
| Rankings (empty DB) | 200 | PASS |
| Dates (empty DB) | 200 | PASS |
| Backtest Summary (empty) | 200 | PASS |
| Backtest Metrics (empty) | 200 | PASS |
| Login 실패 (잘못된 정보) | 401 | PASS |
| Login 성공 (admin) | 200 + JWT | PASS |
| Admin 미인증 접근 | 403 | PASS |
| Admin 인증 접근 (status) | 200 | PASS |
| Admin 인증 접근 (logs) | 200 | PASS |
| 5개 페이지 렌더링 | 200 | PASS |
| API 404 | 404 JSON | PASS |
| Page 404 | 404 HTML | PASS |
| **총 13/13** | | **ALL PASS** |

---

## 9. Stage 6 버그 수정 이력

| 수정 | 파일 | 내용 |
|------|------|------|
| 비동기 블로킹 | `admin.py` | `await` → `asyncio.create_task()` (fire-and-forget) |
| DB 세션 누수 | `wrapper.py` | 자체 `SessionLocal()` 생성/종료 |
| 스케줄러 세션 | `scheduler.py` | `db` 전달 제거 (wrapper 자체 관리) |
| Pydantic v2 | `rankings.py` | `regex=` → `pattern=` |
| 하드코딩 경로 | `ranking_service.py` | Settings에서 ticker_name_mapping 경로 로드 |
| 미사용 import | `main.py` | `HTMLResponse` 제거 |
| MySQL 인증 | `requirements.txt` | `pymysql[rsa]` (cryptography 포함) |
| Backtest 500 | `backtest_service.py` | 미존재 테이블 조회 시 graceful skip |

---

## 10. 남은 작업

### 즉시 가능 (데이터 생성)

| 작업 | 방법 | 비고 |
|------|------|------|
| 파이프라인 실행 | Admin 페이지 → "Run All" 버튼 | 데이터 수집 + 예측 |
| 또는 CLI | `before/ranking_backtest`에서 `python -m src.cli run` | 직접 실행 |

### 프로덕션 배포 시

| 작업 | 설명 |
|------|------|
| JWT_SECRET 변경 | `.env`에 랜덤 키 설정 (`openssl rand -hex 32`) |
| DB 비밀번호 변경 | 기본값 → 강력한 비밀번호 |
| SCHEDULER_ENABLED=true | 매일 06:00 자동 실행 활성화 |
| HTTPS 설정 | nginx 리버스 프록시 + SSL 인증서 |
| DEBUG=false | CORS 제한 활성화 |

### 향후 확장

| 기능 | 설명 |
|------|------|
| 일반 사용자 로그인 | 관심종목 담기 등 |
| DB 마이그레이션 | Alembic 도입 |
| 로그 수집 | ELK / CloudWatch 연동 |
| CI/CD | GitHub Actions 자동 배포 |

---

## 11. 참고 문서

| 문서 | 경로 |
|------|------|
| 프로젝트 README | `README.md` |
| 코드 분석 보고서 | `docs/analysis-report.md` |
| 수동 작업 목록 | `docs/MANUAL_TASKS.md` |
| Stage 0~7 체크포인트 | `checkpoints/STAGE_*_COMPLETE.md` |
| 구현 계획서 | `checkpoints/STAGE_3_COMPLETE.md` |
| API 문서 (자동생성) | `http://localhost:8000/api/docs` |
