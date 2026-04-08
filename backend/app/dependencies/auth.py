import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.db import get_db
from app.errors import AppException
from app.models.user import User
from app.utils.security import decode_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise AppException(401, "인증이 필요합니다.", "AUTH_MISSING_TOKEN")

    payload = decode_token(credentials.credentials)
    if payload is None:
        raise AppException(401, "유효하지 않은 토큰입니다.", "AUTH_INVALID_TOKEN")

    user_id = payload.get("sub")
    if user_id is None:
        raise AppException(401, "유효하지 않은 토큰입니다.", "AUTH_INVALID_TOKEN")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        if user is not None and not user.is_active:
            raise AppException(401, "비활성화된 계정입니다.", "AUTH_ACCOUNT_INACTIVE")
        raise AppException(401, "유효하지 않은 토큰입니다.", "AUTH_INVALID_TOKEN")
    return user


def require_role(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise AppException(403, "권한이 부족합니다.", "INSUFFICIENT_ROLE")
        return current_user

    return role_checker
