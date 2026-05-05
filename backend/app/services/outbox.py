"""Outbox helpers shared between routers and the publisher worker."""
from __future__ import annotations

from datetime import datetime
from typing import Iterable

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import Outbox


async def fetch_unsent(db: AsyncSession, *, limit: int = 100) -> list[Outbox]:
    """Return the oldest unsent outbox rows, ordered by event_id ascending."""
    stmt = (
        select(Outbox)
        .where(Outbox.sent_at.is_(None))
        .order_by(Outbox.event_id)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def mark_sent(db: AsyncSession, event_ids: Iterable[int]) -> int:
    """Set sent_at = now() for the given event_ids; returns rows updated."""
    ids = list(event_ids)
    if not ids:
        return 0
    stmt = (
        update(Outbox)
        .where(Outbox.event_id.in_(ids))
        .values(sent_at=datetime.utcnow())
    )
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount or 0
