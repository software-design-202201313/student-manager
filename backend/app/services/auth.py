import datetime as dt
import uuid
from typing import Optional, Tuple

from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.errors import AppException
from app.models.password_reset_token import PasswordResetToken
from app.models.user_invitation import UserInvitation
from app.models.user import User
from app.utils.security import (
    create_access_token,
    create_refresh_token,
    generate_opaque_token,
    hash_opaque_token,
    verify_password,
)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def create_tokens(user: User) -> Tuple[str, str]:
    payload = {"sub": str(user.id), "role": user.role, "school_id": str(user.school_id)}
    access = create_access_token(payload)
    refresh = create_refresh_token(payload)
    return access, refresh


def get_refresh_cookie_max_age() -> int:
    return settings.refresh_token_expire_days * 24 * 60 * 60


async def issue_invitation(
    db: AsyncSession,
    *,
    user: User,
    invited_by: uuid.UUID | None,
) -> tuple[UserInvitation, str]:
    raw_token = generate_opaque_token()
    invitation = UserInvitation(
        user_id=user.id,
        invited_by=invited_by,
        token_hash=hash_opaque_token(raw_token),
        expires_at=dt.datetime.utcnow() + dt.timedelta(hours=settings.invite_token_expire_hours),
    )
    db.add(invitation)
    await db.flush()
    return invitation, raw_token


async def get_invitation_by_token(db: AsyncSession, *, token: str) -> tuple[UserInvitation, User]:
    result = await db.execute(
        select(UserInvitation, User)
        .join(User, UserInvitation.user_id == User.id)
        .where(UserInvitation.token_hash == hash_opaque_token(token))
    )
    row = result.first()
    if row is None:
        raise AppException(404, "유효하지 않은 초대 링크입니다.", "AUTH_INVITATION_NOT_FOUND")

    invitation, user = row
    now = dt.datetime.utcnow()
    if invitation.revoked_at is not None or invitation.accepted_at is not None or invitation.expires_at < now:
        raise AppException(410, "초대 링크가 만료되었습니다.", "AUTH_INVITATION_EXPIRED")
    return invitation, user


async def accept_invitation(db: AsyncSession, *, token: str, password_hash: str) -> User:
    invitation, user = await get_invitation_by_token(db, token=token)
    user.hashed_password = password_hash
    user.is_active = True
    invitation.accepted_at = dt.datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def issue_password_reset(db: AsyncSession, *, user: User) -> str:
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id, PasswordResetToken.used_at.is_(None)))
    raw_token = generate_opaque_token()
    reset_token = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_opaque_token(raw_token),
        expires_at=dt.datetime.utcnow() + dt.timedelta(minutes=settings.password_reset_token_expire_minutes),
    )
    db.add(reset_token)
    await db.commit()
    return raw_token


async def reset_password(db: AsyncSession, *, token: str, password_hash: str) -> User:
    result = await db.execute(
        select(PasswordResetToken, User)
        .join(User, PasswordResetToken.user_id == User.id)
        .where(PasswordResetToken.token_hash == hash_opaque_token(token))
    )
    row = result.first()
    if row is None:
        raise AppException(404, "유효하지 않은 비밀번호 재설정 링크입니다.", "AUTH_PASSWORD_RESET_NOT_FOUND")

    reset_token, user = row
    now = dt.datetime.utcnow()
    if reset_token.used_at is not None or reset_token.expires_at < now:
        raise AppException(410, "비밀번호 재설정 링크가 만료되었습니다.", "AUTH_PASSWORD_RESET_EXPIRED")

    user.hashed_password = password_hash
    user.is_active = True
    reset_token.used_at = now
    await db.commit()
    await db.refresh(user)
    return user
