"""add_fee_structures

Revision ID: 7dfdfdfada2a
Revises: 6c0150ccdc5c
Create Date: 2026-03-11 17:25:42.343270

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mssql

# revision identifiers, used by Alembic.
revision: str = '7dfdfdfada2a'
down_revision: Union[str, Sequence[str], None] = '6c0150ccdc5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema strictly for the 4 Fee Structure tables."""
    
    # 1. academic_years
    op.create_table(
        'academic_years',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('is_current', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('is_active', mssql.BIT(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('GETDATE()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='NO ACTION'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_academic_years_id'), 'academic_years', ['id'], unique=False)
    # The prompt asked for this unique constraint
    op.create_unique_constraint('uq_academic_years_tenant_code', 'academic_years', ['tenant_id', 'code'])

    # 2. classes
    op.create_table(
        'classes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=50), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('section', sa.String(length=50), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('is_active', mssql.BIT(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('GETDATE()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='NO ACTION'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_classes_id'), 'classes', ['id'], unique=False)

    # 3. fee_structures
    op.create_table(
        'fee_structures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('tenant_id', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.Integer(), nullable=False),
        sa.Column('fee_category_id', sa.String(length=36), nullable=False),
        sa.Column('academic_year_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('installment_type', sa.String(length=20), nullable=False),
        sa.Column('num_installments', sa.Integer(), nullable=False),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('is_active', mssql.BIT(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('GETDATE()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['academic_year_id'], ['academic_years.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['fee_category_id'], ['fee_categories.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='NO ACTION'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fee_structures_id'), 'fee_structures', ['id'], unique=False)

    # 4. fee_installments
    op.create_table(
        'fee_installments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('fee_structure_id', sa.Integer(), nullable=False),
        sa.Column('installment_number', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('due_date', sa.Date(), nullable=False),
        sa.Column('late_fee_applicable', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('late_fee_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('late_fee_percentage', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('description', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('GETDATE()')),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.Column('is_deleted', mssql.BIT(), nullable=False, server_default='0'),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('deleted_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['deleted_by'], ['users.id'], ondelete='NO ACTION'),
        sa.ForeignKeyConstraint(['fee_structure_id'], ['fee_structures.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='NO ACTION'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_fee_installments_id'), 'fee_installments', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # 4. fee_installments
    op.drop_index(op.f('ix_fee_installments_id'), table_name='fee_installments')
    op.drop_table('fee_installments')

    # 3. fee_structures
    op.drop_index(op.f('ix_fee_structures_id'), table_name='fee_structures')
    op.drop_table('fee_structures')

    # 2. classes
    op.drop_index(op.f('ix_classes_id'), table_name='classes')
    op.drop_table('classes')

    # 1. academic_years
    op.drop_constraint('uq_academic_years_tenant_code', 'academic_years', type_='unique')
    op.drop_index(op.f('ix_academic_years_id'), table_name='academic_years')
    op.drop_table('academic_years')
