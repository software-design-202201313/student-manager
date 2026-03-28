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
async def test_feedback_create_and_list_scoped(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-1", email="f1@test.com", student_number=9
    )

    fb_res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "score",
            "content": "잘했어요",
            "is_visible_to_student": True,
            "is_visible_to_parent": True,
        },
    )
    assert fb_res.status_code == 201
    body = fb_res.json()
    assert body["content"] == "잘했어요"
    assert body["category"] == "score"
    assert body["is_visible_to_student"] is True
    assert body["is_visible_to_parent"] is True

    list_res = await auth_client_teacher.get("/api/v1/feedbacks", params={"student_id": student_id})
    assert list_res.status_code == 200
    assert any(i["content"] == "잘했어요" for i in list_res.json())


@pytest.mark.asyncio
async def test_feedback_update(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-2", email="f2@test.com", student_number=10
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "behavior",
            "content": "초기 내용",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert create_res.status_code == 201
    feedback_id = create_res.json()["id"]

    update_res = await auth_client_teacher.put(
        f"/api/v1/feedbacks/{feedback_id}",
        json={
            "student_id": student_id,
            "category": "behavior",
            "content": "수정된 내용",
            "is_visible_to_student": True,
            "is_visible_to_parent": False,
        },
    )
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["content"] == "수정된 내용"
    assert updated["is_visible_to_student"] is True


@pytest.mark.asyncio
async def test_feedback_delete(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-3", email="f3@test.com", student_number=11
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "attendance",
            "content": "삭제될 피드백",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert create_res.status_code == 201
    feedback_id = create_res.json()["id"]

    del_res = await auth_client_teacher.delete(f"/api/v1/feedbacks/{feedback_id}")
    assert del_res.status_code == 204

    # Verify it's gone from list
    list_res = await auth_client_teacher.get("/api/v1/feedbacks", params={"student_id": student_id})
    assert all(i["id"] != feedback_id for i in list_res.json())


@pytest.mark.asyncio
async def test_feedback_update_by_other_teacher_forbidden(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-4", email="f4@test.com", student_number=12
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "attitude",
            "content": "소유자 피드백",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert create_res.status_code == 201
    feedback_id = create_res.json()["id"]

    upd_res = await auth_client_teacher_other.put(
        f"/api/v1/feedbacks/{feedback_id}",
        json={
            "student_id": student_id,
            "category": "attitude",
            "content": "무단 수정",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert upd_res.status_code == 403


@pytest.mark.asyncio
async def test_feedback_delete_by_other_teacher_forbidden(
    auth_client_teacher, auth_client_teacher_other, seed_teacher, seed_teacher_other
):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-5", email="f5@test.com", student_number=13
    )

    create_res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "score",
            "content": "삭제 시도 대상",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert create_res.status_code == 201
    feedback_id = create_res.json()["id"]

    del_res = await auth_client_teacher_other.delete(f"/api/v1/feedbacks/{feedback_id}")
    assert del_res.status_code == 403


@pytest.mark.asyncio
async def test_feedback_requires_auth(client: AsyncClient, seed_teacher):
    res = await client.get("/api/v1/feedbacks")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_feedback_invalid_category_returns_422(auth_client_teacher, seed_teacher):
    _, student_id = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-6", email="f6@test.com", student_number=14
    )

    res = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": student_id,
            "category": "invalid_cat",
            "content": "내용",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_feedback_list_all_without_student_filter(auth_client_teacher, seed_teacher):
    _, s1 = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-7", email="f7a@test.com", student_number=15
    )
    _, s2 = await _setup_class_and_student(
        auth_client_teacher, seed_teacher, class_name="3-8", email="f7b@test.com", student_number=16
    )

    await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={"student_id": s1, "category": "score", "content": "S1 피드백", "is_visible_to_student": False, "is_visible_to_parent": False},
    )
    await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={"student_id": s2, "category": "score", "content": "S2 피드백", "is_visible_to_student": False, "is_visible_to_parent": False},
    )

    list_res = await auth_client_teacher.get("/api/v1/feedbacks")
    assert list_res.status_code == 200
    contents = [i["content"] for i in list_res.json()]
    assert "S1 피드백" in contents
    assert "S2 피드백" in contents
