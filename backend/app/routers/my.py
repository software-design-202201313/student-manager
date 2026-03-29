import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.grade import GradeResponse, GradeSummaryResponse
from app.schemas.user import StudentResponse
from app.schemas.subject import SubjectResponse
from app.services import my as mysvc
from datetime import date

router = APIRouter(prefix="/my", tags=["my"]) 


@router.get("/students", response_model=list[StudentResponse])
async def my_students(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    rows = await mysvc.list_my_students(db, current_user=current_user)
    items: list[StudentResponse] = []
    for student, user in rows:
        items.append(
            StudentResponse(
                id=str(student.id),
                user_id=str(user.id),
                class_id=str(student.class_id),
                student_number=student.student_number,
                name=user.name,
            )
        )
    return items


@router.get("/grades", response_model=list[GradeResponse])
async def my_grades(
    student_id: Optional[str] = Query(default=None),
    semester_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = uuid.UUID(student_id) if student_id else None
    sem = uuid.UUID(semester_id) if semester_id else None
    rows = await mysvc.list_my_grades(db, current_user=current_user, student_id=sid, semester_id=sem)
    return [
        GradeResponse(
            id=str(g.id),
            student_id=str(g.student_id),
            subject_id=str(g.subject_id),
            semester_id=str(g.semester_id),
            score=g.score,
            grade_rank=g.grade_rank,
        )
        for g in rows
    ]


@router.get("/grades/summary", response_model=GradeSummaryResponse)
async def my_grade_summary(
    student_id: Optional[str] = Query(default=None),
    semester_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = uuid.UUID(student_id) if student_id else None
    sem = uuid.UUID(semester_id) if semester_id else None
    result = await mysvc.get_my_grade_summary(db, current_user=current_user, student_id=sid, semester_id=sem)
    grades = [
        GradeResponse(
            id=str(g.id),
            student_id=str(g.student_id),
            subject_id=str(g.subject_id),
            semester_id=str(g.semester_id),
            score=g.score,
            grade_rank=g.grade_rank,
        )
        for g in result["grades"]
    ]
    total = float(result["total"]) if result["total"] is not None else None
    average = float(result["average"]) if result["average"] is not None else None
    return GradeSummaryResponse(total_score=total, average_score=average, subject_count=result["count"], grades=grades)


@router.get("/subjects", response_model=list[SubjectResponse])
async def my_subjects(
    student_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = uuid.UUID(student_id) if student_id else None
    rows = await mysvc.list_my_subjects(db, current_user=current_user, student_id=sid)
    return [SubjectResponse(id=str(s.id), class_id=str(s.class_id), name=s.name) for s in rows]


@router.get("/feedbacks")
async def my_feedbacks(
    student_id: Optional[str] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Feedbacks are read from teacher table but filtered by visibility flags
    from sqlalchemy import select
    from app.models.feedback import Feedback
    from app.models.student import Student
    from app.models.parent_student import ParentStudent
    from app.errors import AppException

    # Resolve student scope
    sid: Optional[uuid.UUID] = None
    if current_user.role == "student":
        res = await db.execute(select(Student).where(Student.user_id == current_user.id))
        stu = res.scalar_one_or_none()
        if stu is None:
            raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
        sid = stu.id
    elif current_user.role == "parent":
        if not student_id:
            raise AppException(400, "student_id is required", "BAD_REQUEST")
        sid = uuid.UUID(student_id)
        link = await db.execute(
            select(ParentStudent).where(ParentStudent.parent_id == current_user.id, ParentStudent.student_id == sid)
        )
        if link.scalar_one_or_none() is None:
            raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    else:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    # Build visibility condition
    vis = Feedback.is_visible_to_student if current_user.role == "student" else Feedback.is_visible_to_parent
    stmt = select(Feedback).where(Feedback.student_id == sid, vis == True).order_by(Feedback.created_at.desc())
    if limit and limit > 0:
        stmt = stmt.limit(limit)
    rows = (await db.execute(stmt)).scalars().all()
    return [
        {
            "id": str(fb.id),
            "student_id": str(fb.student_id),
            "teacher_id": str(fb.teacher_id),
            "category": fb.category,
            "content": fb.content,
            "is_visible_to_student": fb.is_visible_to_student,
            "is_visible_to_parent": fb.is_visible_to_parent,
            "created_at": fb.created_at,
        }
        for fb in rows
    ]


@router.get("/attendance/summary")
async def my_attendance_summary(
    student_id: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sid = uuid.UUID(student_id) if student_id else None
    result = await mysvc.attendance_summary(
        db, current_user=current_user, student_id=sid, start_date=start_date, end_date=end_date
    )
    return result
