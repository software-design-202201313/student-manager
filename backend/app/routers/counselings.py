import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.counseling import CounselingCreate, CounselingResponse
from app.services.counseling import create_counseling, delete_counseling, list_counselings, update_counseling
from app.services.notification import (
    build_counseling_notification_message,
    create_notification,
    get_peer_teacher_recipient_ids,
)

router = APIRouter(prefix="/counselings", tags=["counselings"]) 


async def _create_teacher_counseling_notification(db: AsyncSession, *, teacher: User, student_id: uuid.UUID):
    from sqlalchemy import select

    from app.models.student import Student

    result = await db.execute(select(Student, User).join(User, Student.user_id == User.id).where(Student.id == student_id))
    row = result.first()
    student_name = row[1].name if row else '학생'
    recipient_ids = await get_peer_teacher_recipient_ids(
        db,
        school_id=teacher.school_id,
        exclude_teacher_id=teacher.id,
    )
    for recipient_id in recipient_ids:
        await create_notification(
            db,
            recipient_id=recipient_id,
            type="counseling_updated",
            message=build_counseling_notification_message(teacher.name, student_name),
            related_id=student_id,
            related_type="counseling",
        )
    await db.commit()


@router.post("", response_model=CounselingResponse, status_code=status.HTTP_201_CREATED)
async def create_counseling_endpoint(
    body: CounselingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    cs = await create_counseling(
        db,
        student_id=uuid.UUID(body.student_id),
        teacher_id=current_user.id,
        date=body.date,
        content=body.content,
        next_plan=body.next_plan,
        is_shared=body.is_shared,
    )
    if cs.is_shared:
        await _create_teacher_counseling_notification(
            db,
            teacher=current_user,
            student_id=uuid.UUID(body.student_id),
        )
    return CounselingResponse(
        id=str(cs.id),
        student_id=str(cs.student_id),
        teacher_id=str(cs.teacher_id),
        student_name=None,
        teacher_name=current_user.name,
        date=cs.date,
        content=cs.content,
        next_plan=cs.next_plan,
        is_shared=cs.is_shared,
        created_at=cs.created_at,
    )


@router.get("", response_model=list[CounselingResponse])
async def list_counselings_endpoint(
    student_id: Optional[str] = Query(default=None),
    student_name: Optional[str] = Query(default=None),
    teacher_name: Optional[str] = Query(default=None),
    start_date: Optional[date] = Query(default=None),
    end_date: Optional[date] = Query(default=None),
    include_shared: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    sid = uuid.UUID(student_id) if student_id else None
    rows = await list_counselings(
        db,
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        student_id=sid,
        student_name=student_name,
        teacher_name=teacher_name,
        start_date=start_date,
        end_date=end_date,
        include_shared=include_shared,
    )
    return [
        CounselingResponse(
            id=str(cs.id),
            student_id=str(cs.student_id),
            teacher_id=str(cs.teacher_id),
            student_name=student_label,
            teacher_name=teacher_label,
            date=cs.date,
            content=cs.content,
            next_plan=cs.next_plan,
            is_shared=cs.is_shared,
            created_at=cs.created_at,
        )
        for cs, student_label, teacher_label in rows
    ]


@router.put("/{counseling_id}", response_model=CounselingResponse)
async def update_counseling_endpoint(
    counseling_id: str,
    body: CounselingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    cs = await update_counseling(
        db,
        counseling_id=uuid.UUID(counseling_id),
        teacher_id=current_user.id,
        content=body.content,
        next_plan=body.next_plan,
        is_shared=body.is_shared,
    )
    if cs.is_shared:
        await _create_teacher_counseling_notification(
            db,
            teacher=current_user,
            student_id=cs.student_id,
        )
    return CounselingResponse(
        id=str(cs.id),
        student_id=str(cs.student_id),
        teacher_id=str(cs.teacher_id),
        student_name=None,
        teacher_name=current_user.name,
        date=cs.date,
        content=cs.content,
        next_plan=cs.next_plan,
        is_shared=cs.is_shared,
        created_at=cs.created_at,
    )


@router.delete("/{counseling_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_counseling_endpoint(
    counseling_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    await delete_counseling(
        db,
        counseling_id=uuid.UUID(counseling_id),
        teacher_id=current_user.id,
    )
