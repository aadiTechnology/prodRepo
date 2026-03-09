"""Add theme_templates table for Theme Template Manager

Revision ID: add_theme_templates
Revises: add_requirement_hash
Create Date: 2026-03-08

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_theme_templates"
down_revision: Union[str, Sequence[str], None] = "add_requirement_hash"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "theme_templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("config", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("GETUTCDATE()")),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_theme_templates_id", "theme_templates", ["id"], unique=False)
    op.create_index("ix_theme_templates_name", "theme_templates", ["name"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_theme_templates_name", table_name="theme_templates")
    op.drop_index("ix_theme_templates_id", table_name="theme_templates")
    op.drop_table("theme_templates")
