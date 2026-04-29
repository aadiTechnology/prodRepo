"""Add bank transfer fields to fee_payments table

Revision ID: add_bank_transfer_fields
Revises: drop_pt_sprint_features
Create Date: 2026-04-28

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_bank_transfer_fields"
down_revision: Union[str, Sequence[str], None] = "drop_pt_sprint_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add bank_account_holder_name, bank_account_no, and ifsc_code columns to fee_payments table."""
    op.add_column('fee_payments', sa.Column('bank_account_holder_name', sa.String(length=100), nullable=True))
    op.add_column('fee_payments', sa.Column('bank_account_no', sa.String(length=20), nullable=True))
    op.add_column('fee_payments', sa.Column('ifsc_code', sa.String(length=11), nullable=True))


def downgrade() -> None:
    """Remove bank transfer columns from fee_payments table."""
    op.drop_column('fee_payments', 'ifsc_code')
    op.drop_column('fee_payments', 'bank_account_no')
    op.drop_column('fee_payments', 'bank_account_holder_name')
