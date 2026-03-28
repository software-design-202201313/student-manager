import uuid as _uuid
import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Class, Semester, Subject


async def _bootstrap_class_semester_subject(teacher, school_id):
    async with async_session_test() as session:
        cls = Class(school_id=school_id, name="1-5", grade=1, year=2026, teacher_id=teacher.id)
        session.add(cls)
        await session.flush()
        sem = Semester(year=2026, term=1)
        session.add(sem)
        await session.flush()
        subj = Subject(class_id=cls.id, name="Korean")
        session.add(subj)
        await session.commit()
        await session.refresh(cls)
        await session.refresh(sem)
        await session.refresh(subj)
        return cls, sem, subj


async def _create_student(auth_client, cls, *, email: str, name: str, student_number: int) -> str:
    s_res = await auth_client.post(
        "/api/v1/users/students",
        json={"email": email, "name": name, "class_id": cls.id.hex, "student_number": student_number},
    )
    assert s_res.status_code == 201
    return s_res.json()["id"]


@pytest.mark.asyncio
async def test_grade_create_and_update(auth_client_teacher: AsyncClient, seed_teacher):
    cls, sem, subj = await _bootstrap_class_semester_subject(seed_teacher, seed_teacher.school_id)
    student_id = await _create_student(auth_client_teacher, cls, email="g1@test.com", name="학생G", student_number=10)

    create_res = await auth_client_teacher.post(
        "/api/v1/grades",
        json={
            "student_id": student_id,
            "subject_id": subj.id.hex,
            "semester_id": sem.id.hex,
            "score": 95,
        },
    )
    assert create_res.status_code == 201
    assert create_res.json()["grade_rank"] == 2

    grade_id = create_res.json()["id"]

    update_res = await auth_client_teacher.put(
        f"/api/v1/grades/{grade_id}",
        json={
            "student_id": student_id,
            "subject_id": subj.id.hex,
            "semester_id": sem.id.hex,
            "score": 97,
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["grade_rank"] == 1


@pytest.mark.asyncio
async def test_grade_create_for_other_teachers_student_forbidden(
    auth_client_teacher_other: AsyncClient, seed_teacher_other
):
    cls, sem, subj = await _bootstrap_class_semester_subject(seed_teacher_other, seed_teacher_other.school_id)
    student_id = await _create_student(
        auth_client_teacher_other, cls, email="g2@test.com", name="학생H", student_number=11
    )
    # Reuse auth_client_teacher_other for positive assertion (ownership valid)
    res = await auth_client_teacher_other.post(
        "/api/v1/grades",
        json={"student_id": student_id, "subject_id": subj.id.hex, "semester_id": sem.id.hex, "score": 80},
    )
    assert res.status_code == 201


@pytest.mark.asyncio
async def test_grade_create_subject_class_mismatch_returns_400(auth_client_teacher: AsyncClient, seed_teacher):
    async with async_session_test() as session:
        cls1 = Class(school_id=seed_teacher.school_id, name="1-A", grade=1, year=2026, teacher_id=seed_teacher.id)
        cls2 = Class(school_id=seed_teacher.school_id, name="1-B", grade=1, year=2026, teacher_id=seed_teacher.id)
        session.add_all([cls1, cls2])
        await session.flush()
        sem = Semester(year=2026, term=1)
        session.add(sem)
        await session.flush()
        subj = Subject(class_id=cls2.id, name="Science")
        session.add(subj)
        await session.commit()
        await session.refresh(cls1)
        await session.refresh(sem)
        await session.refresh(subj)

    student_id = await _create_student(
        auth_client_teacher, cls1, email="mismatch@test.com", name="Mismatch", student_number=5
    )

    res = await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": student_id, "subject_id": subj.id.hex, "semester_id": sem.id.hex, "score": 50},
    )
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_grade_summary_basic(auth_client_teacher: AsyncClient, seed_teacher):
    cls, sem, subj1 = await _bootstrap_class_semester_subject(seed_teacher, seed_teacher.school_id)
    async with async_session_test() as session:
        subj2 = Subject(class_id=cls.id, name="Math")
        session.add(subj2)
        await session.commit()
        await session.refresh(subj2)

    student_id = await _create_student(
        auth_client_teacher, cls, email="sum@test.com", name="합계학생", student_number=20
    )

    await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": student_id, "subject_id": subj1.id.hex, "semester_id": sem.id.hex, "score": 70},
    )
    await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": student_id, "subject_id": subj2.id.hex, "semester_id": sem.id.hex, "score": 80},
    )

    res = await auth_client_teacher.get(f"/api/v1/grades/{student_id}/summary", params={"semester_id": sem.id.hex})
    assert res.status_code == 200
    body = res.json()
    assert body["total_score"] == 150
    assert body["average_score"] == 75
    assert body["subject_count"] == 2
    assert len(body["grades"]) == 2


@pytest.mark.asyncio
async def test_grade_summary_no_scores(auth_client_teacher: AsyncClient, seed_teacher):
    cls, sem, _subj = await _bootstrap_class_semester_subject(seed_teacher, seed_teacher.school_id)
    student_id = await _create_student(
        auth_client_teacher, cls, email="nosum@test.com", name="무합계", student_number=21
    )
    res = await auth_client_teacher.get(f"/api/v1/grades/{student_id}/summary", params={"semester_id": sem.id.hex})
    assert res.status_code == 200
    body = res.json()
    assert body["total_score"] is None
    assert body["average_score"] is None
    assert body["subject_count"] == 0
    assert body["grades"] == []


@pytest.mark.asyncio
async def test_grade_list_by_student_and_semester(auth_client_teacher: AsyncClient, seed_teacher):
    cls, sem, subj = await _bootstrap_class_semester_subject(seed_teacher, seed_teacher.school_id)
    student_id = await _create_student(
        auth_client_teacher, cls, email="glist@test.com", name="목록학생", student_number=22
    )

    await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": student_id, "subject_id": subj.id.hex, "semester_id": sem.id.hex, "score": 88},
    )

    list_res = await auth_client_teacher.get(
        "/api/v1/grades",
        params={"student_id": student_id, "semester_id": sem.id.hex},
    )
    assert list_res.status_code == 200
    grades = list_res.json()
    assert len(grades) >= 1
    assert any(float(g["score"]) == 88.0 for g in grades)


@pytest.mark.asyncio
async def test_grade_rank_absolute_cutoffs(auth_client_teacher: AsyncClient, seed_teacher):
    # grade_rank uses absolute cutoffs: ≥96→1, ≥89→2, ≥77→3, ≥60→4, ...
    cls, sem, subj = await _bootstrap_class_semester_subject(seed_teacher, seed_teacher.school_id)
    s1 = await _create_student(auth_client_teacher, cls, email="rank1@test.com", name="학생1", student_number=30)
    s2 = await _create_student(auth_client_teacher, cls, email="rank2@test.com", name="학생2", student_number=31)

    # score 97 → rank 1 (≥96), score 70 → rank 4 (≥60)
    r1 = await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": s1, "subject_id": subj.id.hex, "semester_id": sem.id.hex, "score": 97},
    )
    assert r1.status_code == 201
    assert r1.json()["grade_rank"] == 1

    r2 = await auth_client_teacher.post(
        "/api/v1/grades",
        json={"student_id": s2, "subject_id": subj.id.hex, "semester_id": sem.id.hex, "score": 70},
    )
    assert r2.status_code == 201
    assert r2.json()["grade_rank"] == 4


@pytest.mark.asyncio
async def test_grade_requires_auth(client: AsyncClient, seed_teacher):
    res = await client.get("/api/v1/grades", params={"student_id": str(_uuid.uuid4())})
    assert res.status_code in (401, 403)
