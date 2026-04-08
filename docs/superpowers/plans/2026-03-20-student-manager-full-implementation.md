# Student Manager Full Implementation Plan

**Goal:** Build a full-stack student grade & counseling management SaaS (FastAPI + React 18) following the Design Spec v2.0

**Architecture:** FastAPI backend with SQLAlchemy 2.0 ORM, PostgreSQL (Supabase), JWT auth. React 18 frontend with TypeScript, Tailwind CSS, Zustand, TanStack Query, Recharts. Multi-tenant isolation via `school_id` row-level filtering. Client-side file generation (SheetJS, jsPDF).

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, pytest / React 18, TypeScript, Vite, Tailwind CSS, Zustand, TanStack Query, Recharts

**Spec:** `docs/design-spec.md` (v2.0 확정)
**PRD:** `docs/prd.md` (v2.0 확정)

---

## Implementation Status — 2026-04-08

- [x] Backend: project scaffold, config, DB base, health route
- [x] Backend: all backend models + seed (auth support models included)
- [x] Backend: utils (bcrypt/JWT, 9-grade calc) + tests
- [x] Backend: auth dependencies, auth service + router (login/refresh/logout/me)
- [x] Backend: semesters, classes, subjects CRUD
- [x] Backend: users (student/parent create, list, deactivate)
- [x] Backend: grades CRUD + summary (bulk import handled via `/import/*`)
- [x] Backend: students detail/update, attendance, special notes
- [x] Backend: feedbacks CRUD (owner/visibility rules)
- [x] Backend: counselings CRUD + sharing + filters
- [x] Backend: notifications (list/mark-read/read-all, preferences) + side-effects
- [x] Backend: CSV/XLSX imports (students, grades)
- [x] Security: rate limit on `/auth/login` (5/min), JSON 429 handler
- [x] Security: cross-school isolation tests
- [x] Frontend: Vite+React+TS+Tailwind scaffold, axios client with refresh interceptor
- [x] Frontend: Zustand auth store, `ProtectedRoute`, layout (`Sidebar`, `Header`)
- [x] Frontend: `LoginPage`
- [x] Frontend: API modules/hooks — Semesters, Classes/Subjects, Users/Students, Grades, Notifications, Feedback, Counseling
- [x] Frontend: pages — Student List, Student Detail, Grades (autosave grid), Notifications
- [x] Frontend: pages — Dashboard, Feedback, Counseling, Grades radar chart, Student/Parent home dashboards
- [x] Frontend: export (Excel/PDF), responsive polish
- [x] Tests: backend unit tests passing locally (85/85 on Python 3.12)
- [x] QA: backend lint/test + frontend typecheck passing locally
- [ ] QA: integration/e2e coverage target >= 80%
- [x] Infra: backend Dockerfile + docker-compose (db/backend/frontend) for local run
- [x] Docs: README Quick Start updated (Compose, Docker backend + local FE)
- [x] Docs: PRD delta section added (MVP vs. PRD differences)
- [x] Build: Vite plugin-less config to allow TSX build without devDeps

**Notes**
- Runtime: recommend Python 3.11/3.12. `bcrypt` pinned (4.2.0) for `passlib` compatibility.
- Security: ownership checks enforced across services; cross-school isolation tests are now present.
- Local run: `docker compose up --build` brings up Postgres, backend (FastAPI), and frontend (Vite dev) with proxy.
- Frontend build: `@vitejs/plugin-react` omitted to support restricted envs; re-enable in dev when available for HMR.
- API shapes (MVP): list endpoints currently return arrays; pagination is intentionally deferred for MVP.
- Auth errors: business errors use `{ detail, code }`.
- Semesters list: now available to any authenticated user.

---

## 2026-03-26 Update

- Frontend layout: responsive sidebar (mobile overlay + header toggle), dashboard polished with stats and quick links.
- Radar chart: fixed 0–100 scale via `PolarRadiusAxis`; added chart tab on Grades page.
- Export: added `utils/exportHelpers.ts` with Excel/PDF exports; wired buttons on Grades and Student List pages.
- Performance: code-split `xlsx` and `jspdf` via dynamic import to reduce initial bundle size.
- Feedback/Counseling: completed pages with create/update/delete flows using query hooks.
- Infra: added backend `Dockerfile` and `docker-compose.yml` (Postgres + backend + frontend dev); README Quick Start updated.
- Build: simplified Vite config (no plugin) to allow TSX build in restricted environments.

## 2026-03-30 Update

- Grades UX: added live total/average summary cards on `GradesPage` so teacher edits immediately reflect PRD MVP expectations.
- Validation: added inline out-of-range score errors (`0~100`) in `GradeTable` while preserving explicit save flow.
- Radar chart: added teacher-side previous-semester compare mode on `GradesPage`.
- Export: added radar chart PNG export helper and wired PNG export on teacher/student/parent chart views.
- Verification prep: added focused frontend tests for grade validation, live summary, compare mode, and export wiring.
- Counseling: expanded teacher-side shared counseling search with student/teacher/date filters and related notification deep links.
- Notifications: wired real side-effects for grades, feedbacks, and counseling plus teacher preference controls and related-screen routing.
- Students: added browser-verified CSV import/export flow for student bulk management.
- PRD verification: added end-to-end `frontend/e2e/prd-user-stories.spec.ts` and validated all User Stories against the live app.
- US-005: removed student/parent dashboard feedback 5-item cap, added role-based route protection, added `/my/*` backend regression tests, and added mobile Playwright verification for student/parent read-only views.

## 2026-04-02 Update

- Auth contract: locked access-token-in-memory + refresh-cookie flow and normalized auth guard errors to `{ detail, code }`.
- Auth lifecycle: aligned access token expiry to 60 minutes, refresh token expiry to 7 days, and standardized refresh cookie settings.
- Onboarding: replaced placeholder signup with invite-based activation for student/parent accounts and added password recovery/reset flows.
- Student onboarding: teacher-side student create flow now captures real email addresses and returns invite links; placeholder student accounts are removed.
- Reporting: expanded grade analysis cards and added counseling PDF export on the frontend.
- Imports: aligned CSV/XLSX contracts with onboarding/reporting expectations, including grade CSV upsert behavior by `student_number + subject_name`.
- Ops/QA: replaced runtime migration autogeneration with deterministic `alembic upgrade head`, added `docker-entrypoint.sh`, a reusable QA gate script, and GitHub Actions CI.

---

## Current Gaps

- QA: add integration/e2e coverage and prove the coverage target >= 80%.
- API contract: decide whether list endpoints should stay array-based for MVP or move back to `{ total, items }` pagination.
- Bulk grades: decide whether `POST /grades/bulk` is still worth adding, or whether `/import/grades` and `/import/grades/xlsx` are the supported bulk path.
- Optional UX: final accessibility pass and any small responsive polish that turns up in manual review.

---

## File Structure

### Backend

```
backend/
├── app/
│   ├── main.py                        # FastAPI app, CORS, router includes
│   ├── config.py                      # Settings via pydantic-settings
│   ├── database.py                    # async engine, sessionmaker, Base
│   ├── dependencies/
│   │   ├── auth.py                    # get_current_user, require_role, require_teacher_of_student
│   │   └── db.py                      # get_db async generator
│   ├── models/
│   │   ├── school.py, user.py, class_.py, student.py, parent_student.py
│   │   ├── subject.py, semester.py, grade.py, attendance.py, special_note.py
│   │   ├── feedback.py, counseling.py, notification.py, notification_preference.py
│   ├── schemas/
│   │   ├── auth.py, user.py, class_.py, semester.py, subject.py, grade.py
│   │   ├── student.py, attendance.py, special_note.py, feedback.py
│   │   ├── counseling.py, notification.py, common.py
│   ├── routers/
│   │   ├── auth.py, users.py, semesters.py, classes.py, grades.py
│   │   ├── students.py, feedbacks.py, counselings.py, notifications.py, imports.py
│   ├── services/
│   │   ├── auth.py, user.py, grade.py, student.py, feedback.py
│   │   ├── counseling.py, notification.py, import_.py
│   └── utils/
│       ├── grade_calculator.py        # calculate_grade(score) -> rank
│       └── security.py                # hash_password, verify_password, create_jwt, decode_jwt
├── alembic/
│   └── versions/                      # migration files
├── seed.py                            # Alembic seed script (School + Teacher)
├── requirements.txt
├── pyproject.toml
└── tests/
    ├── conftest.py                    # test DB, client fixture, auth helpers
    ├── test_auth.py, test_users.py, test_semesters.py, test_classes.py
    ├── test_grades.py, test_students.py, test_feedbacks.py
    ├── test_counselings.py, test_notifications.py, test_imports.py
```

### Frontend

```
frontend/
├── src/
│   ├── App.tsx                        # Router, QueryClient, global providers
│   ├── api/
│   │   ├── client.ts                  # axios instance, interceptors (refresh token)
│   │   ├── auth.ts, semesters.ts, classes.ts, subjects.ts, users.ts
│   │   ├── grades.ts, students.ts, feedbacks.ts, counselings.ts, notifications.ts
│   ├── components/
│   │   ├── ui/                        # Button, Input, Select, Modal, Toast, Badge
│   │   ├── layout/                    # AppLayout, Sidebar, Header
│   │   ├── auth/                      # LoginForm, ProtectedRoute
│   │   ├── grades/                    # GradeTable, GradeSummary, RadarChart
│   │   ├── students/                  # StudentList, StudentDetail, AttendanceForm, SpecialNoteForm
│   │   ├── feedbacks/                 # FeedbackForm, FeedbackList
│   │   ├── counselings/               # CounselingForm, CounselingList
│   │   └── notifications/             # NotificationBell, NotificationList
│   ├── hooks/
│   │   ├── useAuth.ts, useGrades.ts, useStudents.ts
│   │   ├── useFeedbacks.ts, useCounselings.ts, useNotifications.ts
│   ├── stores/
│   │   ├── authStore.ts               # access_token, user info, role
│   │   └── notificationStore.ts       # unread_count
│   ├── pages/
│   │   ├── LoginPage.tsx, DashboardPage.tsx, SetupPage.tsx
│   │   ├── StudentListPage.tsx, StudentDetailPage.tsx, GradesPage.tsx
│   │   ├── FeedbackPage.tsx, CounselingPage.tsx, NotificationsPage.tsx
│   ├── utils/
│   │   ├── gradeCalculator.ts
│   │   └── exportHelpers.ts           # Excel/PDF export helpers
│   └── types/
│       └── index.ts                   # shared TypeScript interfaces
├── package.json, tsconfig.json, tailwind.config.ts, vite.config.ts
└── index.html
```

---

## Summary: Sprint → Task Mapping

| Sprint | Tasks | PRD Requirements |
|--------|-------|-----------------|
| S0 (Week 1-2) | Task 1-6 | Project setup, DB models, auth infra, notification stub |
| S1 (Week 3-4) | Task 7-15 | REQ-001~004, 010, 011, 012(proto) |
| S2 (Week 5-6) | Task 16-19 | REQ-012(완성), 015, 020~022 |
| S3 (Week 7-8) | Task 20-21 | REQ-030~032 |
| S4 (Week 9-10) | Task 22-24 | REQ-033, 040~042, 050, 051 |
| S5 (Week 11-12) | Task 25-29 | REQ-014, 023, 060, QA |

**Total: 29 tasks, ~150 steps**

### Reviewer Issues Addressed

| Issue | Fix |
|-------|-----|
| Error response format (`{ detail, code }`) | `AppException` custom handler, used everywhere instead of `HTTPException` |
| Notification service dependency cycle | Stub created early, router/remaining methods added later |
| Missing `auth_client_teacher` fixture | Defined in conftest alongside `seed_teacher`, `seed_inactive_user` |
| `api/client.ts` circular import | Replaced with lazy `await import()` pattern |
| `/auth/refresh` doesn't check `is_active` | Added DB lookup in refresh endpoint |
