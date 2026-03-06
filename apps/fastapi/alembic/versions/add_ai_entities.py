"""add AI entities (requirements, user_stories, test_cases)

Revision ID: add_ai_entities
Revises: add_revoked_tokens
Create Date: 2026-03-04 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_ai_entities"
down_revision = "add_revoked_tokens"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "requirements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_super_admin_accessible", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_requirements_id", "requirements", ["id"], unique=False)
    op.create_index("ix_requirements_tenant_id", "requirements", ["tenant_id"], unique=False)

    op.create_table(
        "user_stories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("requirement_id", sa.Integer(), sa.ForeignKey("requirements.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("prerequisite", sa.JSON(), nullable=True),
        sa.Column("story", sa.Text(), nullable=False),
        sa.Column("acceptance_criteria", sa.JSON(), nullable=True),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_super_admin_accessible", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_user_stories_id", "user_stories", ["id"], unique=False)
    op.create_index("ix_user_stories_requirement_id", "user_stories", ["requirement_id"], unique=False)
    op.create_index("ix_user_stories_tenant_id", "user_stories", ["tenant_id"], unique=False)

    op.create_table(
        "test_cases",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_story_id", sa.Integer(), sa.ForeignKey("user_stories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("test_case_id", sa.String(length=100), nullable=False),
        sa.Column("scenario", sa.String(length=1000), nullable=False),
        sa.Column("pre_requisite", sa.JSON(), nullable=True),
        sa.Column("test_data", sa.JSON(), nullable=True),
        sa.Column("steps", sa.JSON(), nullable=True),
        sa.Column("expected_result", sa.Text(), nullable=False),
        sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("is_super_admin_accessible", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.getutcdate()),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index("ix_test_cases_id", "test_cases", ["id"], unique=False)
    op.create_index("ix_test_cases_user_story_id", "test_cases", ["user_story_id"], unique=False)
    op.create_index("ix_test_cases_tenant_id", "test_cases", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_test_cases_tenant_id", table_name="test_cases")
    op.drop_index("ix_test_cases_user_story_id", table_name="test_cases")
    op.drop_index("ix_test_cases_id", table_name="test_cases")
    op.drop_table("test_cases")
    op.drop_index("ix_user_stories_tenant_id", table_name="user_stories")
    op.drop_index("ix_user_stories_requirement_id", table_name="user_stories")
    op.drop_index("ix_user_stories_id", table_name="user_stories")
    op.drop_table("user_stories")
    op.drop_index("ix_requirements_tenant_id", table_name="requirements")
    op.drop_index("ix_requirements_id", table_name="requirements")
    op.drop_table("requirements")
