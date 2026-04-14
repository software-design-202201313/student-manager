import uuid
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parent_student import ParentStudent
from app.models.notification import Notification
from app.models.notification_preference import NotificationPreference
from app.models.student import Student
from app.models.user import User


_GENERATED_NAME_SUFFIX_RE = re.compile(r"-notify-\d{10,}-[a-z0-9]+$", re.IGNORECASE)

_FEEDBACK_CATEGORY_LABELS = {
    "grade": "성적",
    "score": "성적",
    "behavior": "행동",
    "attendance": "출결",
    "attitude": "태도",
}


def clean_notification_label(value: str | None, *, fallback: str) -> str:
    label = (value or "").strip()
    if not label:
        return fallback

    cleaned = _GENERATED_NAME_SUFFIX_RE.sub("", label).strip(" -")
    return cleaned or fallback


def build_grade_notification_message(student_name: str | None, subject_name: str | None) -> str:
    student_label = clean_notification_label(student_name, fallback="학생")
    subject_label = clean_notification_label(subject_name, fallback="과목")
    return f"{student_label} · {subject_label} 성적이 저장되었어요."


def build_feedback_notification_message(student_name: str | None, category: str | None) -> str:
    student_label = clean_notification_label(student_name, fallback="학생")
    category_label = _FEEDBACK_CATEGORY_LABELS.get((category or "").strip().lower(), "새")
    return f"{student_label} · {category_label} 피드백이 등록되었어요."


def build_counseling_notification_message(teacher_name: str | None, student_name: str | None) -> str:
    teacher_label = clean_notification_label(teacher_name, fallback="교사")
    student_label = clean_notification_label(student_name, fallback="학생")
    return f"{teacher_label}님이 {student_label} 학생 상담 내역을 공유했습니다."


async def get_student_and_parent_recipient_ids(
    db: AsyncSession,
    *,
    student_id: uuid.UUID,
) -> tuple[uuid.UUID | None, list[uuid.UUID]]:
    student_result = await db.execute(select(Student.user_id).where(Student.id == student_id))
    student_user_id = student_result.scalar_one_or_none()

    parent_result = await db.execute(
        select(ParentStudent.parent_id).where(ParentStudent.student_id == student_id)
    )
    parent_ids = list(parent_result.scalars().all())

    return student_user_id, parent_ids


async def get_peer_teacher_recipient_ids(
    db: AsyncSession,
    *,
    school_id: uuid.UUID,
    exclude_teacher_id: uuid.UUID,
) -> list[uuid.UUID]:
    result = await db.execute(
        select(User.id)
        .where(
            User.school_id == school_id,
            User.role == "teacher",
            User.id != exclude_teacher_id,
        )
    )
    return list(result.scalars().all())


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


async def list_notifications(db: AsyncSession, *, recipient_id: uuid.UUID, is_read: bool | None = None, limit: int | None = None) -> list[Notification]:
    stmt = select(Notification).where(Notification.recipient_id == recipient_id).order_by(Notification.created_at.desc())
    if is_read is not None:
        stmt = stmt.where(Notification.is_read.is_(is_read))
    if limit is not None:
        stmt = stmt.limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


async def mark_read(db: AsyncSession, *, notification_id: uuid.UUID, recipient_id: uuid.UUID) -> Notification:
    result = await db.execute(select(Notification).where(Notification.id == notification_id))
    n = result.scalar_one_or_none()
    if n is None:
        raise ValueError("Notification not found")
    if n.recipient_id != recipient_id:
        raise PermissionError("FORBIDDEN")
    n.is_read = True
    await db.commit()
    await db.refresh(n)
    return n


async def mark_all_read(db: AsyncSession, *, recipient_id: uuid.UUID) -> int:
    items = await list_notifications(db, recipient_id=recipient_id, is_read=False)
    count = 0
    for n in items:
        n.is_read = True
        count += 1
    await db.commit()
    return count


async def get_preferences(db: AsyncSession, *, user_id: uuid.UUID) -> NotificationPreference | None:
    result = await db.execute(select(NotificationPreference).where(NotificationPreference.user_id == user_id))
    return result.scalar_one_or_none()


async def upsert_preferences(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    grade_input: bool | None,
    feedback_created: bool | None,
    counseling_updated: bool | None,
) -> NotificationPreference:
    pref = await get_preferences(db, user_id=user_id)
    if pref is None:
        pref = NotificationPreference(user_id=user_id)
        db.add(pref)
    if grade_input is not None:
        pref.grade_input = grade_input
    if feedback_created is not None:
        pref.feedback_created = feedback_created
    if counseling_updated is not None:
        pref.counseling_updated = counseling_updated
    await db.commit()
    await db.refresh(pref)
    return pref
