import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.user import (
    OnboardingResponse,
    ParentCreate,
    StudentCreate,
    StudentCreateResponse,
    StudentInvitationActionResponse,
    StudentResponse,
)
from app.services.user import (
    create_parent_account,
    create_student_account,
    deactivate_student,
    expire_student_invitation,
    list_students,
    resend_student_invitation,
)

router = APIRouter(prefix="/users", tags=["users"]) 


@router.post("/students", response_model=StudentCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: StudentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    user, student, invitation, invite_url = await create_student_account(
        db,
        school_id=current_user.school_id,
        teacher_id=current_user.id,
        data=body,
    )
    return StudentCreateResponse(
        id=str(student.id),
        user_id=str(student.user_id),
        class_id=str(student.class_id),
        student_number=student.student_number,
        name=user.name,
        email=user.email,
        account_status="pending_invite",
        invite_url=invite_url,
        invite_expires_at=invitation.expires_at.isoformat(),
        invite_status="pending",
        invite_sent_at=invitation.created_at.isoformat(),
        invite_resend_count=0,
    )


@router.post("/parents", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
async def create_parent(
    body: ParentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    parent, _, invitation, invite_url = await create_parent_account(
        db,
        teacher_id=current_user.id,
        school_id=current_user.school_id,
        data=body,
    )
    return OnboardingResponse(
        id=str(parent.id),
        email=parent.email,
        name=parent.name,
        role=parent.role,
        account_status="pending_invite",
        invite_url=invite_url,
        invite_expires_at=invitation.expires_at.isoformat(),
    )


@router.get("/students", response_model=list[StudentResponse])
async def get_students(
    class_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    cid = uuid.UUID(class_id) if class_id else None
    rows = await list_students(db, teacher_id=current_user.id, class_id=cid)
    items: list[StudentResponse] = []
    for student, user, invitation in rows:
        items.append(
            StudentResponse(
                id=str(student.id),
                user_id=str(user.id),
                class_id=str(student.class_id),
                student_number=student.student_number,
                name=user.name,
                email=user.email,
                account_status=invitation.account_status,
                invite_status=invitation.invite_status,
                invite_expires_at=invitation.invite_expires_at,
                invite_sent_at=invitation.invite_sent_at,
                invite_resend_count=invitation.invite_resend_count,
            )
        )
    return items


@router.post("/students/{student_id}/invitation/resend", response_model=StudentInvitationActionResponse)
async def resend_student_invitation_endpoint(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user, invitation, invite_url = await resend_student_invitation(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
    )
    return StudentInvitationActionResponse(
        id=str(student.id),
        user_id=str(user.id),
        account_status=invitation.account_status,
        invite_status=invitation.invite_status,
        invite_url=invite_url,
        invite_expires_at=invitation.invite_expires_at,
        invite_sent_at=invitation.invite_sent_at,
        invite_resend_count=invitation.invite_resend_count,
    )


@router.post("/students/{student_id}/invitation/expire", response_model=StudentInvitationActionResponse)
async def expire_student_invitation_endpoint(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    student, user, invitation = await expire_student_invitation(
        db,
        student_id=uuid.UUID(student_id),
        teacher_id=current_user.id,
    )
    return StudentInvitationActionResponse(
        id=str(student.id),
        user_id=str(user.id),
        account_status=invitation.account_status,
        invite_status=invitation.invite_status,
        invite_expires_at=invitation.invite_expires_at,
        invite_sent_at=invitation.invite_sent_at,
        invite_resend_count=invitation.invite_resend_count,
    )


@router.patch("/students/{student_id}/deactivate", status_code=204)
async def deactivate(
    student_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    await deactivate_student(db, student_id=uuid.UUID(student_id), teacher_id=current_user.id)
