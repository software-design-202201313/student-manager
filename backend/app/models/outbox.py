"""Outbox table for transactional outbox CDC pattern (ADR-002, Design Spec §9.1).

Operational routers (grade/attendance/feedback/counseling) INSERT into this
table within the same transaction as the domain write. The outbox-publisher
worker polls `WHERE sent_at IS NULL` and emits to Kafka.

Production schema uses JSONB + a partial index — see alembic 0005. The
SQLAlchemy mapping below is portable so SQLite-based unit tests can exercise
the rollback semantics without Postgres.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Outbox(Base):
    """Cross-platform mapping. Production schema (alembic 0005) uses BIGINT
    IDENTITY + JSONB + a partial index — SQLAlchemy reads/writes it through
    the simpler portable types below."""

    __tablename__ = "outbox"

    event_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    aggregate_type: Mapped[str] = mapped_column(String(50), nullable=False)
    aggregate_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    topic: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
