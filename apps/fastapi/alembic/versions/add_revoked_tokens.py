"""add revoked_tokens table

Revision ID: add_revoked_tokens
Revises: add_rbac_models
Create Date: 2026-01-28 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "add_revoked_tokens"
down_revision = "add_rbac_models"

def upgrade():
    op.create_table(
        "revoked_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("token", sa.String(length=512), nullable=False, unique=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=False),
    )

def downgrade():
    op.drop_table("revoked_tokens")