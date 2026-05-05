# Codemap: Student Manager

**Last Updated**: 2026-05-05
**Tech Stack**: Python 3.12 / FastAPI + PostgreSQL + Kafka (backend) · React 18 / Vite / TypeScript + TailwindCSS (frontend)
**Purpose**: SaaS for managing student grades, counseling records, attendance, and parent/student notifications.

---

## Quick Navigation

| Category | Key Files | Description |
|----------|-----------|-------------|
| Entry (BE) | `backend/app/main.py` | FastAPI app, CORS, routers, exception handlers |
| Entry (FE) | `frontend/src/main.tsx`, `frontend/src/App.tsx` | React entry, route tree |
| Config | `backend/app/config.py`, `backend/.env.example` | Pydantic settings, env vars |
| API Routers | `backend/app/routers/` | One file per domain endpoint |
| Services | `backend/app/services/` | Business logic layer |
| Workers | `backend/app/workers/` | Background processes (outbox-publisher) |
| Models (ORM) | `backend/app/models/` | SQLAlchemy models |
| Schemas | `backend/app/schemas/` | Pydantic request/response models |
| DB Migrations | `backend/alembic/versions/` | 5 migration files (0001–0005) |
| Frontend API | `frontend/src/api/` | Axios API client modules |
| Pages | `frontend/src/pages/` | Route-level React components |
| Components | `frontend/src/components/` | Reusable UI components |
| Stores | `frontend/src/stores/authStore.ts` | Zustand auth state |
| Hooks | `frontend/src/hooks/` | Custom React hooks for data fetching |
| Tests (BE) | `backend/tests/` | pytest async tests |
| Tests (FE) | `frontend/src/__tests__/` | Vitest unit tests |
| E2E | `frontend/e2e/` | Playwright specs |
| Infra | `docker-compose.yml`, `render.yaml` | Local dev stack + Render deploy config |
| Docs | `docs/` | PRD, design spec, ADRs, architecture |

---

## Directory Structure

```
student-manager/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app, CORS, routers
│   │   ├── config.py                  # Pydantic settings (env-based)
│   │   ├── database.py                # SQLAlchemy async engine + session
│   │   ├── errors.py                  # AppException(status, detail, code)
│   │   ├── ratelimit.py               # slowapi rate limiter setup
│   │   ├── dependencies/
│   │   │   ├── auth.py                # get_current_user, role checks
│   │   │   └── db.py                  # get_db dependency
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── user.py                # User (teacher/student/parent roles)
│   │   │   ├── school.py              # School tenant model
│   │   │   ├── student.py             # Student profile
│   │   │   ├── class_.py              # Classroom
│   │   │   ├── grade.py               # Grade record
│   │   │   ├── attendance.py          # Attendance record
│   │   │   ├── counseling.py          # Counseling session
│   │   │   ├── feedback.py            # Teacher feedback
│   │   │   ├── notification.py        # Notification entity
│   │   │   ├── notification_preference.py
│   │   │   ├── semester.py            # Academic semester
│   │   │   ├── subject.py             # Subject/course
│   │   │   ├── special_note.py        # Special student notes
│   │   │   ├── parent_student.py      # Parent↔student relationship
│   │   │   ├── user_invitation.py     # Pending invitations
│   │   │   ├── password_reset_token.py
│   │   │   └── outbox.py               # Transactional outbox (CDC, ADR-002)
│   │   ├── schemas/                   # Pydantic request/response models
│   │   │   ├── auth.py, user.py, student.py, grade.py
│   │   │   ├── counseling.py, feedback.py, notification.py
│   │   │   ├── attendance.py, semester.py, subject.py, class_.py
│   │   │   ├── special_note.py, common.py
│   │   ├── routers/                   # Thin route handlers → delegate to services
│   │   │   ├── auth.py                # /auth (login, refresh, logout, password-reset)
│   │   │   ├── users.py               # /users (teacher CRUD, invitations)
│   │   │   ├── students.py            # /students (CRUD, parent link)
│   │   │   ├── grades.py              # /grades
│   │   │   ├── counselings.py         # /counselings
│   │   │   ├── feedbacks.py           # /feedbacks
│   │   │   ├── notifications.py       # /notifications
│   │   │   ├── classes.py             # /classes
│   │   │   ├── semesters.py           # /semesters
│   │   │   ├── imports.py             # /imports (CSV/Excel student import)
│   │   │   └── my.py                  # /my (current user profile + child grades)
│   │   ├── services/                  # Business logic
│   │   │   ├── auth.py                # JWT create/verify, login, refresh
│   │   │   ├── auth_delivery.py       # Email/stub delivery (AUTH_LINK_DELIVERY)
│   │   │   ├── user.py                # User management, invitation flow
│   │   │   ├── student.py             # Student operations
│   │   │   ├── grade.py               # Grade calculations
│   │   │   ├── counseling.py          # Counseling CRUD
│   │   │   ├── feedback.py            # Feedback CRUD
│   │   │   ├── notification.py        # Notification fanout
│   │   │   ├── import_.py             # CSV/Excel parsing + bulk create
│   │   │   ├── my.py                  # Current user summary
│   │   │   └── outbox.py               # fetch_unsent / mark_sent helpers
│   │   ├── workers/                    # Long-running background processes
│   │   │   └── outbox_publisher.py    # Kafka producer for outbox CDC
│   │   └── utils/
│   │       ├── grade_calculator.py    # GPA / grade statistics
│   │       └── security.py            # bcrypt helpers
│   ├── alembic/
│   │   └── versions/
│   │       ├── 0001_initial.py        # Core schema
│   │       ├── 0002_student_fields.py # Extended student profile
│   │       ├── 0003_auth_onboarding_tokens.py
│   │       ├── 0004_analytics_schema.py  # analytics.* schema + 5 tables (postgres-only)
│   │       └── 0005_outbox_table.py   # public.outbox + partial unsent index
│   ├── tests/                         # pytest async integration tests
│   │   ├── conftest.py                # TestClient, DB fixtures, seed users
│   │   ├── test_auth.py, test_auth_delivery.py
│   │   ├── test_students.py, test_student_create.py
│   │   ├── test_grades.py, test_counselings.py, test_feedbacks.py
│   │   ├── test_classes.py, test_semesters.py
│   │   ├── test_notifications.py, test_notification_messages.py
│   │   ├── test_notification_recipients.py
│   │   ├── test_imports.py, test_import_xlsx.py
│   │   ├── test_cross_school_isolation.py  # Multi-tenant security tests
│   │   ├── test_my.py, test_models.py, test_utils.py, test_health.py
│   │   ├── test_users.py
│   │   ├── test_analytics_migration.py  # postgres-only schema/PK assertions
│   │   ├── test_outbox_table.py         # postgres-only partial-index + JSONB
│   │   ├── test_grade_outbox.py         # grade UPSERT emits outbox row in same TX
│   │   └── test_outbox_publisher.py     # publisher drain + catch-up + retry
│   ├── seed.py                        # Dev seed data
│   └── pyproject.toml                 # Python project config + ruff/pytest settings
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                   # React root, QueryClient, Router setup
│   │   ├── App.tsx                    # Route tree, role-based layout switching
│   │   ├── api/                       # Axios API modules (one per domain)
│   │   │   ├── client.ts              # Axios instance, interceptors, token refresh
│   │   │   ├── auth.ts, users.ts, students.ts, grades.ts
│   │   │   ├── counselings.ts, feedbacks.ts, notifications.ts
│   │   │   ├── classes.ts, semesters.ts, imports.ts, my.ts
│   │   ├── pages/                     # Route-level components (lazy loaded)
│   │   │   ├── LandingPage.tsx        # Public landing
│   │   │   ├── LoginPage.tsx, SignupPage.tsx, ForgotPasswordPage.tsx
│   │   │   ├── DashboardPage.tsx      # Teacher dashboard
│   │   │   ├── StudentListPage.tsx    # Teacher student list
│   │   │   ├── StudentDetailPage.tsx  # Student profile + tabs
│   │   │   ├── GradesPage.tsx         # Grade entry/view
│   │   │   ├── FeedbackPage.tsx       # Feedback history
│   │   │   ├── CounselingPage.tsx     # Counseling records
│   │   │   ├── NotificationsPage.tsx  # Notifications (all roles)
│   │   │   ├── StudentHomePage.tsx    # Student role dashboard
│   │   │   ├── ParentHomePage.tsx     # Parent role dashboard
│   │   │   └── RootIndex.tsx          # Role-based redirect
│   │   ├── components/
│   │   │   ├── auth/ProtectedRoute.tsx        # Role-gated route wrapper
│   │   │   ├── layout/AppLayout.tsx           # Teacher sidebar layout
│   │   │   ├── layout/SimpleLayout.tsx        # Student/parent minimal layout
│   │   │   ├── layout/Header.tsx, Sidebar.tsx
│   │   │   ├── students/                      # Student-related components
│   │   │   │   ├── StudentCreateForm.tsx
│   │   │   │   ├── StudentList.tsx, StudentDetail.tsx, StudentEditModal.tsx
│   │   │   │   ├── StudentGradeModal.tsx
│   │   │   │   ├── BulkInviteModal.tsx, InviteQrModal.tsx
│   │   │   │   ├── InvitationStatusBadge.tsx
│   │   │   │   ├── ExcelUploadModal.tsx
│   │   │   │   ├── AttendanceForm.tsx, SpecialNoteForm.tsx
│   │   │   ├── grades/
│   │   │   │   ├── GradeTable.tsx, GradeExcelUploadModal.tsx, RadarChart.tsx
│   │   │   ├── classes/ClassCreateModal.tsx, ClassSelector.tsx
│   │   │   ├── counselings/CounselingDetailModal.tsx
│   │   │   ├── feedbacks/FeedbackHistoryModal.tsx
│   │   │   ├── notifications/NotificationBell.tsx
│   │   │   └── ui/StudentSelector.tsx
│   │   ├── hooks/                     # Custom hooks (TanStack Query wrappers)
│   │   │   ├── useStudents.ts, useStudent.ts
│   │   │   ├── useGrades.ts, useCounselings.ts
│   │   │   ├── useFeedbacks.ts, useImport.ts
│   │   ├── stores/authStore.ts        # Zustand: user, token, school_id
│   │   ├── types/index.ts             # Shared TypeScript interfaces
│   │   └── utils/
│   │       ├── exportHelpers.ts       # Excel/PDF export (client-side)
│   │       ├── gradeCalculator.ts, gradeSummary.ts
│   │       ├── bulkInviteParser.ts, inviteShareText.ts, clipboard.ts
│   ├── e2e/                           # Playwright E2E specs
│   │   ├── smoke.spec.ts, landing-login-grade.spec.ts
│   │   ├── grades.spec.ts, feedback-create.spec.ts
│   │   ├── class-delete.spec.ts, class-delete-with-data.spec.ts
│   │   ├── student-parent-mobile.spec.ts
│   │   ├── prd-user-stories.spec.ts
│   │   └── helpers.ts                 # Shared E2E helpers
│   └── src/__tests__/                 # Vitest unit tests
│       ├── api/counselings.test.ts
│       ├── components/ (BulkInviteModal, GradeTable, ProtectedRoute, etc.)
│       └── pages/ (GradesPage, NotificationsPage, SignupPage, etc.)
│
├── docs/
│   ├── prd.md                         # Product requirements
│   ├── design-spec.md                 # API + data model spec
│   ├── architecture.md                # System architecture v1.1
│   ├── decisions/
│   │   ├── 001-olap-and-infra-roadmap.md
│   │   └── 002-cdc-pattern-outbox-kafka.md  # ADR: Outbox + Kafka KRaft
│   └── notes/2026-05-03-v2.1-architecture-grill.md
│
├── scripts/
│   └── kafka_smoke.py                 # Kafka KRaft round-trip smoke test
│
├── docker-compose.yml                 # Local dev: postgres + kafka + backend + frontend
├── render.yaml                        # Render.com deployment config
├── CLAUDE.md                          # Project AI coding rules
└── AGENTS.md                          # Multi-agent setup
```

---

## Key Dependencies

### Backend (Python 3.12)
| Package | Purpose |
|---------|---------|
| fastapi | Web framework |
| sqlalchemy + asyncpg | Async PostgreSQL ORM |
| alembic | DB migrations |
| aiokafka | Kafka producer/consumer for outbox CDC |
| pydantic-settings | Env-based config |
| python-jose / passlib | JWT + bcrypt |
| slowapi | Rate limiting |
| aiosqlite | SQLite for tests |
| psycopg2-binary | Sync postgres for migration tests |
| pytest-asyncio | Async test runner |

### Frontend (Node 20 / TypeScript)
| Package | Purpose |
|---------|---------|
| react 18 + react-router-dom 7 | SPA framework + routing |
| @tanstack/react-query 5 | Server state management |
| zustand | Client auth state |
| axios | HTTP client |
| tailwindcss | Utility CSS |
| recharts | Grade charts |
| xlsx | Excel import/export |
| jspdf | PDF export (client-side) |
| vitest + @testing-library/react | Unit tests |
| @playwright/test | E2E tests |

---

## Architecture Patterns

- **Layered (Backend)**: Routers (thin) → Services (business logic) → Models (SQLAlchemy ORM)
- **Multi-tenant isolation**: Every query scoped by `school_id` via JWT claims; `test_cross_school_isolation.py` guards this
- **Auth**: JWT access token (1h, Bearer) + refresh token (7d, HttpOnly cookie); `AUTH_LINK_DELIVERY=stub` in dev
- **Error contract**: All business errors via `AppException` → `{ detail, code }` JSON; no raw HTTPException
- **CDC / Async events**: Outbox + Kafka KRaft pattern (ADR-002). `services/grade.py` INSERTs outbox row in the same TX; `workers/outbox_publisher.py` polls + publishes to Kafka. Idempotency: on broker error mid-batch, the failed row stays unsent and the loop retries with exponential backoff
- **Client-side exports**: Excel (xlsx) and PDF (jspdf) generated in browser; no server file writes
- **Role routing**: `teacher` gets AppLayout; `student`/`parent` get SimpleLayout; `RootIndex` redirects by role

---

## Recent Changes

### 2026-05-05 (current — Sprint 1 in flight)
- **SMS-52 ✅** `app/workers/outbox_publisher.py` + `app/services/outbox.py` — aiokafka publisher with FakeProducer-friendly Protocol, idle poll, exponential backoff, catch-up on boot
- **SMS-51 ✅** `services/grade.py` emits outbox row in same TX as grade UPSERT (rolls back together on duplicate)
- **SMS-50 ✅** alembic 0005: `public.outbox` + `outbox_unsent_idx` partial index
- **SMS-49 ✅** alembic 0004: `analytics.*` schema + 5 tables (fact/dim/agg)
- **SMS-48 ✅** `scripts/kafka_smoke.py`: Kafka KRaft round-trip; ADR-002 R-1 closed
- **SMS-47 ✅** `docker-compose.yml`: Kafka KRaft single-node + healthcheck
- 6 epics + 3 sprints created on Jira board 2; Sprint 1 active (5/8 done; SMS-53/54 remaining)

### Earlier
- Design spec v2.1: replaced PostgreSQL LISTEN/NOTIFY with Outbox+Kafka pattern
- PRD v2.1: dropped EKS infra, simplified chatbot scope
- CLAUDE.md added with project-wide AI coding rules

---

## Known Issues / TODO

- E2E tests not written for: counseling flow, notification flow, import/export flow (`frontend/e2e/`)
- Frontend `npm test` hangs — excluded from `npm run qa` for now
- SMTP not connected: invitations and password resets run in stub mode (`AUTH_LINK_DELIVERY=stub`)
- Analytics consumer (SMS-53) not yet implemented — outbox rows are produced but no consumer drains the topics
- testcontainers e2e SLA test (SMS-54) pending — currently relies on unit-level FakeProducer assertions

---

## Common Tasks

| Task | Command / File |
|------|---------------|
| Run backend tests | `cd backend && pytest -x -q` |
| Run full QA | `npm run qa` (root) — ruff + pytest + tsc |
| Run E2E | `npm run e2e` (root) |
| Start local dev | `docker-compose up` |
| Run Kafka smoke | `python3 scripts/kafka_smoke.py` (requires sm-kafka container) |
| Run outbox publisher locally | `cd backend && python -m app.workers.outbox_publisher` |
| Add migration | `cd backend && alembic revision --autogenerate -m "description"` |
| Add backend route | Create in `routers/`, register in `main.py` |
| Add frontend page | Create in `frontend/src/pages/`, add lazy route in `App.tsx` |

---

**Navigation Tips**:
- Start with `backend/app/main.py` to see all registered routes
- Check `backend/app/dependencies/auth.py` for role enforcement logic
- See `frontend/src/api/client.py` for token refresh interceptor
- Review `backend/tests/test_cross_school_isolation.py` before any multi-tenant changes
