from __future__ import annotations

import pytest

from app.models import Class, Feedback, Grade, School, Semester, Student, Subject, User
from app.utils.security import hash_password
from tests.conftest import async_session_test


async def _create_teacher_client(*, school_name: str, teacher_email: str, teacher_name: str):
    async with async_session_test() as session:
        school = School(name=school_name)
        session.add(school)
        await session.flush()

        teacher = User(
            school_id=school.id,
            email=teacher_email,
            hashed_password=hash_password("password123"),
            role="teacher",
            name=teacher_name,
        )
        session.add(teacher)
        await session.flush()

        cls = Class(
            school_id=school.id,
            name="2-1",
            grade=2,
            year=2026,
            teacher_id=teacher.id,
        )
        sem = Semester(year=2026, term=1)
        session.add_all([cls, sem])
        await session.flush()

        subject = Subject(class_id=cls.id, name="Math")
        session.add(subject)
        await session.flush()

        student_user = User(
            school_id=school.id,
            email=f"{teacher_email.split('@')[0]}-student@example.com",
            hashed_password=hash_password("password123"),
            role="student",
            name="타학교학생",
        )
        session.add(student_user)
        await session.flush()

        student = Student(
            user_id=student_user.id,
            class_id=cls.id,
            student_number=1,
            birth_date=None,
        )
        session.add(student)
        await session.flush()

        grade = Grade(
            student_id=student.id,
            subject_id=subject.id,
            semester_id=sem.id,
            score=88,
            grade_rank=2,
            created_by=teacher.id,
        )
        feedback = Feedback(
            student_id=student.id,
            teacher_id=teacher.id,
            category="grade",
            content="타학교 피드백",
            is_visible_to_student=False,
            is_visible_to_parent=False,
        )
        session.add_all([grade, feedback])
        await session.commit()
        await session.refresh(teacher)
        await session.refresh(cls)
        await session.refresh(sem)
        await session.refresh(subject)
        await session.refresh(student)
        return {
            "school": school,
            "teacher": teacher,
            "class": cls,
            "semester": sem,
            "subject": subject,
            "student": student,
        }
@pytest.mark.asyncio
async def test_teacher_cannot_fetch_student_detail_from_other_school(auth_client_teacher):
    context = await _create_teacher_client(
        school_name="Other School A",
        teacher_email="other-a@example.com",
        teacher_name="다른교사A",
    )

    response = await auth_client_teacher.get(f"/api/v1/students/{context['student'].id}")

    assert response.status_code == 403
    assert response.json() == {"detail": "권한이 부족합니다.", "code": "FORBIDDEN"}


@pytest.mark.asyncio
async def test_teacher_cannot_list_grades_for_student_in_other_school(auth_client_teacher):
    context = await _create_teacher_client(
        school_name="Other School B",
        teacher_email="other-b@example.com",
        teacher_name="다른교사B",
    )

    response = await auth_client_teacher.get(
        "/api/v1/grades",
        params={
            "student_id": str(context["student"].id),
            "semester_id": str(context["semester"].id),
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "권한이 부족합니다.", "code": "FORBIDDEN"}


@pytest.mark.asyncio
async def test_teacher_cannot_create_feedback_for_student_in_other_school(auth_client_teacher):
    context = await _create_teacher_client(
        school_name="Other School C",
        teacher_email="other-c@example.com",
        teacher_name="다른교사C",
    )

    response = await auth_client_teacher.post(
        "/api/v1/feedbacks",
        json={
            "student_id": str(context["student"].id),
            "category": "grade",
            "content": "다른 학교 학생에게 남긴 피드백",
            "is_visible_to_student": False,
            "is_visible_to_parent": False,
        },
    )

    assert response.status_code == 403
    assert response.json() == {"detail": "권한이 부족합니다.", "code": "FORBIDDEN"}
