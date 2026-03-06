"""add requirement_hash to requirements

Revision ID: add_requirement_hash
Revises: add_ai_entities
Create Date: 2026-03-06 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_requirement_hash"
down_revision = "add_ai_entities"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("requirements", sa.Column("requirement_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_requirements_requirement_hash", "requirements", ["requirement_hash"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_requirements_requirement_hash", table_name="requirements")
    op.drop_column("requirements", "requirement_hash")
