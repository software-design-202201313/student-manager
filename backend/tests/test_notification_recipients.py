import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models import Class, ParentStudent, School, Semester, Student, Subject, User
from app.utils.security import create_access_token, hash_password
from tests.conftest import async_session_test


def _headers_for(user: User) -> dict[str, str]:
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "school_id": str(user.school_id),
        }
    )
    return {"Authorization": f"Bearer {token}"}


async def _notifications_for(user: User) -> list[dict]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test", headers=_headers_for(user)) as client:
        response = await client.get("/api/v1/notifications")
        assert response.status_code == 200
        return response.json()


async def _seed_notification_context() -> dict[str, User | Class | Semester | Student | Subject]:
    async with async_session_test() as session:
        suffix = uuid.uuid4().hex[:8]
        school = School(name=f"Notification School {suffix}")
        session.add(school)
        await session.flush()

        teacher = User(
            school_id=school.id,
            email=f"teacher-{suffix}@example.com",
            hashed_password=hash_password("password123"),
            role="teacher",
            name="담임",
        )
        peer_teacher = User(
            school_id=school.id,
            email=f"peer-{suffix}@example.com",
            hashed_password=hash_password("password123"),
            role="teacher",
            name="동료교사",
        )
        student_user = User(
            school_id=school.id,
            email=f"student-{suffix}@example.com",
            hashed_password=hash_password("password123"),
            role="student",
            name="학생",
        )
        parent1 = User(
            school_id=school.id,
            email=f"parent1-{suffix}@example.com",
            hashed_password=hash_password("password123"),
            role="parent",
            name="학부모1",
        )
        parent2 = User(
            school_id=school.id,
            email=f"parent2-{suffix}@example.com",
            hashed_password=hash_password("password123"),
            role="parent",
            name="학부모2",
        )
        session.add_all([teacher, peer_teacher, student_user, parent1, parent2])
        await session.flush()

        cls = Class(school_id=school.id, name="3-1", grade=3, year=2026, teacher_id=teacher.id)
        session.add(cls)
        await session.flush()

        semester = Semester(year=2026, term=1)
        session.add(semester)
        await session.flush()

        subject = Subject(class_id=cls.id, name="Math")
        session.add(subject)
        await session.flush()

        student = Student(user_id=student_user.id, class_id=cls.id, student_number=1)
        session.add(student)
        await session.flush()

        session.add_all(
            [
                ParentStudent(parent_id=parent1.id, student_id=student.id),
                ParentStudent(parent_id=parent2.id, student_id=student.id),
            ]
        )
        await session.commit()

        return {
            "teacher": teacher,
            "peer_teacher": peer_teacher,
            "student": student,
            "student_user": student_user,
            "parent1": parent1,
            "parent2": parent2,
            "class": cls,
            "semester": semester,
            "subject": subject,
        }


@pytest.mark.asyncio
async def test_grade_notification_targets_student_and_parents_only():
    ctx = await _seed_notification_context()

    teacher_transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=teacher_transport,
        base_url="http://test",
        headers=_headers_for(ctx["teacher"]),
    ) as teacher_client:
        response = await teacher_client.post(
            "/api/v1/grades",
            json={
                "student_id": str(ctx["student"].id),
                "subject_id": str(ctx["subject"].id),
                "semester_id": str(ctx["semester"].id),
                "score": 88,
            },
        )
        assert response.status_code == 201

    student_notifications = await _notifications_for(ctx["student_user"])
    parent1_notifications = await _notifications_for(ctx["parent1"])
    parent2_notifications = await _notifications_for(ctx["parent2"])
    teacher_notifications = await _notifications_for(ctx["teacher"])
    peer_teacher_notifications = await _notifications_for(ctx["peer_teacher"])

    assert len(student_notifications) == 1
    assert len(parent1_notifications) == 1
    assert len(parent2_notifications) == 1
    assert teacher_notifications == []
    assert peer_teacher_notifications == []


@pytest.mark.asyncio
async def test_private_feedback_does_not_notify_anyone():
    ctx = await _seed_notification_context()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=_headers_for(ctx["teacher"]),
    ) as teacher_client:
        response = await teacher_client.post(
            "/api/v1/feedbacks",
            json={
                "student_id": str(ctx["student"].id),
                "category": "behavior",
                "content": "비공개 메모",
                "is_visible_to_student": False,
                "is_visible_to_parent": False,
            },
        )
        assert response.status_code == 201

    assert await _notifications_for(ctx["teacher"]) == []
    assert await _notifications_for(ctx["student_user"]) == []
    assert await _notifications_for(ctx["parent1"]) == []
    assert await _notifications_for(ctx["parent2"]) == []
    assert await _notifications_for(ctx["peer_teacher"]) == []


@pytest.mark.asyncio
async def test_shared_counseling_notifies_peer_teachers_only():
    ctx = await _seed_notification_context()

    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        headers=_headers_for(ctx["teacher"]),
    ) as teacher_client:
        response = await teacher_client.post(
            "/api/v1/counselings",
            json={
                "student_id": str(ctx["student"].id),
                "date": "2026-04-11",
                "content": "상담 기록",
                "next_plan": "다음 계획",
                "is_shared": True,
            },
        )
        assert response.status_code == 201

    assert await _notifications_for(ctx["teacher"]) == []
    peer_teacher_notifications = await _notifications_for(ctx["peer_teacher"])
    assert len(peer_teacher_notifications) == 1
    assert await _notifications_for(ctx["student_user"]) == []
    assert await _notifications_for(ctx["parent1"]) == []
    assert await _notifications_for(ctx["parent2"]) == []
