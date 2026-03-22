import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference


async def create_notification(
    db: AsyncSession,
    *,
    recipient_id: uuid.UUID,
    type: str,
    message: str,
    related_id: uuid.UUID | None = None,
    related_type: str | None = None,
) -> Notification | None:
    """Create a notification if the recipient's preference allows it.

    Returns the Notification if created, None if suppressed by preference.
    """
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == recipient_id)
    )
    pref = result.scalar_one_or_none()

    if pref is not None:
        pref_map = {
            "grade_input": pref.grade_input,
            "feedback_created": pref.feedback_created,
            "counseling_updated": pref.counseling_updated,
        }
        if not pref_map.get(type, True):
            return None

    notification = Notification(
        recipient_id=recipient_id,
        type=type,
        message=message,
        related_id=related_id,
        related_type=related_type,
    )
    db.add(notification)
    return notification

