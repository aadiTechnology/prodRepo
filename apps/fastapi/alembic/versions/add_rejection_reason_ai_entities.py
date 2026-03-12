"""add rejection_reason to ai review entities

Revision ID: add_rejection_reason_ai
Revises: add_review_status_ai
Create Date: 2026-03-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_rejection_reason_ai"
down_revision = "add_review_status_ai"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("user_stories", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.add_column("test_cases", sa.Column("rejection_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("test_cases", "rejection_reason")
    op.drop_column("user_stories", "rejection_reason")
