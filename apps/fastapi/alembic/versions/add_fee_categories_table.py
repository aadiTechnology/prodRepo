"""add fee categories table

Revision ID: add_fee_categories
Revises: add_review_status_ai
Create Date: 2026-03-11 16:50:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

revision = 'add_fee_categories'
down_revision = 'add_review_status_ai'
branch_labels = None
depends_on = None


def upgrade():
    """Create fee_categories table."""
    
    op.create_table(
        'fee_categories',
        
        # Primary key (UUID/VARCHAR, not auto-increment)
        sa.Column('id', sa.String(length=36), nullable=False),
        
        # Core fields
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('status', mssql.BIT(), nullable=False, server_default='1'),
        
        # Audit fields
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('GETDATE()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('tenant_id', 'code', name='uq_fee_categories_tenant_code'),
        sa.UniqueConstraint('tenant_id', 'name', name='uq_fee_categories_tenant_name')
    )
    
    # Indexes
    op.create_index('ix_fee_categories_tenant_id', 'fee_categories', ['tenant_id'])
    op.create_index('ix_fee_categories_status', 'fee_categories', ['status'])
    op.create_index('ix_fee_categories_code', 'fee_categories', ['code'])


def downgrade():
    """Drop fee_categories table."""
    
    # Drop indexes
    op.drop_index('ix_fee_categories_code', table_name='fee_categories')
    op.drop_index('ix_fee_categories_status', table_name='fee_categories')
    op.drop_index('ix_fee_categories_tenant_id', table_name='fee_categories')
    
    # Drop table
    op.drop_table('fee_categories')
