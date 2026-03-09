# 토큰 최적화 규칙

## 출력 규칙
- max 응답: 단순 보고 200토큰, 코드 생성 800토큰, 분석 500토큰
- 파일 내용 출력 시 변경된 부분 ±5줄만 표시
- 이전 체크포인트 내용은 경로 참조로 대체

## 컨텍스트 관리
- `/compact` 사용 시기: 대화 50턴 이상 또는 코드 생성 20회 이상
- 압축 시 보존할 것: 현재 STAGE 번호, 미완료 태스크, 최근 에러
- 불필요 컨텍스트: 완료된 이전 단계의 코드 diff

## 파일 참조 패턴
- 분석 결과 → `checkpoints/STAGE_1_COMPLETE.md` 참조
- 구현 계획 → `checkpoints/STAGE_3_COMPLETE.md` 참조
- API 목록 → `checkpoints/STAGE_4_COMPLETE.md` 참조
