import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import get_current_user
from app.dependencies.db import get_db
from app.models.user import User
from app.schemas.notification import NotificationPreferenceUpdate, NotificationResponse
from app.services.notification import (
    get_preferences,
    list_notifications,
    mark_all_read,
    mark_read,
    upsert_preferences,
)

router = APIRouter(prefix="/notifications", tags=["notifications"]) 


@router.get("", response_model=list[NotificationResponse])
async def list_my_notifications(
    is_read: Optional[bool] = Query(default=None),
    limit: Optional[int] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = await list_notifications(db, recipient_id=current_user.id, is_read=is_read, limit=limit)
    return [
        NotificationResponse(
            id=str(n.id), type=n.type, message=n.message, is_read=n.is_read, created_at=n.created_at
        )
        for n in items
    ]


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        n = await mark_read(db, notification_id=uuid.UUID(notification_id), recipient_id=current_user.id)
    except PermissionError:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="FORBIDDEN")
    except ValueError:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="NOT_FOUND")
    return NotificationResponse(
        id=str(n.id), type=n.type, message=n.message, is_read=n.is_read, created_at=n.created_at
    )


@router.patch("/read-all")
async def mark_all_my_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await mark_all_read(db, recipient_id=current_user.id)
    return {"updated": count}


@router.get("/preferences")
async def get_my_notification_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = await get_preferences(db, user_id=current_user.id)
    return {
        "grade_input": bool(pref.grade_input) if pref else True,
        "feedback_created": bool(pref.feedback_created) if pref else True,
        "counseling_updated": bool(pref.counseling_updated) if pref else True,
    }


@router.put("/preferences")
async def upsert_my_notification_preferences(
    body: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pref = await upsert_preferences(
        db,
        user_id=current_user.id,
        grade_input=body.grade_input,
        feedback_created=body.feedback_created,
        counseling_updated=body.counseling_updated,
    )
    return {
        "grade_input": pref.grade_input,
        "feedback_created": pref.feedback_created,
        "counseling_updated": pref.counseling_updated,
    }

