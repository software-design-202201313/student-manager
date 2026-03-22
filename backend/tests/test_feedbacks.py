import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Class


@pytest.mark.asyncio
async def test_feedback_create_and_list_scoped(auth_client_teacher, seed_teacher):
    # Create a class and student
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="3-1", grade=3, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    s_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "f1@test.com", "name": "F 학생", "class_id": cls.id.hex, "student_number": 9},
    )
    student_id = s_res.json()["id"]

    # Create feedback
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

    # List feedbacks
    list_res = await auth_client_teacher.get("/api/v1/feedbacks", params={"student_id": student_id})
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(i["content"] == "잘했어요" for i in items)

