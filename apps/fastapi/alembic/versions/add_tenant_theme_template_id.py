"""Add theme_template_id to tenants for tenant-template assignment

Revision ID: add_tenant_theme_template
Revises: add_theme_templates
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_tenant_theme_template"
down_revision: Union[str, Sequence[str], None] = "add_theme_templates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "tenants",
        sa.Column("theme_template_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_tenants_theme_template_id",
        "tenants",
        ["theme_template_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_tenants_theme_template_id",
        "tenants",
        "theme_templates",
        ["theme_template_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_tenants_theme_template_id", "tenants", type_="foreignkey")
    op.drop_index("ix_tenants_theme_template_id", table_name="tenants")
    op.drop_column("tenants", "theme_template_id")
