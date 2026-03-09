# 수동 작업 목록

## 필수 (서버 실행 전)

### 1. MySQL 데이터베이스 준비
```bash
# MySQL이 이미 있다면 스킵, 없다면 Docker로 실행
docker run -d --name kospi-mysql \
  -e MYSQL_ROOT_PASSWORD=<비밀번호> \
  -e MYSQL_DATABASE=kospi200 \
  -p 3306:3306 mysql:8.0
```

기존 `before/` 데이터가 이미 MySQL에 있다면 별도 작업 불필요.
테이블은 앱 시작 시 자동 생성됨 (ORM 매핑 테이블만).

### 2. .env 파일 생성
```bash
cd src/backend
cp .env.example .env
```

**반드시 수정할 항목:**

| 변수 | 할 일 |
|------|-------|
| `DB_PASSWORD` | MySQL 비밀번호 입력 |
| `JWT_SECRET` | 랜덤 문자열 생성 (`openssl rand -hex 32`) |

### 3. ticker_name_mapping.json 배치

현재 `before/ui/dashboard/ticker_name_mapping.json`에 있는 파일을 복사.

```bash
cp before/ui/dashboard/ticker_name_mapping.json src/backend/ticker_name_mapping.json
```

또는 `.env`에서 경로 직접 지정:
```
TICKER_NAME_MAPPING_PATH=../../before/ui/dashboard/ticker_name_mapping.json
```

### 4. 관리자 계정 생성
```bash
cd src/backend
python seed_admin.py <사용자명> <비밀번호>
```

## 필수 (내가 대신 할 수 있는 작업)

### 5. 파이프라인 연결 (wrapper.py)

`app/pipeline/wrapper.py`의 placeholder 함수를 `before/` 실제 코드로 연결해야 함.
현재 `_run_collect_sync()`와 `_run_predict_sync()`가 `time.sleep(2)`만 실행.

> 이 작업은 "파이프라인 연결해줘"라고 요청하면 내가 처리 가능.

## 선택 (외부 공개 시)

### 6. HTTPS + 리버스 프록시

외부 공개 서비스이므로 SSL 필수. nginx 예시:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7. 도메인/서버

- 서버(VPS 등) 준비
- 도메인 연결
- 방화벽 설정 (80, 443 포트)

## 체크리스트

```
[ ] MySQL 준비 또는 기존 DB 확인
[ ] .env 파일 생성 및 비밀값 입력
[ ] ticker_name_mapping.json 복사
[ ] 관리자 계정 생성
[ ] 파이프라인 연결 (나에게 요청 가능)
[ ] HTTPS 설정 (외부 공개 시)
```
