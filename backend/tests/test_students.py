import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Class


@pytest.mark.asyncio
async def test_student_detail_and_update(auth_client_teacher, seed_teacher):
    # Setup class and student
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="2-2", grade=2, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    s_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "stu@test.com", "name": "STD", "class_id": cls.id.hex, "student_number": 12},
    )
    student_id = s_res.json()["id"]

    # Get detail
    d_res = await auth_client_teacher.get(f"/api/v1/students/{student_id}")
    assert d_res.status_code == 200
    assert d_res.json()["name"] == "STD"

    # Update
    u_res = await auth_client_teacher.put(
        f"/api/v1/students/{student_id}", json={"name": "STD2", "student_number": 13}
    )
    assert u_res.status_code == 200
    assert u_res.json()["name"] == "STD2"
    assert u_res.json()["student_number"] == 13


@pytest.mark.asyncio
async def test_attendance_crud_and_duplicate(auth_client_teacher, seed_teacher):
    # Setup class and student
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="2-3", grade=2, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    s_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "att@test.com", "name": "ATT", "class_id": cls.id.hex, "student_number": 14},
    )
    student_id = s_res.json()["id"]

    # Create attendance
    a_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-03-21", "status": "present"},
    )
    assert a_res.status_code == 201
    att_id = a_res.json()["id"]

    # Duplicate date
    dup_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-03-21", "status": "absent"},
    )
    assert dup_res.status_code == 409

    # List
    l_res = await auth_client_teacher.get(
        f"/api/v1/students/{student_id}/attendance", params={"start_date": "2026-03-01", "end_date": "2026-03-31"}
    )
    assert l_res.status_code == 200
    assert len(l_res.json()) >= 1

    # Update
    u_res = await auth_client_teacher.put(
        f"/api/v1/students/{student_id}/attendance/{att_id}", json={"date": "2026-03-21", "status": "late"}
    )
    assert u_res.status_code == 200
    assert u_res.json()["status"] == "late"


@pytest.mark.asyncio
async def test_special_notes_owner_enforced(auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other):
    # Setup class and student for first teacher
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="2-4", grade=2, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    s_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "sn@test.com", "name": "SN", "class_id": cls.id.hex, "student_number": 15},
    )
    student_id = s_res.json()["id"]

    # Create note by first teacher
    n_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/special-notes", json={"content": "메모"}
    )
    assert n_res.status_code == 201
    note_id = n_res.json()["id"]

    # Other teacher attempts to update
    u_res = await auth_client_teacher_other.put(
        f"/api/v1/students/{student_id}/special-notes/{note_id}", json={"content": "변경"}
    )
    assert u_res.status_code == 403

