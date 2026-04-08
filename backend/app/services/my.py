import uuid
from typing import List, Optional, Tuple
from datetime import date, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppException
from app.models.grade import Grade
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.subject import Subject
from app.models.attendance import Attendance
from app.models.user import User


async def _get_current_student_id(db: AsyncSession, *, current_user: User) -> uuid.UUID:
    if current_user.role != "student":
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    result = await db.execute(select(Student).where(Student.user_id == current_user.id))
    student = result.scalar_one_or_none()
    if student is None:
        raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
    return student.id


async def _ensure_parent_can_access_student(db: AsyncSession, *, parent_id: uuid.UUID, student_id: uuid.UUID) -> None:
    # Parent must be linked to the student
    result = await db.execute(
        select(ParentStudent).where(
            ParentStudent.parent_id == parent_id, ParentStudent.student_id == student_id
        )
    )
    if result.scalar_one_or_none() is None:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")


async def list_my_students(db: AsyncSession, *, current_user: User) -> List[Tuple[Student, User]]:
    from app.models.user import User as UserModel

    if current_user.role == "student":
        # Return self
        result = await db.execute(
            select(Student, UserModel).join(UserModel, Student.user_id == UserModel.id).where(Student.user_id == current_user.id)
        )
        rows = result.all()
        if not rows:
            raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
        return rows
    if current_user.role == "parent":
        # Return linked children
        result = await db.execute(
            select(Student, UserModel)
            .join(UserModel, Student.user_id == UserModel.id)
            .join(ParentStudent, ParentStudent.student_id == Student.id)
            .where(ParentStudent.parent_id == current_user.id)
        )
        return result.all()
    raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")


async def list_my_grades(
    db: AsyncSession,
    *,
    current_user: User,
    student_id: Optional[uuid.UUID],
    semester_id: Optional[uuid.UUID],
) -> List[Grade]:
    # Resolve target student id
    if current_user.role == "student":
        sid = await _get_current_student_id(db, current_user=current_user)
    elif current_user.role == "parent":
        if student_id is None:
            raise AppException(400, "student_id is required", "BAD_REQUEST")
        await _ensure_parent_can_access_student(db, parent_id=current_user.id, student_id=student_id)
        sid = student_id
    else:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    stmt = select(Grade).where(Grade.student_id == sid)
    if semester_id is not None:
        stmt = stmt.where(Grade.semester_id == semester_id)
    result = await db.execute(stmt)
    return result.scalars().all()


async def get_my_grade_summary(
    db: AsyncSession,
    *,
    current_user: User,
    student_id: Optional[uuid.UUID],
    semester_id: Optional[uuid.UUID],
):
    # Resolve target student id
    if current_user.role == "student":
        sid = await _get_current_student_id(db, current_user=current_user)
    elif current_user.role == "parent":
        if student_id is None:
            raise AppException(400, "student_id is required", "BAD_REQUEST")
        await _ensure_parent_can_access_student(db, parent_id=current_user.id, student_id=student_id)
        sid = student_id
    else:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    agg_stmt = select(
        func.sum(Grade.score), func.avg(Grade.score), func.count(Grade.id)
    ).where(Grade.student_id == sid, Grade.score.isnot(None))
    if semester_id is not None:
        agg_stmt = agg_stmt.where(Grade.semester_id == semester_id)
    total, average, count = (await db.execute(agg_stmt)).one_or_none() or (None, None, 0)

    # also list grades for the same scope
    rows_stmt = select(Grade).where(Grade.student_id == sid)
    if semester_id is not None:
        rows_stmt = rows_stmt.where(Grade.semester_id == semester_id)
    grades = (await db.execute(rows_stmt)).scalars().all()

    return {
        "total": total,
        "average": average,
        "count": int(count or 0),
        "grades": grades,
    }


async def list_my_subjects(
    db: AsyncSession,
    *,
    current_user: User,
    student_id: Optional[uuid.UUID],
) -> List[Subject]:
    # Resolve target student id and class
    if current_user.role == "student":
        sid = await _get_current_student_id(db, current_user=current_user)
    elif current_user.role == "parent":
        if student_id is None:
            raise AppException(400, "student_id is required", "BAD_REQUEST")
        await _ensure_parent_can_access_student(db, parent_id=current_user.id, student_id=student_id)
        sid = student_id
    else:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    # fetch student's class
    student = (await db.execute(select(Student).where(Student.id == sid))).scalar_one()
    result = await db.execute(select(Subject).where(Subject.class_id == student.class_id))
    return result.scalars().all()


async def attendance_summary(
    db: AsyncSession,
    *,
    current_user: User,
    student_id: Optional[uuid.UUID],
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
):
    # Resolve target student id
    if current_user.role == "student":
        sid = await _get_current_student_id(db, current_user=current_user)
    elif current_user.role == "parent":
        if student_id is None:
            raise AppException(400, "student_id is required", "BAD_REQUEST")
        await _ensure_parent_can_access_student(db, parent_id=current_user.id, student_id=student_id)
        sid = student_id
    else:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")

    # Default range: last 30 days
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=29)

    # Aggregate counts and collect dates per status
    from sqlalchemy import case
    stmt = (
        select(
            func.sum(case((Attendance.status == "present", 1), else_=0)),
            func.sum(case((Attendance.status == "absent", 1), else_=0)),
            func.sum(case((Attendance.status == "late", 1), else_=0)),
            func.sum(case((Attendance.status == "early_leave", 1), else_=0)),
        )
        .where(Attendance.student_id == sid, Attendance.date >= start_date, Attendance.date <= end_date)
    )
    present, absent, late, early_leave = (await db.execute(stmt)).one_or_none() or (0, 0, 0, 0)

    # Daily series (counts per day) and status-specific date lists
    series = []
    cur = start_date
    while cur <= end_date:
        series.append({"date": cur.isoformat(), "count": 0})
        cur += timedelta(days=1)
    if series:
        # fetch raw rows and fill series + status lists
        rows = (
            await db.execute(
                select(Attendance.date, Attendance.status).where(
                    Attendance.student_id == sid, Attendance.date >= start_date, Attendance.date <= end_date
                )
            )
        ).all()
        idx = {item["date"]: i for i, item in enumerate(series)}
        present_dates: list[str] = []
        absent_dates: list[str] = []
        late_dates: list[str] = []
        early_leave_dates: list[str] = []
        for d, status in rows:
            key = d.isoformat()
            if key in idx:
                series[idx[key]]["count"] += 1
            if status == "present":
                present_dates.append(key)
            elif status == "absent":
                absent_dates.append(key)
            elif status == "late":
                late_dates.append(key)
            elif status == "early_leave":
                early_leave_dates.append(key)
    else:
        present_dates = []
        absent_dates = []
        late_dates = []
        early_leave_dates = []

    return {
        "present": int(present or 0),
        "absent": int(absent or 0),
        "late": int(late or 0),
        "early_leave": int(early_leave or 0),
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "series": series,
        "present_dates": present_dates,
        "absent_dates": absent_dates,
        "late_dates": late_dates,
        "early_leave_dates": early_leave_dates,
    }
