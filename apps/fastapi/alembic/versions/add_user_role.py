"""add user role

Revision ID: add_user_role
Revises: 36aa8dce1f55
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision = 'add_user_role'
down_revision = '36aa8dce1f55'
branch_labels = None
depends_on = None


def upgrade():
    # Add role column with default value 'user'
    # Using VARCHAR for SQL Server compatibility
    op.add_column('users', sa.Column('role', sa.String(length=20), nullable=False, server_default='user'))


def downgrade():
    # Remove role column
    op.drop_column('users', 'role')
