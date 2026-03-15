"""add depends_on_task_id to development_tasks

Revision ID: add_depends_on_task_id
Revises: add_development_tasks
Create Date: 2026-03-15

"""
from alembic import op
import sqlalchemy as sa

revision = "add_depends_on_task_id"
down_revision = "add_development_tasks"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "development_tasks",
        sa.Column("depends_on_task_id", sa.String(length=50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("development_tasks", "depends_on_task_id")
