import pytest

from tests.conftest import async_session_test
from app.models import Class


async def _setup_class(teacher, *, class_name: str):
    async with async_session_test() as session:
        cls = Class(
            school_id=teacher.school_id,
            name=class_name,
            grade=2,
            year=2026,
            teacher_id=teacher.id,
        )
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    return cls


async def _create_student(auth_client, cls, *, email: str, name: str, student_number: int) -> str:
    s_res = await auth_client.post(
        "/api/v1/users/students",
        json={"email": email, "name": name, "class_id": cls.id.hex, "student_number": student_number},
    )
    assert s_res.status_code == 201
    return s_res.json()["id"]


@pytest.mark.asyncio
async def test_student_detail_and_update(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-2")
    student_id = await _create_student(auth_client_teacher, cls, email="stu@test.com", name="STD", student_number=12)

    d_res = await auth_client_teacher.get(f"/api/v1/students/{student_id}")
    assert d_res.status_code == 200
    assert d_res.json()["name"] == "STD"

    u_res = await auth_client_teacher.put(
        f"/api/v1/students/{student_id}", json={"name": "STD2", "student_number": 13}
    )
    assert u_res.status_code == 200
    assert u_res.json()["name"] == "STD2"
    assert u_res.json()["student_number"] == 13


@pytest.mark.asyncio
async def test_attendance_crud_and_duplicate(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-3")
    student_id = await _create_student(auth_client_teacher, cls, email="att@test.com", name="ATT", student_number=14)

    a_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-03-21", "status": "present"},
    )
    assert a_res.status_code == 201
    att_id = a_res.json()["id"]

    dup_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-03-21", "status": "absent"},
    )
    assert dup_res.status_code == 409

    l_res = await auth_client_teacher.get(
        f"/api/v1/students/{student_id}/attendance",
        params={"start_date": "2026-03-01", "end_date": "2026-03-31"},
    )
    assert l_res.status_code == 200
    assert len(l_res.json()) >= 1

    u_res = await auth_client_teacher.put(
        f"/api/v1/students/{student_id}/attendance/{att_id}",
        json={"date": "2026-03-21", "status": "late"},
    )
    assert u_res.status_code == 200
    assert u_res.json()["status"] == "late"


@pytest.mark.asyncio
async def test_special_notes_owner_enforced(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    cls = await _setup_class(seed_teacher, class_name="2-4")
    student_id = await _create_student(auth_client_teacher, cls, email="sn@test.com", name="SN", student_number=15)

    n_res = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/special-notes", json={"content": "메모"}
    )
    assert n_res.status_code == 201
    note_id = n_res.json()["id"]

    u_res = await auth_client_teacher_other.put(
        f"/api/v1/students/{student_id}/special-notes/{note_id}", json={"content": "변경"}
    )
    assert u_res.status_code == 403


@pytest.mark.asyncio
async def test_student_list_by_class(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-5")
    await _create_student(auth_client_teacher, cls, email="list1@test.com", name="목록1", student_number=16)
    await _create_student(auth_client_teacher, cls, email="list2@test.com", name="목록2", student_number=17)

    list_res = await auth_client_teacher.get("/api/v1/users/students", params={"class_id": cls.id.hex})
    assert list_res.status_code == 200
    names = [s["name"] for s in list_res.json()]
    assert "목록1" in names
    assert "목록2" in names


@pytest.mark.asyncio
async def test_student_deactivate(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-6")
    student_id = await _create_student(
        auth_client_teacher, cls, email="deact@test.com", name="비활성", student_number=18
    )

    deact_res = await auth_client_teacher.patch(f"/api/v1/users/students/{student_id}/deactivate")
    assert deact_res.status_code == 204


@pytest.mark.asyncio
async def test_special_notes_list_and_owner_update(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-7")
    student_id = await _create_student(
        auth_client_teacher, cls, email="snlist@test.com", name="노트목록", student_number=19
    )

    n1 = await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/special-notes", json={"content": "첫번째 메모"}
    )
    assert n1.status_code == 201
    note_id = n1.json()["id"]

    # List notes
    list_res = await auth_client_teacher.get(f"/api/v1/students/{student_id}/special-notes")
    assert list_res.status_code == 200
    assert any(n["content"] == "첫번째 메모" for n in list_res.json())

    # Owner can update
    upd_res = await auth_client_teacher.put(
        f"/api/v1/students/{student_id}/special-notes/{note_id}", json={"content": "수정된 메모"}
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["content"] == "수정된 메모"


@pytest.mark.asyncio
async def test_attendance_list_date_filter(auth_client_teacher, seed_teacher):
    cls = await _setup_class(seed_teacher, class_name="2-8")
    student_id = await _create_student(
        auth_client_teacher, cls, email="attfilt@test.com", name="출석필터", student_number=20
    )

    # March record
    await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-03-10", "status": "present"},
    )
    # April record
    await auth_client_teacher.post(
        f"/api/v1/students/{student_id}/attendance",
        json={"date": "2026-04-10", "status": "absent"},
    )

    march_res = await auth_client_teacher.get(
        f"/api/v1/students/{student_id}/attendance",
        params={"start_date": "2026-03-01", "end_date": "2026-03-31"},
    )
    assert march_res.status_code == 200
    dates = [a["date"] for a in march_res.json()]
    assert "2026-03-10" in dates
    assert "2026-04-10" not in dates
