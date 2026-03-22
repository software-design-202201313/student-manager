import pytest
from httpx import AsyncClient

from tests.conftest import async_session_test
from app.models import Class


@pytest.mark.asyncio
async def test_counseling_create_and_list_shared(auth_client_teacher, seed_teacher):
    # Create a class and student
    async with async_session_test() as session:
        cls = Class(school_id=seed_teacher.school_id, name="3-2", grade=3, year=2026, teacher_id=seed_teacher.id)
        session.add(cls)
        await session.commit()
        await session.refresh(cls)
    s_res = await auth_client_teacher.post(
        "/api/v1/users/students",
        json={"email": "c1@test.com", "name": "C 학생", "class_id": cls.id.hex, "student_number": 8},
    )
    student_id = s_res.json()["id"]

    # Create counseling (shared)
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

    # List (own)
    list_res = await auth_client_teacher.get("/api/v1/counselings", params={"student_id": student_id})
    assert list_res.status_code == 200
    assert any(i["content"] == "상담 내용" for i in list_res.json())

