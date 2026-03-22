"""
Initial empty revision for Student Manager

This project relies on SQLAlchemy Base.metadata.create_all during test/dev.
Generate a real schema migration via Alembic autogenerate before production.
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Intentionally empty — use autogenerate to create full tables from models.
    pass


def downgrade() -> None:
    pass

