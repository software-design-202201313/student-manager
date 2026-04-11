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

### 학생 초대 — 빠른 가이드

- 단건 초대(교사): 학생 목록 화면 상단의 `학생 초대` → 이름/이메일/번호 입력 → 생성 즉시
  - 제공 액션: `링크 복사`, `QR 보기`, `카카오/문자 공유용 텍스트 복사`
  - 학생 목록에 `초대 상태(대기/수락/만료)`와 빠른 액션(`재전송`, `링크 복사`, `만료 처리`) 노출
- 대량 초대(교사): `여러 명 초대` → CSV/XLSX 업로드 또는 엑셀 표 붙여넣기 → 행별 검증 → `유효한 학생만 생성`
  - 생성 완료 후 `초대 링크 일괄 복사` 제공
- 가입 수락(학생/학부모): `/signup?token=...`에서 초대 대상 정보 확인, 비밀번호 규칙(8자 이상 등) 실시간 안내 후 수락 시 자동 로그인

관련 API(요약):

- `POST /users/students` — 학생 초대 생성 (teacher)
- `GET /users/students` — 목록 + 초대 요약(이메일/계정상태/초대상태/만료시각/재전송횟수)
- `POST /users/students/{id}/invitation/resend` — 초대 재전송 (teacher)
- `POST /users/students/{id}/invitation/expire` — 초대 만료 처리 (teacher)
- `GET /auth/invitations/{token}` — 초대 미리보기
- `POST /auth/invitations/accept` — 초대 수락(비밀번호 설정)

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

## CD (Production Deploy)

이 저장소는 `CI 성공 -> CD 배포` 흐름을 사용합니다.

- CD 워크플로 파일: `.github/workflows/cd.yml`
- 자동 배포 트리거: `CI` 워크플로가 `main/master`에서 성공 종료될 때
- 수동 배포 트리거: GitHub Actions `CD`의 `workflow_dispatch` (staging/production 선택 가능)

기본 배포 대상:

- frontend: Vercel
- backend: Render
- db: Supabase (외부 managed DB)

필수 GitHub Secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `RENDER_DEPLOY_HOOK_URL` (권장)  
  Render Deploy Hook이 없으면 아래 2개를 대신 사용:
  `RENDER_API_KEY`, `RENDER_SERVICE_ID`
- `BACKEND_HEALTHCHECK_URL` (권장, 예: `https://<backend>/ready`)
- `FRONTEND_HEALTHCHECK_URL` (선택)

권장 설정:

- GitHub Environment: `production` (+ 필요 시 `staging`)
- `production`에 required reviewers 설정

## Docs

- PRD: `docs/prd.md`
- 디자인 스펙: `docs/design-spec.md`
- 구현 계획: `docs/superpowers/plans/2026-03-20-student-manager-full-implementation.md`
