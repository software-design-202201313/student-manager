import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Class


async def _setup_class_and_student(auth_client, teacher, *, class_name: str, email: str, student_number: int):
    async with async_session_test() as session:
        cls = Class(
            school_id=teacher.school_id,
            name=class_name,
            grade=3,
            year=2026,
            teacher_id=teacher.id,
        )
        session.add(cls)
        await session.commit()
        await session.refresh(cls)

    s_res = await auth_client.post(
        "/api/v1/users/students",
        json={"email": email, "name": f"학생_{student_number}", "class_id": cls.id.hex, "student_number": student_number},
    )
    assert s_res.status_code == 201
    return cls, s_res.json()["id"]


@pytest.mark.asyncio
async def test_counseling_create_and_list_shared(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-2", email="c1@test.com", student_number=8
    )

    cs_res = await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-20",
            "content": "상담 내용",
            "next_plan": "다음 계획",
            "is_shared": True,
        },
    )
    assert cs_res.status_code == 201
    body = cs_res.json()
    assert body["content"] == "상담 내용"
    assert body["next_plan"] == "다음 계획"
    assert body["is_shared"] is True

    list_res = await auth_client_teacher.get("/api/v1/counselings", params={"student_id": student_id})
    assert list_res.status_code == 200
    assert any(i["content"] == "상담 내용" for i in list_res.json())


@pytest.mark.asyncio
async def test_counseling_update(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-3", email="c2@test.com", student_number=17
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-21",
            "content": "초기 상담",
            "next_plan": None,
            "is_shared": False,
        },
    )
    assert create_res.status_code == 201
    counseling_id = create_res.json()["id"]

    update_res = await auth_client_teacher.put(
        f"/api/v1/counselings/{counseling_id}",
        json={
            "student_id": student_id,
            "date": "2026-03-21",
            "content": "수정된 상담",
            "next_plan": "후속 조치",
            "is_shared": True,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["content"] == "수정된 상담"
    assert updated["next_plan"] == "후속 조치"
    assert updated["is_shared"] is True


@pytest.mark.asyncio
async def test_counseling_update_by_other_teacher_forbidden(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-4", email="c3@test.com", student_number=18
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-22",
            "content": "소유자 상담",
            "next_plan": None,
            "is_shared": False,
        },
    )
    assert create_res.status_code == 201
    counseling_id = create_res.json()["id"]

    upd_res = await auth_client_teacher_other.put(
        f"/api/v1/counselings/{counseling_id}",
        json={
            "student_id": student_id,
            "date": "2026-03-22",
            "content": "무단 수정",
            "next_plan": None,
            "is_shared": False,
        },
    )
    assert upd_res.status_code == 403


@pytest.mark.asyncio
async def test_counseling_shared_visible_to_other_teacher(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    # Teacher 1 creates a student and a shared counseling
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-5", email="c4@test.com", student_number=19
    )

    cs_res = await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-23",
            "content": "공유 상담",
            "next_plan": None,
            "is_shared": True,
        },
    )
    assert cs_res.status_code == 201

    # Teacher 2 can see this shared counseling when querying by student_id
    list_res = await auth_client_teacher_other.get("/api/v1/counselings", params={"student_id": student_id})
    assert list_res.status_code == 200
    assert any(i["content"] == "공유 상담" for i in list_res.json())


@pytest.mark.asyncio
async def test_counseling_not_shared_not_visible_to_other_teacher(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-6", email="c5@test.com", student_number=20
    )

    cs_res = await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-24",
            "content": "비공개 상담",
            "next_plan": None,
            "is_shared": False,
        },
    )
    assert cs_res.status_code == 201

    # Teacher 2 cannot see non-shared counseling
    list_res = await auth_client_teacher_other.get("/api/v1/counselings", params={"student_id": student_id})
    assert list_res.status_code == 200
    assert all(i["content"] != "비공개 상담" for i in list_res.json())


@pytest.mark.asyncio
async def test_counseling_requires_auth(client: AsyncClient):
    res = await client.get("/api/v1/counselings")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_counseling_create_for_other_teachers_student_forbidden(
    auth_client_teacher_other, auth_client_teacher, seed_teacher, seed_teacher_other
):
    # Teacher 1 creates a student
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-7", email="c6@test.com", student_number=21
    )

    # Teacher 2 tries to create counseling for teacher 1's student
    cs_res = await auth_client_teacher_other.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-25",
            "content": "무단 상담",
            "next_plan": None,
            "is_shared": False,
        },
    )
    assert cs_res.status_code == 403


@pytest.mark.asyncio
async def test_counseling_list_without_student_filter_returns_own(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-8", email="c7@test.com", student_number=22
    )

    await auth_client_teacher.post(
        "/api/v1/counselings",
        json={
            "student_id": student_id,
            "date": "2026-03-26",
            "content": "내 상담 목록",
            "next_plan": None,
            "is_shared": True,
        },
    )

    list_res = await auth_client_teacher.get("/api/v1/counselings")
    assert list_res.status_code == 200
    assert any(i["content"] == "내 상담 목록" for i in list_res.json())
