import pytest

from tests.conftest import async_session_test
from app.models import Class, Semester, Subject


@pytest.mark.asyncio
async def test_import_students_csv(auth_client_teacher, seed_teacher):
    # class for teacher
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="4-1", grade=4, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    csv_content = "email,name,student_number\nimp1@test.com,Imp One,1\nimp1@test.com,Imp Dup,2\n"
    files = {"file": ("students.csv", csv_content.encode("utf-8"), "text/csv")}
    res = await auth_client_teacher.post(f"/api/v1/import/students?class_id={cls.id}", files=files)
    assert res.status_code == 200
    body = res.json()
    assert body["created"] == 1
    assert body["skipped"] == 1


@pytest.mark.asyncio
async def test_import_grades_csv(auth_client_teacher, seed_teacher):
    # bootstrap class/semester/subject and student
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="4-2", grade=4, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.flush()
        sem = Semester(year=2026, term=1)
        session.add(sem)
        await session.flush()
        subj = Subject(class_id=cls.id, name="History")
        session.add(subj)
        await session.commit()
        await session.refresh(cls)
        await session.refresh(sem)
        await session.refresh(subj)

    await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "gi@test.com", "name": "GI", "class_id": cls.id.hex, "student_number": 1},
    )
    csv_content = "student_number,subject_name,score\n1,History,88\n"
    files = {"file": ("grades.csv", csv_content.encode("utf-8"), "text/csv")}
    res = await auth_client_teacher.post(
        f"/api/v1/import/grades?class_id={cls.id}&semester_id={sem.id}",
        files=files,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["created"] == 1
    assert body["updated"] == 0
    assert len(body["errors"]) == 0
