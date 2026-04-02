# Student Manager

학생 성적·상담 통합 관리 웹앱입니다. 현재 구현은 FastAPI 백엔드와 React/Vite 프런트엔드를 사용하며, 인증은 `access token(메모리)` + `refresh token(HttpOnly 쿠키)` 조합으로 동작합니다.

## Quick Start

### Docker Compose

```bash
docker compose up --build
```

- 프런트엔드: `http://localhost:5173`
- 백엔드: `http://localhost:18000`
- Swagger: `http://localhost:18000/docs`
- 기본 교사 계정: `teacher@example.com` / `password123`

기본 동작:

- 백엔드는 시작 시 `alembic upgrade head`만 수행합니다.
- 시드는 `RUN_SEED=1`일 때만 실행됩니다.
- 런타임에 마이그레이션을 자동 생성하지 않습니다.

### 로컬 검증

```bash
npm run qa
```

현재 QA 게이트:

- 백엔드 `ruff check app tests`
- 백엔드 `pytest`
- 프런트엔드 `tsc --noEmit`

## Auth / Onboarding

- 액세스 토큰은 브라우저 메모리에만 저장합니다.
- 리프레시 토큰은 `HttpOnly` 쿠키로 관리합니다.
- 회원가입은 공개 가입이 아니라 초대 기반입니다.
- 교사가 학생/학부모 계정을 만들면 초대 링크가 생성됩니다.
- 비밀번호 재설정은 링크 기반이며, 기본 설정에서는 스텁 링크를 바로 반환합니다.

주요 관련 환경 변수:

- `ACCESS_TOKEN_EXPIRE_MINUTES=60`
- `REFRESH_TOKEN_EXPIRE_DAYS=7`
- `INVITE_TOKEN_EXPIRE_HOURS=72`
- `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES=60`
- `APP_BASE_URL=http://localhost:5173`
- `AUTH_LINK_DELIVERY=stub`

`AUTH_LINK_DELIVERY=stub`는 개발용입니다. 운영에서는 실제 이메일 발송 어댑터로 교체하거나 최소한 서버 로그 전달 모드로 바꿔야 합니다.

## Import / Reporting

- 학생 CSV import: `name`, `email`, `student_number`, `birth_date`
- 학생 XLSX import: `이름`, `이메일`, `번호`, `생년월일`, `성별`, `연락처`, `주소`
- 성적 CSV import: `student_number`, `subject_name`, `score` + 쿼리 `class_id`, `semester_id`
- 성적 XLSX import: 첫 열 `번호`, 이후 과목명 열
- 상담 상세에서는 PDF 리포트 내보내기를 지원합니다.
- 성적 화면은 총점/평균/강점/보완 과목 분석을 제공합니다.

## CI

GitHub Actions 워크플로는 다음을 실행합니다.

- 백엔드 의존성 설치
- 프런트엔드 의존성 설치
- 백엔드 lint + test
- 프런트엔드 typecheck

워크플로 파일: `.github/workflows/ci.yml`

## Docs

- PRD: `docs/prd.md`
- 디자인 스펙: `docs/design-spec.md`
- 구현 계획: `docs/superpowers/plans/2026-03-20-student-manager-full-implementation.md`
