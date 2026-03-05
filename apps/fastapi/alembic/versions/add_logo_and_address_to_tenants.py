"""Add logo_url and address fields to tenants table

Revision ID: a1b2c3d4e5f6
Revises: add_user_role
Create Date: 2026-03-04 20:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'add_revoked_tokens'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add logo_url and address columns to tenants table."""
    op.add_column('tenants', sa.Column('logo_url', sa.String(length=500), nullable=True))
    op.add_column('tenants', sa.Column('address_line1', sa.String(length=200), nullable=True))
    op.add_column('tenants', sa.Column('address_line2', sa.String(length=200), nullable=True))
    op.add_column('tenants', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('state', sa.String(length=100), nullable=True))
    op.add_column('tenants', sa.Column('pin_code', sa.String(length=20), nullable=True))


def downgrade() -> None:
    """Remove logo_url and address columns from tenants table."""
    op.drop_column('tenants', 'pin_code')
    op.drop_column('tenants', 'state')
    op.drop_column('tenants', 'city')
    op.drop_column('tenants', 'address_line2')
    op.drop_column('tenants', 'address_line1')
    op.drop_column('tenants', 'logo_url')
  