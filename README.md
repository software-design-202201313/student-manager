# Student Manager

학생 성적·상담 통합 관리 웹앱

## Quick Start

### 1) Docker Compose (추천)

레포 루트에서 다음을 실행합니다.

```bash
docker compose up --build
```

- 접속: FE `http://localhost:5173`, BE `http://localhost:8000`, Swagger `http://localhost:8000/docs`
- 기본 계정: `teacher@example.com` / `password123`
 - 최초 실행 시 Alembic가 자동으로 초기 마이그레이션을 생성/적용합니다(`alembic/versions`가 비어있는 경우).

마이그레이션 & 시드 동작:
- Alembic은 `DATABASE_URL`(async 드라이버 제거 후 sync로 변환)로 연결하여 마이그레이션을 실행합니다.
- 컨테이너 시작 시 `alembic/versions`가 비어있다면 `revision --autogenerate` 후 `upgrade head`를 수행합니다.
- 시드(`backend/seed.py`)는 기본적으로 테이블 생성을 건너뜁니다. 단, SQLite 사용 시 또는 `RUN_CREATE_ALL=1` 환경변수 설정 시에만 `Base.metadata.create_all`을 수행합니다.

### 2) Docker로 백엔드만 실행 + 로컬 프런트엔드

```bash
# Backend (Docker)
cd backend
docker build -t student-manager-backend .
docker run --rm -p 8000:8000 \
  -v $(pwd)/test.db:/app/test.db \
  -e ALLOWED_ORIGINS='["http://localhost:5173"]' \
  student-manager-backend

# Frontend (Vite dev)
cd ../frontend
npm install
npm run dev
```

주의: `ALLOWED_ORIGINS`는 JSON 문자열이어야 합니다. 예) `'["http://localhost:5173"]'`

Postgres 사용 시(선택):

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL='postgresql+asyncpg://user:pass@host:5432/student_manager' \
  -e RUN_CREATE_ALL=0 \
  -e ALLOWED_ORIGINS='["http://localhost:5173"]' \
  student-manager-backend

수동 Alembic 사용(예):
```bash
cd backend
# autogenerate 후 업그레이드
alembic revision --autogenerate -m "init_schema"
alembic upgrade head
```
```

## Docs

- PRD: `docs/prd.md`
- 구현 계획: `docs/superpowers/plans/2026-03-20-student-manager-full-implementation.md`
- 디자인 스펙: `docs/design-spec.md`

## MCP: Chrome DevTools

이 레포에는 MCP 클라이언트(예: Claude Desktop)에서 사용할 수 있는 Chrome DevTools MCP 서버가 개발 도구로 포함되어 있습니다. 실행은 프런트엔드 폴더에서 진행하세요:

```bash
cd frontend
npm run mcp:chrome           # 서버 실행(Chrome 인스턴스 관리)
npm run mcp:chrome:auto      # 로컬에서 실행 중인 Chrome(144+)에 자동 연결
npm run mcp:chrome:beta      # Beta 채널 Chrome 사용
```

참고:
- autoConnect를 사용하려면 Chrome에서 `chrome://inspect/#remote-debugging` 페이지에서 Remote Debugging을 활성화해야 합니다.
- 샌드박스나 CI 환경에서는 브라우저 실행이 제한될 수 있습니다. 로컬에서 실행하세요.

### MCP로 성적 관리 E2E 실행

사전 준비:
- Docker Compose로 백엔드/프런트엔드 실행: `docker compose up --build`
- 첫 실행 후 기본 계정 `teacher@example.com` / `password123`

실행:
```bash
# 1) MCP 서버는 스크립트가 자동으로 시작(headless)합니다.
# 2) E2E 스크립트 실행 (Chrome을 자동 제어)
node scripts/mcp-grade-e2e.mjs

# 완료 후 스크린샷 아티팩트:
#   frontend/e2e-artifacts/grades-chart.png
```

문제 해결:
- 로컬에서 Chrome 실행이 제한된 경우:
  - `cd frontend && npm run mcp:chrome:auto` 로 MCP 서버를 수동으로 띄운 뒤,
  - 다른 터미널에서 `node scripts/mcp-grade-e2e.mjs` 실행
- 포트/네트워크 이슈 시 `http://localhost:5173` 접근이 가능한지 확인
