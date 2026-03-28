"""Add gender, phone, address to students

Revision ID: 0002_student_fields
Revises: 0001_initial
Create Date: 2026-03-28
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_student_fields"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("students", sa.Column("gender", sa.String(length=10), nullable=True))
    op.add_column("students", sa.Column("phone", sa.String(length=20), nullable=True))
    op.add_column("students", sa.Column("address", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("students", "address")
    op.drop_column("students", "phone")
    op.drop_column("students", "gender")

