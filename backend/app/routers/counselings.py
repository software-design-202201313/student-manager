import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import require_role
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.counseling import CounselingCreate, CounselingResponse
from app.services.counseling import create_counseling, list_counselings, update_counseling

router = APIRouter(prefix="/counselings", tags=["counselings"]) 


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
    return CounselingResponse(
        id=str(cs.id),
        student_id=str(cs.student_id),
        teacher_id=str(cs.teacher_id),
        date=cs.date,
        content=cs.content,
        next_plan=cs.next_plan,
        is_shared=cs.is_shared,
        created_at=cs.created_at,
    )


@router.get("", response_model=list[CounselingResponse])
async def list_counselings_endpoint(
    student_id: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("teacher")),
):
    sid = uuid.UUID(student_id) if student_id else None
    rows = await list_counselings(db, teacher_id=current_user.id, student_id=sid)
    return [
        CounselingResponse(
            id=str(cs.id),
            student_id=str(cs.student_id),
            teacher_id=str(cs.teacher_id),
            date=cs.date,
            content=cs.content,
            next_plan=cs.next_plan,
            is_shared=cs.is_shared,
            created_at=cs.created_at,
        )
        for cs in rows
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
    return CounselingResponse(
        id=str(cs.id),
        student_id=str(cs.student_id),
        teacher_id=str(cs.teacher_id),
        date=cs.date,
        content=cs.content,
        next_plan=cs.next_plan,
        is_shared=cs.is_shared,
        created_at=cs.created_at,
    )

