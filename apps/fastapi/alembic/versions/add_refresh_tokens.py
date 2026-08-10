"""create refresh_tokens table (aligned with existing DB dump schema)

Revision ID: add_refresh_tokens
Revises: e5f6a7b8c9d0
Create Date: 2026-08-10 15:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision: str = "add_refresh_tokens"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = inspector.get_table_names()

    if "refresh_tokens" not in tables:
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("token", sa.String(length=512), nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False),
            sa.Column("is_revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("is_impersonation", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("original_user_id", sa.Integer(), nullable=True),
            sa.UniqueConstraint("token"),
        )
        op.create_index("ix_refresh_tokens_token", "refresh_tokens", ["token"])
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])
        return

    columns = {col["name"] for col in inspector.get_columns("refresh_tokens")}
    if "is_impersonation" not in columns:
        op.add_column(
            "refresh_tokens",
            sa.Column("is_impersonation", sa.Boolean(), nullable=False, server_default=sa.false()),
        )
    if "original_user_id" not in columns:
        op.add_column(
            "refresh_tokens",
            sa.Column("original_user_id", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    # Do not drop the table; it may pre-exist outside this migration chain.
    bind = op.get_bind()
    inspector = inspect(bind)
    if "refresh_tokens" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("refresh_tokens")}
    if "original_user_id" in columns:
        op.drop_column("refresh_tokens", "original_user_id")
    if "is_impersonation" in columns:
        op.drop_column("refresh_tokens", "is_impersonation")
