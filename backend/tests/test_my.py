from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models import Class, Feedback, Grade, ParentStudent, School, Semester, Student, Subject, User
from app.utils.security import create_access_token
from tests.conftest import async_session_test


async def _auth_client_for(user: User) -> AsyncClient:
    token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
            "school_id": str(user.school_id),
        }
    )
    return AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    )


async def _seed_my_view_fixture():
    async with async_session_test() as session:
        school = School(name="My View School")
        session.add(school)
        await session.flush()

        teacher = User(
            school_id=school.id,
            email="my-teacher@test.com",
            hashed_password="hashed",
            role="teacher",
            name="담임교사",
        )
        student_user = User(
            school_id=school.id,
            email="my-student@test.com",
            hashed_password="hashed",
            role="student",
            name="학생본인",
        )
        other_student_user = User(
            school_id=school.id,
            email="my-other-student@test.com",
            hashed_password="hashed",
            role="student",
            name="다른학생",
        )
        parent_user = User(
            school_id=school.id,
            email="my-parent@test.com",
            hashed_password="hashed",
            role="parent",
            name="학부모",
        )
        session.add_all([teacher, student_user, other_student_user, parent_user])
        await session.flush()

        cls = Class(
            school_id=school.id,
            name="1반",
            grade=1,
            year=2026,
            teacher_id=teacher.id,
        )
        sem1 = Semester(year=2026, term=1)
        sem2 = Semester(year=2025, term=2)
        session.add_all([cls, sem1, sem2])
        await session.flush()

        subject1 = Subject(class_id=cls.id, name="국어")
        subject2 = Subject(class_id=cls.id, name="수학")
        session.add_all([subject1, subject2])
        await session.flush()

        student = Student(user_id=student_user.id, class_id=cls.id, student_number=1)
        other_student = Student(user_id=other_student_user.id, class_id=cls.id, student_number=2)
        session.add_all([student, other_student])
        await session.flush()

        session.add(ParentStudent(parent_id=parent_user.id, student_id=student.id))

        session.add_all(
            [
                Grade(
                    student_id=student.id,
                    subject_id=subject1.id,
                    semester_id=sem1.id,
                    score=Decimal("95.0"),
                    grade_rank=2,
                    created_by=teacher.id,
                ),
                Grade(
                    student_id=student.id,
                    subject_id=subject2.id,
                    semester_id=sem1.id,
                    score=Decimal("81.0"),
                    grade_rank=3,
                    created_by=teacher.id,
                ),
                Grade(
                    student_id=student.id,
                    subject_id=subject1.id,
                    semester_id=sem2.id,
                    score=Decimal("89.0"),
                    grade_rank=2,
                    created_by=teacher.id,
                ),
                Grade(
                    student_id=other_student.id,
                    subject_id=subject1.id,
                    semester_id=sem1.id,
                    score=Decimal("70.0"),
                    grade_rank=4,
                    created_by=teacher.id,
                ),
            ]
        )

        session.add_all(
            [
                Feedback(
                    student_id=student.id,
                    teacher_id=teacher.id,
                    category="score",
                    content="학생만 공개",
                    is_visible_to_student=True,
                    is_visible_to_parent=False,
                ),
                Feedback(
                    student_id=student.id,
                    teacher_id=teacher.id,
                    category="attendance",
                    content="학부모만 공개",
                    is_visible_to_student=False,
                    is_visible_to_parent=True,
                ),
                Feedback(
                    student_id=student.id,
                    teacher_id=teacher.id,
                    category="behavior",
                    content="둘 다 공개",
                    is_visible_to_student=True,
                    is_visible_to_parent=True,
                ),
                Feedback(
                    student_id=student.id,
                    teacher_id=teacher.id,
                    category="attitude",
                    content="비공개",
                    is_visible_to_student=False,
                    is_visible_to_parent=False,
                ),
                Feedback(
                    student_id=other_student.id,
                    teacher_id=teacher.id,
                    category="score",
                    content="다른 학생 공개",
                    is_visible_to_student=True,
                    is_visible_to_parent=True,
                ),
            ]
        )

        await session.commit()
        return {
            "student_user": student_user,
            "parent_user": parent_user,
            "student": student,
            "other_student": other_student,
            "sem1": sem1,
            "sem2": sem2,
        }


@pytest.mark.asyncio
async def test_student_my_grades_ignore_foreign_student_id():
    seeded = await _seed_my_view_fixture()

    async with await _auth_client_for(seeded["student_user"]) as client:
        res = await client.get(
            "/api/v1/my/grades",
            params={
                "student_id": str(seeded["other_student"].id),
                "semester_id": str(seeded["sem1"].id),
            },
        )

    assert res.status_code == 200
    body = res.json()
    assert len(body) == 2
    assert all(item["student_id"] == str(seeded["student"].id) for item in body)


@pytest.mark.asyncio
async def test_student_my_grade_summary_filters_by_semester():
    seeded = await _seed_my_view_fixture()

    async with await _auth_client_for(seeded["student_user"]) as client:
        sem1_res = await client.get(
            "/api/v1/my/grades/summary",
            params={"semester_id": str(seeded["sem1"].id)},
        )
        sem2_res = await client.get(
            "/api/v1/my/grades/summary",
            params={"semester_id": str(seeded["sem2"].id)},
        )

    assert sem1_res.status_code == 200
    assert sem1_res.json()["total_score"] == 176.0
    assert sem1_res.json()["average_score"] == 88.0
    assert sem1_res.json()["subject_count"] == 2

    assert sem2_res.status_code == 200
    assert sem2_res.json()["total_score"] == 89.0
    assert sem2_res.json()["average_score"] == 89.0
    assert sem2_res.json()["subject_count"] == 1


@pytest.mark.asyncio
async def test_student_my_feedbacks_only_student_visible_items():
    seeded = await _seed_my_view_fixture()

    async with await _auth_client_for(seeded["student_user"]) as client:
        res = await client.get("/api/v1/my/feedbacks")

    assert res.status_code == 200
    contents = [item["content"] for item in res.json()]
    assert contents == ["둘 다 공개", "학생만 공개"]


@pytest.mark.asyncio
async def test_parent_my_grades_forbidden_for_unlinked_child():
    seeded = await _seed_my_view_fixture()

    async with await _auth_client_for(seeded["parent_user"]) as client:
        res = await client.get(
            "/api/v1/my/grades",
            params={
                "student_id": str(seeded["other_student"].id),
                "semester_id": str(seeded["sem1"].id),
            },
        )

    assert res.status_code == 403
    assert res.json() == {"detail": "권한이 부족합니다.", "code": "FORBIDDEN"}


@pytest.mark.asyncio
async def test_parent_my_feedbacks_only_parent_visible_items():
    seeded = await _seed_my_view_fixture()

    async with await _auth_client_for(seeded["parent_user"]) as client:
        res = await client.get(
            "/api/v1/my/feedbacks",
            params={"student_id": str(seeded["student"].id)},
        )

    assert res.status_code == 200
    contents = [item["content"] for item in res.json()]
    assert contents == ["둘 다 공개", "학부모만 공개"]
