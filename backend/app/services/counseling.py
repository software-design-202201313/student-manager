import uuid
from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import AppException
from app.models.class_ import Class
from app.models.counseling import Counseling
from app.models.student import Student


async def _student_with_class(db: AsyncSession, student_id: uuid.UUID):
    result = await db.execute(
        select(Student, Class).join(Class, Student.class_id == Class.id).where(Student.id == student_id)
    )
    return result.first()


async def create_counseling(
    db: AsyncSession,
    *,
    student_id: uuid.UUID,
    teacher_id: uuid.UUID,
    date,
    content: str,
    next_plan: str | None,
    is_shared: bool,
) -> Counseling:
    row = await _student_with_class(db, student_id)
    if row is None:
        raise AppException(404, "Student not found", "STUDENT_NOT_FOUND")
    student, cls = row
    if cls.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    cs = Counseling(
        student_id=student_id,
        teacher_id=teacher_id,
        date=date,
        content=content,
        next_plan=next_plan,
        is_shared=is_shared,
    )
    db.add(cs)
    await db.commit()
    await db.refresh(cs)
    return cs


async def update_counseling(
    db: AsyncSession,
    *,
    counseling_id: uuid.UUID,
    teacher_id: uuid.UUID,
    content: str | None = None,
    next_plan: str | None = None,
    is_shared: bool | None = None,
) -> Counseling:
    result = await db.execute(select(Counseling).where(Counseling.id == counseling_id))
    cs = result.scalar_one_or_none()
    if cs is None:
        raise AppException(404, "Counseling not found", "COUNSELING_NOT_FOUND")
    if cs.teacher_id != teacher_id:
        raise AppException(403, "권한이 부족합니다.", "FORBIDDEN")
    if content is not None:
        cs.content = content
    if next_plan is not None:
        cs.next_plan = next_plan
    if is_shared is not None:
        cs.is_shared = is_shared
    await db.commit()
    await db.refresh(cs)
    return cs


async def list_counselings(
    db: AsyncSession,
    *,
    teacher_id: uuid.UUID,
    student_id: Optional[uuid.UUID] = None,
) -> List[Counseling]:
    # Teachers can see their own; other teachers in same school can see shared
    # For MVP: return author's items; allow shared items from others for same student
    # Here we scope to: (author == teacher) OR (is_shared == True and same school via join)
    # Simplify: list only own items unless student_id provided; when provided, include shared items for that student
    if student_id is None:
        result = await db.execute(select(Counseling).where(Counseling.teacher_id == teacher_id).order_by(Counseling.date.desc()))
        return result.scalars().all()

    # include shared items for that student
    result = await db.execute(
        select(Counseling)
        .where(
            and_(
                Counseling.student_id == student_id,
                (Counseling.teacher_id == teacher_id) | (Counseling.is_shared.is_(True)),
            )
        )
        .order_by(Counseling.date.desc())
    )
    return result.scalars().all()
