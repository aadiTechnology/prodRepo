"""merge_heads

Revision ID: 6c0150ccdc5c
Revises: add_fee_categories, b2c3d4e5f6g7
Create Date: 2026-03-11 16:55:03.998802

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6c0150ccdc5c'
down_revision: Union[str, Sequence[str], None] = ('add_fee_categories', 'b2c3d4e5f6g7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
