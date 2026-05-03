# Student Manager

FastAPI + React/Vite 학생 성적·상담 관리 SaaS. 문서: `docs/prd.md`, `docs/design-spec.md`

## Coding Rules

- Error contract: `AppException` only → `{ detail, code }` JSON (no plain HTTPException for business errors)
- Auth: JWT access 1h / refresh 7d (HttpOnly cookie); enforce `role + school_id` scope on every query
- TDD: failing test → implement → verify; keep diffs small; no new deps without request
- Imports/exports: CSV in (students, grades), Excel/PDF out on client; no server file writes
- Security: API p95 ≤ 500ms; bcrypt; no PII in logs; no localStorage for tokens

## QA

```bash
npm run qa           # ruff + pytest + tsc
npm run e2e          # playwright
```

## Git Workflow

작업 단위 완료 시 → `git add` → `git commit` → `git push` 자동 수행.

## Jira Workflow

**Project**: SMS | **Board**: 2 | **Credentials**: `~/.claude/mcp.json → mcpServers.jira.env`
**Transitions**: `11`=해야할일 / `21`=진행중 / `31`=완료

1. 작업 배정 시 → 액티브 스프린트에 이슈 생성 후 `진행 중`(21) 전환
2. 작업 완료 시 → 이슈 `완료`(31) 전환 → 남은 작업 현황 출력
3. 스프린트 전체 완료 시 → `POST /rest/agile/1.0/sprint/{id}` `{"state":"closed"}`

## 남은 작업

- E2E 테스트 미작성: 상담·알림·import/export 플로우 (`frontend/e2e/`)
- Frontend `npm test` hang 이슈 (현재 `qa`에서 제외)
- SMTP 미연결: 초대·비밀번호 재설정이 `stub` 모드 (`AUTH_LINK_DELIVERY=stub`)
