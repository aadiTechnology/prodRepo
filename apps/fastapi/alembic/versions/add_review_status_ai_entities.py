"""add review_status to user_stories and test_cases

Revision ID: add_review_status_ai
Revises: add_tenant_theme_template
Create Date: 2026-03-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_review_status_ai"
down_revision = "add_tenant_theme_template"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_stories",
        sa.Column("review_status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")),
    )
    op.add_column(
        "test_cases",
        sa.Column("review_status", sa.String(length=20), nullable=False, server_default=sa.text("'draft'")),
    )


def downgrade() -> None:
    op.drop_column("test_cases", "review_status")
    op.drop_column("user_stories", "review_status")
