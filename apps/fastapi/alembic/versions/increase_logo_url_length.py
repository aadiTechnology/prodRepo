"""Increase logo_url length to support Base64 strings

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-04 20:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Increase logo_url length to max."""
    op.alter_column('tenants', 'logo_url',
               existing_type=sa.String(length=500),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    """Revert logo_url length to 500."""
    op.alter_column('tenants', 'logo_url',
               existing_type=sa.Text(),
               type_=sa.String(length=500),
               existing_nullable=True)
