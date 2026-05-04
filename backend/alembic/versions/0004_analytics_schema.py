"""Add analytics schema and 5 tables (fact / dim / agg)

Revision ID: 0004_analytics_schema
Revises: 0003_auth_onboarding_tokens
Create Date: 2026-05-04

Per Design Spec §9.1. Postgres-only — `CREATE SCHEMA` is a no-op on SQLite,
so existing SQLite-based unit tests are unaffected. Migration is intended
for the production Postgres target.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision = "0004_analytics_schema"
down_revision = "0003_auth_onboarding_tokens"
branch_labels = None
depends_on = None


SCHEMA = "analytics"


def _is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def upgrade() -> None:
    if not _is_postgres():
        return  # SQLite/other dialects skip — analytics layer ships on Postgres

    op.execute(f"CREATE SCHEMA IF NOT EXISTS {SCHEMA}")

    op.create_table(
        "fact_grade_event",
        sa.Column("event_id", sa.BigInteger, sa.Identity(always=False), primary_key=True),
        sa.Column("grade_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("semester_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("score", sa.Numeric(5, 2)),
        sa.Column("grade_rank", sa.SmallInteger),
        sa.Column("op", sa.String(10), nullable=False),
        sa.Column("occurred_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_fact_grade_event_student_occurred",
        "fact_grade_event",
        ["student_id", sa.text("occurred_at DESC")],
        schema=SCHEMA,
    )

    op.create_table(
        "fact_attendance_event",
        sa.Column("event_id", sa.BigInteger, sa.Identity(always=False), primary_key=True),
        sa.Column("attendance_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("student_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("status", sa.String(15), nullable=False),
        sa.Column("op", sa.String(10), nullable=False),
        sa.Column("occurred_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_fact_attendance_event_student_date",
        "fact_attendance_event",
        ["student_id", sa.text("date DESC")],
        schema=SCHEMA,
    )

    op.create_table(
        "dim_student",
        sa.Column("student_id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("school_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("class_id", pg.UUID(as_uuid=True)),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("seq_no", sa.Integer),
        sa.Column("refreshed_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_dim_student_class",
        "dim_student",
        ["class_id"],
        schema=SCHEMA,
    )

    op.create_table(
        "agg_student_subject",
        sa.Column("student_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("subject_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("semester_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("avg_score", sa.Numeric(5, 2)),
        sa.Column("max_score", sa.Numeric(5, 2)),
        sa.Column("min_score", sa.Numeric(5, 2)),
        sa.Column("latest_rank", sa.SmallInteger),
        sa.Column("sample_count", sa.Integer, nullable=False),
        sa.Column("refreshed_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("student_id", "subject_id", "semester_id"),
        schema=SCHEMA,
    )

    op.create_table(
        "agg_student_overall",
        sa.Column("student_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("semester_id", pg.UUID(as_uuid=True), nullable=False),
        sa.Column("total_score", sa.Numeric(7, 2)),
        sa.Column("avg_score", sa.Numeric(5, 2)),
        sa.Column("subject_count", sa.Integer, nullable=False),
        sa.Column("attendance_present_rate", sa.Numeric(4, 3)),
        sa.Column("feedback_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("refreshed_at", sa.TIMESTAMP, nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("student_id", "semester_id"),
        schema=SCHEMA,
    )


def downgrade() -> None:
    if not _is_postgres():
        return

    op.drop_table("agg_student_overall", schema=SCHEMA)
    op.drop_table("agg_student_subject", schema=SCHEMA)
    op.drop_index("ix_dim_student_class", table_name="dim_student", schema=SCHEMA)
    op.drop_table("dim_student", schema=SCHEMA)
    op.drop_index("ix_fact_attendance_event_student_date", table_name="fact_attendance_event", schema=SCHEMA)
    op.drop_table("fact_attendance_event", schema=SCHEMA)
    op.drop_index("ix_fact_grade_event_student_occurred", table_name="fact_grade_event", schema=SCHEMA)
    op.drop_table("fact_grade_event", schema=SCHEMA)
    op.execute(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE")
