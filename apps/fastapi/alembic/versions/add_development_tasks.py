"""add development_tasks table

Revision ID: add_development_tasks
Revises: 6c0150ccdc5c
Create Date: 2026-03-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "add_development_tasks"
down_revision = "6c0150ccdc5c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "development_tasks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_story_id", sa.Integer(), sa.ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task_id", sa.String(length=50), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("related_scenario", sa.String(length=500), nullable=False),
        sa.Column("component", sa.String(length=200), nullable=False),
        sa.Column("priority", sa.String(length=20), nullable=False),
        sa.Column("estimated_effort", sa.String(length=50), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_development_tasks_id", "development_tasks", ["id"], unique=False)
    op.create_index("ix_development_tasks_user_story_id", "development_tasks", ["user_story_id"], unique=False)
    op.create_index("ix_development_tasks_tenant_id", "development_tasks", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_development_tasks_tenant_id", table_name="development_tasks")
    op.drop_index("ix_development_tasks_user_story_id", table_name="development_tasks")
    op.drop_index("ix_development_tasks_id", table_name="development_tasks")
    op.drop_table("development_tasks")
