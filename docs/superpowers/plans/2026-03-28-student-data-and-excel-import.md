# 학생 데이터 확장 및 엑셀 업로드/입력 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Student 모델에 필드를 확장하고, 학생/성적 데이터를 엑셀 업로드 또는 직접 입력 폼으로 등록할 수 있게 한다. 기본 과목 시드 데이터도 추가한다.

**Architecture:** 백엔드에서 Student 모델에 `gender`, `phone`, `address` 필드를 추가하고, 엑셀(.xlsx) 파싱을 위해 `openpyxl`을 도입한다. 기존 CSV import 서비스를 xlsx 지원으로 확장하고, 프론트엔드에 엑셀 업로드 UI와 개별 학생 등록 폼을 추가한다. 성적도 동일하게 엑셀 업로드 + 개별 입력을 지원한다.

**Tech Stack:** FastAPI, SQLAlchemy (async), Alembic, openpyxl, React 18, TanStack Query, Tailwind CSS

**Known Coexistence:** 기존 `POST /users/students` (이메일 기반, `schemas/user.py`의 `StudentCreate` 사용)는 그대로 유지한다. 새로 추가하는 개별 등록은 `POST /classes/{class_id}/students`로, 교사가 폼에서 직접 등록하는 용도이며 `schemas/student.py`의 `StudentDirectCreate`를 사용한다. 두 엔드포인트는 용도가 다르므로 공존한다.

---

## File Structure

### Backend — 수정 대상
| File | Responsibility |
|------|---------------|
| `backend/app/models/student.py` | Student 모델에 `gender`, `phone`, `address` 추가 |
| `backend/app/schemas/student.py` | `StudentDirectCreate` 스키마 추가, `StudentDetail`/`StudentUpdate` 확장 |
| `backend/app/services/import_.py` | xlsx 파싱 로직 추가, 엑셀 템플릿 생성 함수 추가. 기존 CSV 함수는 유지 |
| `backend/app/routers/imports.py` | xlsx 엔드포인트 + 템플릿 다운로드 엔드포인트 추가 |
| `backend/app/routers/classes.py` | `POST /{class_id}/students` 개별 등록 엔드포인트 추가 |
| `backend/app/services/student.py` | `create_student` 함수 추가, `update_student`에 새 필드 반영 |
| `backend/seed.py` | 기본 과목 시드 데이터 추가 (버그 수정: `__main__` 가드) |
| `backend/requirements.txt` | `openpyxl` 추가 |

### Backend — 신규
| File | Responsibility |
|------|---------------|
| `backend/alembic/versions/0002_student_fields.py` | gender, phone, address 컬럼 추가 마이그레이션 |
| `backend/tests/test_import_xlsx.py` | 엑셀 import 서비스 테스트 |
| `backend/tests/test_student_create.py` | 개별 학생 등록 API 테스트 |

### Frontend — 수정 대상
| File | Responsibility |
|------|---------------|
| `frontend/src/pages/StudentListPage.tsx` | 업로드 버튼, 학생 등록 버튼 추가 |
| `frontend/src/pages/GradesPage.tsx` | 성적 엑셀 업로드 버튼 추가 |
| `frontend/src/pages/StudentDetailPage.tsx` | 새 필드(성별, 연락처, 주소) 표시 |
| `frontend/src/types/index.ts` | `StudentDetail` 타입에 새 필드 반영 |
| `frontend/src/api/students.ts` | `createStudent` POST 함수 추가 |

### Frontend — 신규
| File | Responsibility |
|------|---------------|
| `frontend/src/components/students/StudentCreateForm.tsx` | 개별 학생 등록 모달/폼 |
| `frontend/src/components/students/ExcelUploadModal.tsx` | 학생 엑셀 업로드 모달 (에러 표시) |
| `frontend/src/components/grades/GradeExcelUploadModal.tsx` | 성적 엑셀 업로드 모달 |
| `frontend/src/api/imports.ts` | import API 호출 함수 |
| `frontend/src/hooks/useImport.ts` | 엑셀 업로드 mutation hook |

---

## Task 1: Student 모델 필드 확장 + 마이그레이션

**Files:**
- Modify: `backend/app/models/student.py`
- Modify: `backend/app/schemas/student.py`
- Create: `backend/alembic/versions/0002_student_fields.py`
- Modify: `backend/app/services/student.py`
- Modify: `backend/app/routers/students.py`
- Modify: `frontend/src/types/index.ts`

- [x] **Step 1: Student 모델에 필드 추가**

`backend/app/models/student.py`:
```python
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Student(Base):
    __tablename__ = "students"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    class_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("classes.id"))
    student_number: Mapped[int] = mapped_column(SmallInteger)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)  # male|female
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 학부모 연락처
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
```

- [x] **Step 2: 스키마 확장**

`backend/app/schemas/student.py` — `StudentDirectCreate` 추가 (기존 `schemas/user.py`의 `StudentCreate`와 이름 충돌 방지), 기존 스키마에 새 필드 반영:
```python
from datetime import date

from pydantic import BaseModel, Field


class StudentDirectCreate(BaseModel):
    """교사가 폼/엑셀에서 직접 학생을 등록할 때 사용. 이메일 불필요."""
    name: str = Field(min_length=1, max_length=100)
    student_number: int = Field(ge=1, le=100)
    birth_date: date | None = None
    gender: str | None = Field(default=None, pattern="^(male|female)$")
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)


class StudentUpdate(BaseModel):
    name: str | None = Field(default=None)
    student_number: int | None = Field(default=None, ge=1, le=100)
    birth_date: date | None = None
    gender: str | None = Field(default=None, pattern="^(male|female)$")
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=255)


class StudentDetail(BaseModel):
    id: str
    user_id: str
    class_id: str
    name: str
    student_number: int
    birth_date: date | None
    gender: str | None
    phone: str | None
    address: str | None
```

- [x] **Step 3: Alembic 마이그레이션 작성**

`backend/alembic/versions/0002_student_fields.py`:
```python
"""Add gender, phone, address to students"""
from alembic import op
import sqlalchemy as sa

revision = "0002_student_fields"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("gender", sa.String(10), nullable=True))
    op.add_column("students", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("students", sa.Column("address", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "address")
    op.drop_column("students", "phone")
    op.drop_column("students", "gender")
```

- [x] **Step 4: 서비스에 새 필드 반영**

`backend/app/services/student.py`의 `update_student`에 `gender`, `phone`, `address` 파라미터 추가:
```python
async def update_student(
    db: AsyncSession,
    *,
    student_id: uuid.UUID,
    teacher_id: uuid.UUID,
    name: str | None,
    student_number: int | None,
    birth_date: date | None,
    gender: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> tuple[Student, User]:
    student, user, _ = await _teacher_owns_student(db, student_id=student_id, teacher_id=teacher_id)
    if name is not None:
        user.name = name
    if student_number is not None:
        student.student_number = student_number
    if birth_date is not None:
        student.birth_date = birth_date
    if gender is not None:
        student.gender = gender
    if phone is not None:
        student.phone = phone
    if address is not None:
        student.address = address
    await db.commit()
    await db.refresh(student)
    await db.refresh(user)
    return student, user
```

- [x] **Step 5: 라우터에 새 필드 반영**

`backend/app/routers/students.py`의 모든 `StudentDetail` 응답 구성에 `gender`, `phone`, `address` 추가:
```python
return StudentDetail(
    id=str(student.id),
    user_id=str(user.id),
    class_id=str(student.class_id),
    name=user.name,
    student_number=student.student_number,
    birth_date=student.birth_date,
    gender=student.gender,
    phone=student.phone,
    address=student.address,
)
```

`update_student_endpoint`의 서비스 호출에도 새 필드 전달:
```python
student, user = await update_student(
    db,
    student_id=uuid.UUID(student_id),
    teacher_id=current_user.id,
    name=body.name,
    student_number=body.student_number,
    birth_date=body.birth_date,
    gender=body.gender,
    phone=body.phone,
    address=body.address,
)
```

- [x] **Step 6: 프론트엔드 타입 업데이트**

`frontend/src/types/index.ts`의 `StudentDetail` 인터페이스 확장:
```typescript
export interface StudentDetail extends StudentSummary {
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  address: string | null;
}
```

- [x] **Step 7: 테스트 실행**

```bash
cd backend && pytest tests/ -x -q
```

- [ ] **Step 8: Commit**

```bash
git add backend/app/models/student.py backend/app/schemas/student.py backend/alembic/versions/0002_student_fields.py backend/app/services/student.py backend/app/routers/students.py frontend/src/types/index.ts
git commit -m "feat(student): add gender, phone, address fields to Student model"
```

---

## Task 2: 개별 학생 등록 API (POST)

**Files:**
- Modify: `backend/app/routers/classes.py` — 새 엔드포인트 추가 (prefix가 `/classes`이므로 URL이 `/api/v1/classes/{class_id}/students`가 됨)
- Modify: `backend/app/services/student.py` — `create_student` 함수 추가
- Create: `backend/tests/test_student_create.py`

> **라우터 결정:** 기존 `classes.py`는 `prefix="/classes"`이므로 여기에 추가해야 URL이 `/api/v1/classes/{class_id}/students`가 된다. `students.py`(prefix="/students")에 넣으면 `/api/v1/students/classes/{class_id}/students`가 되어 잘못된 URL이 됨.

- [x] **Step 1: 실패하는 테스트 작성**

`backend/tests/test_student_create.py` — 기존 conftest.py의 실제 fixture 사용 (`auth_client_teacher`, `seed_teacher`, `seed_school`):
```python
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import async_session_test
from app.models.class_ import Class


@pytest.fixture
async def seed_class(seed_teacher, seed_school) -> Class:
    """테스트용 반 생성"""
    async with async_session_test() as session:
        cls = Class(
            school_id=seed_school.id,
            name="1반",
            grade=1,
            year=2026,
            teacher_id=seed_teacher.id,
        )
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
        return cls


@pytest.mark.asyncio
async def test_create_student_returns_201(auth_client_teacher: AsyncClient, seed_class: Class):
    resp = await auth_client_teacher.post(
        f"/api/v1/classes/{seed_class.id}/students",
        json={
            "name": "김철수",
            "student_number": 1,
            "gender": "male",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "김철수"
    assert data["student_number"] == 1
    assert data["gender"] == "male"


@pytest.mark.asyncio
async def test_create_student_duplicate_number_returns_409(auth_client_teacher: AsyncClient, seed_class: Class):
    body = {"name": "이영희", "student_number": 99}
    await auth_client_teacher.post(f"/api/v1/classes/{seed_class.id}/students", json=body)
    resp = await auth_client_teacher.post(f"/api/v1/classes/{seed_class.id}/students", json=body)
    assert resp.status_code == 409
```

- [x] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd backend && pytest tests/test_student_create.py -x -v
```
Expected: FAIL (엔드포인트 미존재)

- [x] **Step 3: 서비스 함수 구현**

`backend/app/services/student.py`에 `create_student` 추가:
```python
async def create_student(
    db: AsyncSession,
    *,
    class_id: uuid.UUID,
    teacher_id: uuid.UUID,
    school_id: uuid.UUID,
    name: str,
    student_number: int,
    birth_date: date | None = None,
    gender: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> tuple[Student, User]:
    # 반 소유권 확인
    result = await db.execute(select(Class).where(Class.id == class_id))
    cls = result.scalar_one_or_none()
    if cls is None:
        raise AppException(404, "Class not found", "CLASS_NOT_FOUND")
    if cls.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    if cls.school_id != school_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    # User 생성 (placeholder email, 학생 직접 로그인 불필요)
    from app.utils.security import hash_password
    email = f"student-{uuid.uuid4().hex[:8]}@placeholder.local"
    user = User(
        school_id=school_id,
        email=email,
        hashed_password=hash_password("placeholder"),
        role="student",
        name=name,
    )
    db.add(user)
    await db.flush()

    student = Student(
        user_id=user.id,
        class_id=class_id,
        student_number=student_number,
        birth_date=birth_date,
        gender=gender,
        phone=phone,
        address=address,
    )
    db.add(student)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise AppException(409, "해당 번호의 학생이 이미 존재합니다.", "STUDENT_DUPLICATE_NUMBER")
    await db.refresh(student)
    await db.refresh(user)
    return student, user
```

- [x] **Step 4: classes 라우터에 엔드포인트 추가**

`backend/app/routers/classes.py`에 추가:
```python
from app.schemas.student import StudentDirectCreate, StudentDetail
from app.services.student import create_student


@router.post("/{class_id}/students", response_model=StudentDetail, status_code=status.HTTP_201_CREATED)
async def create_student_endpoint(
    class_id: str,
    body: StudentDirectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user = await create_student(
        db,
        class_id=uuid.UUID(class_id),
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        name=body.name,
        student_number=body.student_number,
        birth_date=body.birth_date,
        gender=body.gender,
        phone=body.phone,
        address=body.address,
    )
    return StudentDetail(
        id=str(student.id),
        user_id=str(user.id),
        class_id=str(student.class_id),
        name=user.name,
        student_number=student.student_number,
        birth_date=student.birth_date,
        gender=student.gender,
        phone=student.phone,
        address=student.address,
    )
```

- [x] **Step 5: 테스트 통과 확인**

```bash
cd backend && pytest tests/test_student_create.py -x -v
```
Expected: PASS

- [x] **Step 6: Commit**

```bash
git add backend/app/services/student.py backend/app/routers/classes.py backend/tests/test_student_create.py
git commit -m "feat(student): add individual student creation endpoint POST /classes/{class_id}/students"
```

---

## Task 3: 엑셀 파싱으로 Import 서비스 확장

**Files:**
- Modify: `backend/requirements.txt` — `openpyxl` 추가
- Modify: `backend/app/services/import_.py` — xlsx 파싱 함수 추가 (기존 CSV 함수 유지)
- Modify: `backend/app/routers/imports.py` — xlsx 엔드포인트 + 템플릿 다운로드 추가
- Create: `backend/tests/test_import_xlsx.py`

- [x] **Step 1: openpyxl 의존성 추가**

`backend/requirements.txt`에 추가:
```
openpyxl==3.1.5
```

```bash
cd backend && pip install openpyxl==3.1.5
```

- [x] **Step 2: 실패하는 테스트 작성**

`backend/tests/test_import_xlsx.py` — conftest.py의 실제 fixture 사용:
```python
import io

import pytest
from openpyxl import Workbook
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models.class_ import Class


def make_student_xlsx(rows: list[list]) -> bytes:
    """테스트용 학생 엑셀 파일 생성"""
    wb = Workbook()
    ws = wb.active
    ws.append(["이름", "번호", "생년월일", "성별", "연락처", "주소"])
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def make_grade_xlsx(subjects: list[str], rows: list[list]) -> bytes:
    """테스트용 성적 엑셀 파일 생성. 1행=["번호", *과목명], 이후 행=[학생번호, *점수]"""
    wb = Workbook()
    ws = wb.active
    ws.append(["번호", *subjects])
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.fixture
async def seed_class(seed_teacher, seed_school) -> Class:
    async with async_session_test() as session:
        cls = Class(
            school_id=seed_school.id,
            name="1반",
            grade=1,
            year=2026,
            teacher_id=seed_teacher.id,
        )
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
        return cls


@pytest.mark.asyncio
async def test_upload_students_xlsx_returns_result(auth_client_teacher: AsyncClient, seed_class: Class):
    content = make_student_xlsx([
        ["김철수", 1, "2010-03-15", "male", "010-1234-5678", "서울시"],
        ["이영희", 2, "2010-05-20", "female", None, None],
    ])
    resp = await auth_client_teacher.post(
        f"/api/v1/import/students/xlsx?class_id={seed_class.id}",
        files={"file": ("students.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 2
    assert data["errors"] == []


@pytest.mark.asyncio
async def test_upload_students_xlsx_reports_row_errors(auth_client_teacher: AsyncClient, seed_class: Class):
    content = make_student_xlsx([
        ["", 1, None, None, None, None],  # 이름 누락
    ])
    resp = await auth_client_teacher.post(
        f"/api/v1/import/students/xlsx?class_id={seed_class.id}",
        files={"file": ("students.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["created"] == 0
    assert len(data["errors"]) == 1
    assert data["errors"][0]["row"] == 2


@pytest.mark.asyncio
async def test_download_student_template(auth_client_teacher: AsyncClient):
    resp = await auth_client_teacher.get("/api/v1/import/students/template")
    assert resp.status_code == 200
    assert "spreadsheetml" in resp.headers["content-type"]
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
cd backend && pytest tests/test_import_xlsx.py -x -v
```

- [ ] **Step 4: import 서비스에 xlsx 파싱 구현**

`backend/app/services/import_.py`에 추가 (기존 CSV 함수는 유지):

```python
import io
from datetime import date as date_type

from openpyxl import Workbook, load_workbook

from app.services.student import create_student


def _parse_date(value) -> date_type | None:
    """엑셀 셀 값을 date로 변환. datetime/date/str 모두 처리."""
    if value is None:
        return None
    if isinstance(value, date_type):
        return value
    try:
        return date_type.fromisoformat(str(value))
    except (ValueError, TypeError):
        return None


async def import_students_xlsx(
    db: AsyncSession,
    *,
    teacher_id: uuid.UUID,
    school_id: uuid.UUID,
    class_id: uuid.UUID,
    content: bytes,
) -> ImportResult:
    """엑셀 파일에서 학생 일괄 등록. 컬럼: 이름, 번호, 생년월일, 성별, 연락처, 주소"""
    created = 0
    skipped = 0
    errors: list[dict[str, Any]] = []

    wb = load_workbook(io.BytesIO(content), read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(min_row=2, values_only=True))  # 1행=헤더 건너뜀

    for idx, row in enumerate(rows, start=2):
        name = row[0] if len(row) > 0 else None
        number = row[1] if len(row) > 1 else None
        birth = row[2] if len(row) > 2 else None
        gender = row[3] if len(row) > 3 else None
        phone = row[4] if len(row) > 4 else None
        address = row[5] if len(row) > 5 else None

        if not name or not number:
            errors.append({"row": idx, "error": "이름과 번호는 필수입니다."})
            continue
        try:
            await create_student(
                db, class_id=class_id, teacher_id=teacher_id,
                school_id=school_id, name=str(name),
                student_number=int(number),
                birth_date=_parse_date(birth),
                gender=str(gender) if gender else None,
                phone=str(phone) if phone else None,
                address=str(address) if address else None,
            )
            created += 1
        except AppException as e:
            if e.code == "STUDENT_DUPLICATE_NUMBER":
                skipped += 1
            else:
                errors.append({"row": idx, "error": f"{e.code}: {e.detail}"})
        except Exception as e:
            errors.append({"row": idx, "error": str(e)})

    return ImportResult(created, skipped, errors)


async def import_grades_xlsx(
    db: AsyncSession,
    *,
    teacher_id: uuid.UUID,
    class_id: uuid.UUID,
    semester_id: uuid.UUID,
    content: bytes,
) -> ImportResult:
    """엑셀에서 성적 일괄 등록.
    형식: 1행 = ["번호", "국어", "수학", ...], 이후 행 = [학생번호, 점수, 점수, ...]
    과목명은 해당 반의 subjects 테이블과 매칭한다.
    """
    from decimal import Decimal
    from sqlalchemy import select, and_
    from app.models.subject import Subject
    from app.models.student import Student
    from app.services.grade import create_grade

    created = 0
    skipped = 0
    errors: list[dict[str, Any]] = []

    wb = load_workbook(io.BytesIO(content), read_only=True)
    ws = wb.active
    all_rows = list(ws.iter_rows(values_only=True))
    if not all_rows:
        errors.append({"row": 0, "error": "빈 파일입니다."})
        return ImportResult(created, skipped, errors)

    header = all_rows[0]
    subject_names = [str(h).strip() for h in header[1:] if h]  # 첫 열은 "번호"

    # 과목명 → subject_id 매핑
    result = await db.execute(select(Subject).where(Subject.class_id == class_id))
    subjects_db = {s.name: s.id for s in result.scalars().all()}
    subject_ids = []
    for col_idx, sname in enumerate(subject_names):
        if sname not in subjects_db:
            errors.append({"row": 1, "error": f"과목 '{sname}'을 찾을 수 없습니다."})
        else:
            subject_ids.append((col_idx, subjects_db[sname]))

    if not subject_ids:
        return ImportResult(created, skipped, errors)

    # 학생번호 → student_id 매핑
    result = await db.execute(select(Student).where(Student.class_id == class_id))
    students_by_number = {s.student_number: s.id for s in result.scalars().all()}

    for row_idx, row in enumerate(all_rows[1:], start=2):
        student_number = row[0] if row else None
        if student_number is None:
            errors.append({"row": row_idx, "error": "학생 번호가 비어있습니다."})
            continue
        student_id = students_by_number.get(int(student_number))
        if student_id is None:
            errors.append({"row": row_idx, "error": f"번호 {student_number} 학생을 찾을 수 없습니다."})
            continue

        for col_offset, subj_id in subject_ids:
            score_val = row[col_offset + 1] if len(row) > col_offset + 1 else None
            if score_val is None or str(score_val).strip() == "":
                continue
            try:
                await create_grade(
                    db,
                    student_id=student_id,
                    subject_id=subj_id,
                    semester_id=uuid.UUID(str(semester_id)),
                    score=Decimal(str(score_val)),
                    created_by=teacher_id,
                    teacher_id=teacher_id,
                )
                created += 1
            except AppException as e:
                errors.append({"row": row_idx, "error": f"{e.code}: {e.detail}"})
            except Exception as e:
                errors.append({"row": row_idx, "error": str(e)})

    return ImportResult(created, skipped, errors)


def generate_student_template() -> bytes:
    """빈 학생 등록 엑셀 템플릿 생성"""
    wb = Workbook()
    ws = wb.active
    ws.title = "학생 목록"
    ws.append(["이름", "번호", "생년월일", "성별", "연락처", "주소"])
    ws.append(["김철수", 1, "2010-03-15", "male", "010-1234-5678", "서울시 강남구"])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def generate_grade_template(subject_names: list[str]) -> bytes:
    """빈 성적 입력 엑셀 템플릿 생성. 과목명은 해당 반의 과목 목록에서 가져온다."""
    wb = Workbook()
    ws = wb.active
    ws.title = "성적 입력"
    ws.append(["번호", *subject_names])
    ws.append([1, 85, 90, 78])  # 예시
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
```

- [x] **Step 5: 라우터에 xlsx 엔드포인트 + 템플릿 다운로드 추가**

`backend/app/routers/imports.py` — 기존 CSV 엔드포인트 유지하면서 xlsx 엔드포인트 추가:
```python
import io
import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.subject import Subject
from app.models.user import User
from app.services.import_ import (
    generate_grade_template,
    generate_student_template,
    import_grades_csv,
    import_grades_xlsx,
    import_students_csv,
    import_students_xlsx,
)

router = APIRouter(prefix="/import", tags=["import"])

# --- 기존 CSV 엔드포인트 (유지) ---

@router.post("/students")
async def import_students(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    content = await file.read()
    result = await import_students_csv(
        db, teacher_id=current_user.id, school_id=current_user.school_id, content=content
    )
    return {"created": result.created, "skipped": result.skipped, "errors": result.errors}

@router.post("/grades")
async def import_grades(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    content = await file.read()
    result = await import_grades_csv(db, teacher_id=current_user.id, content=content)
    return {"created": result.created, "skipped": result.skipped, "errors": result.errors}

# --- 새 xlsx 엔드포인트 ---

@router.post("/students/xlsx")
async def import_students_xlsx_endpoint(
    class_id: str = Query(..., description="등록할 반 ID"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    content = await file.read()
    result = await import_students_xlsx(
        db,
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        class_id=uuid.UUID(class_id),
        content=content,
    )
    return {"created": result.created, "skipped": result.skipped, "errors": result.errors}


@router.post("/grades/xlsx")
async def import_grades_xlsx_endpoint(
    class_id: str = Query(..., description="반 ID"),
    semester_id: str = Query(..., description="학기 ID"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    content = await file.read()
    result = await import_grades_xlsx(
        db,
        teacher_id=current_user.id,
        class_id=uuid.UUID(class_id),
        semester_id=uuid.UUID(semester_id),
        content=content,
    )
    return {"created": result.created, "skipped": result.skipped, "errors": result.errors}


@router.get("/students/template")
async def download_student_template(
    current_user: User = Depends(require_role("teacher")),
):
    content = generate_student_template()
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=student_template.xlsx"},
    )


@router.get("/grades/template")
async def download_grade_template(
    class_id: str = Query(..., description="반 ID (과목 목록 조회용)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    result = await db.execute(select(Subject).where(Subject.class_id == uuid.UUID(class_id)))
    subject_names = [s.name for s in result.scalars().all()]
    content = generate_grade_template(subject_names)
    return StreamingResponse(
        io.BytesIO(content),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=grade_template.xlsx"},
    )
```

- [x] **Step 6: 테스트 통과 확인**

```bash
cd backend && pytest tests/test_import_xlsx.py -x -v
```

- [x] **Step 7: Commit**

```bash
git add backend/requirements.txt backend/app/services/import_.py backend/app/routers/imports.py backend/tests/test_import_xlsx.py
git commit -m "feat(import): add xlsx import with openpyxl, template downloads, grade import"
```

---

## Task 4: 기본 과목 시드 데이터

**Files:**
- Modify: `backend/seed.py`

> **Note:** 기존 `seed.py`에 `if __name__ == "main":` 버그 있음 → `if __name__ == "__main__":` 로 수정.

- [x] **Step 1: seed.py에 기본 과목 추가 + 버그 수정**

```python
from app.models.subject import Subject
from app.models.class_ import Class

DEFAULT_SUBJECTS = ["국어", "수학", "영어", "사회", "과학", "체육", "음악", "미술"]
```

`seed()` 함수 내 `await session.commit()` 직전에 추가:
```python
        # Seed default subjects for all classes in the school
        result = await session.execute(select(Class).where(Class.school_id == school.id))
        classes = result.scalars().all()
        for cls in classes:
            existing = await session.execute(
                select(Subject).where(Subject.class_id == cls.id)
            )
            if existing.scalars().first() is None:
                for subj_name in DEFAULT_SUBJECTS:
                    session.add(Subject(class_id=cls.id, name=subj_name))
```

파일 끝의 `__main__` 가드 수정:
```python
if __name__ == "__main__":
    asyncio.run(seed())
```

- [x] **Step 2: 시드 실행 테스트**

```bash
cd backend && python -c "import asyncio; from seed import seed; asyncio.run(seed())"
```

- [x] **Step 3: Commit**

```bash
git add backend/seed.py
git commit -m "feat(seed): add default subjects for all classes, fix __main__ guard"
```

---

## Task 5: 프론트엔드 — 엑셀 업로드 모달

**Files:**
- Create: `frontend/src/api/imports.ts`
- Create: `frontend/src/hooks/useImport.ts`
- Create: `frontend/src/components/students/ExcelUploadModal.tsx`
- Modify: `frontend/src/pages/StudentListPage.tsx`

- [ ] **Step 1: API 함수 작성**

`frontend/src/api/imports.ts`:
```typescript
import apiClient from './client';

interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

export async function uploadStudentsExcel(classId: string, file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post(`/import/students/xlsx?class_id=${classId}`, form);
  return data;
}

export async function uploadGradesExcel(
  classId: string,
  semesterId: string,
  file: File,
): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post(
    `/import/grades/xlsx?class_id=${classId}&semester_id=${semesterId}`,
    form,
  );
  return data;
}

export function getStudentTemplateUrl(): string {
  return `${apiClient.defaults.baseURL}/import/students/template`;
}

export function getGradeTemplateUrl(classId: string): string {
  return `${apiClient.defaults.baseURL}/import/grades/template?class_id=${classId}`;
}
```

- [ ] **Step 2: mutation hook 작성**

`frontend/src/hooks/useImport.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadStudentsExcel, uploadGradesExcel } from '../api/imports';

export function useUploadStudents(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadStudentsExcel(classId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['students'] }),
  });
}

export function useUploadGrades(classId: string, semesterId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadGradesExcel(classId, semesterId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grades'] }),
  });
}
```

- [ ] **Step 3: ExcelUploadModal 컴포넌트 구현**

`frontend/src/components/students/ExcelUploadModal.tsx`:
- 파일 선택 (`.xlsx` 만 허용, `accept=".xlsx"`)
- 업로드 버튼 + 로딩 상태
- 업로드 후 결과 표시: `N명 등록, N명 건너뜀, N건 오류`
- 오류가 있으면 행 번호 + 오류 메시지 목록 표시
- 템플릿 다운로드 링크 (`getStudentTemplateUrl()`)
- 닫기 버튼
- 네트워크 에러 시 `react-hot-toast`로 에러 표시

```tsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useUploadStudents } from '../../hooks/useImport';
import { getStudentTemplateUrl } from '../../api/imports';

interface ExcelUploadModalProps {
  classId: string;
  onClose: () => void;
}

export default function ExcelUploadModal({ classId, onClose }: ExcelUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadStudents(classId);

  const handleUpload = async () => {
    if (!file) return;
    try {
      const result = await upload.mutateAsync(file);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length}건의 오류가 발생했습니다.`);
      } else {
        toast.success(`${result.created}명 등록, ${result.skipped}명 건너뜀`);
        onClose();
      }
    } catch {
      toast.error('업로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">엑셀로 학생 등록</h2>

        <a
          href={getStudentTemplateUrl()}
          className="text-sm text-indigo-600 underline"
          download
        >
          템플릿 다운로드
        </a>

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm"
        />

        {upload.data && upload.data.errors.length > 0 && (
          <div className="bg-red-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
            {upload.data.errors.map((err, i) => (
              <div key={i} className="text-red-700">{err.row}행: {err.error}</div>
            ))}
          </div>
        )}

        {upload.data && upload.data.errors.length === 0 && (
          <div className="bg-green-50 p-3 rounded text-sm text-green-700">
            {upload.data.created}명 등록, {upload.data.skipped}명 건너뜀
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded">
            닫기
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || upload.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {upload.isPending ? '업로드 중...' : '업로드'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 4: StudentListPage에 업로드 버튼 연결**

`frontend/src/pages/StudentListPage.tsx`에 state 추가 및 버튼:
```tsx
const [showUploadModal, setShowUploadModal] = useState(false);
```

버튼 영역에 추가:
```tsx
<button
  className="px-3 py-1 rounded text-sm border"
  onClick={() => setShowUploadModal(true)}
>
  엑셀로 등록
</button>
```

모달:
```tsx
{showUploadModal && classId && (
  <ExcelUploadModal classId={classId} onClose={() => setShowUploadModal(false)} />
)}
```

- [x] **Step 5: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [x] **Step 6: Commit**

```bash
git add frontend/src/api/imports.ts frontend/src/hooks/useImport.ts frontend/src/components/students/ExcelUploadModal.tsx frontend/src/pages/StudentListPage.tsx
git commit -m "feat(frontend): add student excel upload modal with error display"
```

---

## Task 6: 프론트엔드 — 개별 학생 등록 폼

**Files:**
- Create: `frontend/src/components/students/StudentCreateForm.tsx`
- Modify: `frontend/src/api/students.ts` — `createStudent` 함수 추가
- Modify: `frontend/src/pages/StudentListPage.tsx`

- [x] **Step 1: 학생 등록 API 함수 추가**

기존 `frontend/src/api/students.ts`에 추가:
```typescript
export async function createStudent(classId: string, body: {
  name: string;
  student_number: number;
  birth_date?: string;
  gender?: string;
  phone?: string;
  address?: string;
}) {
  const { data } = await apiClient.post(`/classes/${classId}/students`, body);
  return data;
}
```

- [x] **Step 2: StudentCreateForm 구현**

`frontend/src/components/students/StudentCreateForm.tsx`:
- 필수 필드: 이름, 번호
- 선택 필드: 생년월일(date input), 성별(select: male/female), 연락처, 주소
- 제출 시 mutation → 성공하면 `invalidateQueries(['students'])` + 모달 닫기
- 409 에러 시 `react-hot-toast`로 "이미 존재하는 번호입니다" 표시
- 네트워크 에러 시 일반 에러 토스트

- [x] **Step 3: StudentListPage에 등록 버튼 추가**

```tsx
const [showCreateForm, setShowCreateForm] = useState(false);
```

```tsx
<button
  className="px-3 py-1 rounded text-sm border"
  onClick={() => setShowCreateForm(true)}
>
  학생 추가
</button>
{showCreateForm && classId && (
  <StudentCreateForm classId={classId} onClose={() => setShowCreateForm(false)} />
)}
```

- [x] **Step 4: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/students/StudentCreateForm.tsx frontend/src/api/students.ts frontend/src/pages/StudentListPage.tsx
git commit -m "feat(frontend): add individual student creation form"
```

---

## Task 7: 프론트엔드 — 성적 엑셀 업로드

**Files:**
- Create: `frontend/src/components/grades/GradeExcelUploadModal.tsx`
- Modify: `frontend/src/pages/GradesPage.tsx`

- [x] **Step 1: GradeExcelUploadModal 구현**

`frontend/src/components/grades/GradeExcelUploadModal.tsx`:
- ExcelUploadModal과 유사한 구조
- Props: `classId`, `semesterId`, `onClose`
- `useUploadGrades` hook 사용
- 업로드 후 결과 (등록/건너뜀/오류) 표시
- 성적 템플릿 다운로드 링크 (`getGradeTemplateUrl(classId)`)

- [x] **Step 2: GradesPage에 업로드 버튼 추가**

기존 "Excel 내보내기" 버튼 옆에 추가:
```tsx
const [showGradeUpload, setShowGradeUpload] = useState(false);
```

```tsx
<button
  className="px-3 py-1 rounded text-sm border"
  onClick={() => setShowGradeUpload(true)}
>
  엑셀로 성적 등록
</button>
```

> 주의: GradeExcelUploadModal은 `studentId`를 통해 가져온 `class_id`와 현재 선택된 `semesterId`를 전달해야 함.

- [x] **Step 3: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [x] **Step 4: Commit**

```bash
git add frontend/src/components/grades/GradeExcelUploadModal.tsx frontend/src/pages/GradesPage.tsx
git commit -m "feat(frontend): add grade excel upload modal"
```

---

## Task 8: 프론트엔드 — 학생 상세 UI 업데이트

**Files:**
- Modify: `frontend/src/pages/StudentDetailPage.tsx`

> `frontend/src/types/index.ts`의 `StudentDetail` 타입 확장은 Task 1 Step 6에서 완료.

- [x] **Step 1: StudentDetailPage에 새 필드 표시**

학생 상세 페이지의 기본 정보 섹션에 성별, 연락처, 주소 추가:
```tsx
{student.gender && <div>성별: {student.gender === 'male' ? '남' : '여'}</div>}
{student.phone && <div>연락처: {student.phone}</div>}
{student.address && <div>주소: {student.address}</div>}
```

- [x] **Step 2: 빌드 확인**

```bash
cd frontend && npx tsc --noEmit
```

- [x] **Step 3: Commit**

```bash
git add frontend/src/pages/StudentDetailPage.tsx
git commit -m "feat(frontend): display gender, phone, address in student detail page"
```

---

## Task 9: 전체 통합 테스트

**Files:**
- 기존 테스트 파일들

- [x] **Step 1: 백엔드 전체 테스트**

```bash
cd backend && pytest -x -q
```

- [x] **Step 2: 프론트엔드 타입 체크 + 빌드**

```bash
cd frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 3: 프론트엔드 기존 테스트 회귀 확인**

```bash
cd frontend && npm run test -- --run
```

- [ ] **Step 4: 최종 Commit (필요시)**

```bash
git add -A
git commit -m "test: verify all tests pass after student data extension and excel import"
```
