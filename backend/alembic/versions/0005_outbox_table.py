"""Add public.outbox table for transactional outbox pattern

Revision ID: 0005_outbox_table
Revises: 0004_analytics_schema
Create Date: 2026-05-04

Per Design Spec §9.1 / ADR-002. Operational routers (grade/attendance/feedback/
counseling) INSERT into public.outbox in the same transaction as the domain
write; outbox-publisher worker polls `WHERE sent_at IS NULL` and emits to Kafka.

Postgres-only: uses JSONB and a partial index. SQLite dialect short-circuits.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision = "0005_outbox_table"
down_revision = "0004_analytics_schema"
branch_labels = None
depends_on = None


def _is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    if not _is_postgres():
        return

    op.create_table(
        "outbox",
        sa.Column("event_id", sa.BigInteger, sa.Identity(always=False), primary_key=True),
        sa.Column("aggregate_type", sa.String(50), nullable=False),
        sa.Column("aggregate_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("topic", sa.String(50), nullable=False),
        sa.Column("payload", pg.JSONB, nullable=False),
        sa.Column("created_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.Column("sent_at", sa.TIMESTAMP, nullable=True),
        schema="public",
    )

    # Partial index: only covers unsent rows — keeps the publisher's
    # `WHERE sent_at IS NULL ORDER BY event_id` scan cheap as the table grows.
    op.execute(
        "CREATE INDEX outbox_unsent_idx ON public.outbox (event_id) WHERE sent_at IS NULL"
    )


def downgrade() -> None:
    if not _is_postgres():
        return

    op.execute("DROP INDEX IF EXISTS outbox_unsent_idx")
    op.drop_table("outbox", schema="public")
