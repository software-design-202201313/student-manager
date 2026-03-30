import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.parent_student import ParentStudent
from app.models.student import Student
from app.models.user import User
from app.schemas.feedback import FeedbackCreate, FeedbackResponse
from app.services.feedback import (
    create_feedback,
    delete_feedback,
    list_feedbacks_for_teacher,
    update_feedback,
)
from app.services.notification import create_notification, build_feedback_notification_message

router = APIRouter(prefix="/feedbacks", tags=["feedbacks"]) 


async def _create_feedback_notifications(
    db: AsyncSession,
    *,
    teacher: User,
    student_id: uuid.UUID,
    category: str,
    visible_to_student: bool,
    visible_to_parent: bool,
):
    student_result = await db.execute(select(Student, User).join(User, Student.user_id == User.id).where(Student.id == student_id))
    student_row = student_result.first()
    student, student_user = student_row if student_row else (None, None)
    student_name = student_user.name if student_user else '학생'

    recipients = {teacher.id}
    if student is not None and visible_to_student:
      recipients.add(student.user_id)

    if visible_to_parent and student is not None:
        parent_rows = await db.execute(select(ParentStudent.parent_id).where(ParentStudent.student_id == student.id))
        recipients.update(parent_id for parent_id in parent_rows.scalars().all())

    for recipient_id in recipients:
        await create_notification(
            db,
            recipient_id=recipient_id,
            type="feedback_created",
            message=build_feedback_notification_message(student_name, category),
            related_id=student_id,
            related_type="feedback",
        )

    await db.commit()


@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback_endpoint(
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    fb = await create_feedback(
        db,
        student_id=uuid.UUID(body.student_id),
        teacher_id=current_user.id,
        category=body.category,
        content=body.content,
        is_visible_to_student=body.is_visible_to_student,
        is_visible_to_parent=body.is_visible_to_parent,
    )
    await _create_feedback_notifications(
        db,
        teacher=current_user,
        student_id=fb.student_id,
        category=fb.category,
        visible_to_student=fb.is_visible_to_student,
        visible_to_parent=fb.is_visible_to_parent,
    )
    return FeedbackResponse(
        id=str(fb.id),
        student_id=str(fb.student_id),
        teacher_id=str(fb.teacher_id),
        category=fb.category,
        content=fb.content,
        is_visible_to_student=fb.is_visible_to_student,
        is_visible_to_parent=fb.is_visible_to_parent,
        created_at=fb.created_at,
    )


@router.get("", response_model=list[FeedbackResponse])
async def list_feedbacks_endpoint(
    student_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    sid = uuid.UUID(student_id) if student_id else None
    rows = await list_feedbacks_for_teacher(db, teacher_id=current_user.id, student_id=sid)
    return [
        FeedbackResponse(
            id=str(fb.id),
            student_id=str(fb.student_id),
            teacher_id=str(fb.teacher_id),
            category=fb.category,
            content=fb.content,
            is_visible_to_student=fb.is_visible_to_student,
            is_visible_to_parent=fb.is_visible_to_parent,
            created_at=fb.created_at,
        )
        for fb in rows
    ]


@router.put("/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_endpoint(
    feedback_id: str,
    body: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    fb = await update_feedback(
        db,
        feedback_id=uuid.UUID(feedback_id),
        teacher_id=current_user.id,
        content=body.content,
        is_visible_to_student=body.is_visible_to_student,
        is_visible_to_parent=body.is_visible_to_parent,
    )
    return FeedbackResponse(
        id=str(fb.id),
        student_id=str(fb.student_id),
        teacher_id=str(fb.teacher_id),
        category=fb.category,
        content=fb.content,
        is_visible_to_student=fb.is_visible_to_student,
        is_visible_to_parent=fb.is_visible_to_parent,
        created_at=fb.created_at,
    )


@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback_endpoint(
    feedback_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    await delete_feedback(db, feedback_id=uuid.UUID(feedback_id), teacher_id=current_user.id)
