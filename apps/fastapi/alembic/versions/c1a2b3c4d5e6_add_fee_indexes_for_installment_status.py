"""add fee indexes for installment status

Revision ID: c1a2b3c4d5e6
Revises: 6b810411b336
Create Date: 2026-03-17

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "c1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "6b810411b336"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Supports GET /api/fees/installment-status

    # fee_structures: tenant+year+class filtering + soft-delete flags, then join by id/category
    op.create_index(
        "ix_fee_structures_tenant_year_class_active",
        "fee_structures",
        ["tenant_id", "academic_year_id", "class_id", "is_deleted", "is_active"],
        unique=False,
        schema="dbo",
        mssql_include=["id", "fee_category_id"],
    )

    # fee_installments: join by structure_id and filter/order by due_date
    op.create_index(
        "ix_fee_installments_structure_deleted_due",
        "fee_installments",
        ["fee_structure_id", "is_deleted", "due_date"],
        unique=False,
        schema="dbo",
        mssql_include=["installment_number", "amount"],
    )

    # fee_payments: tenant+student filtering (used to scope allocations to a student)
    op.create_index(
        "ix_fee_payments_tenant_student",
        "fee_payments",
        ["tenant_id", "student_id"],
        unique=False,
        schema="dbo",
        mssql_include=["id", "payment_date"],
    )

    # fee_payment_allocations: tenant scoping + join/aggregate by installment/payment
    op.create_index(
        "ix_fee_payment_allocations_tenant_installment_payment",
        "fee_payment_allocations",
        ["tenant_id", "fee_installment_id", "payment_id"],
        unique=False,
        schema="dbo",
        mssql_include=["amount_allocated"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "ix_fee_payment_allocations_tenant_installment_payment",
        table_name="fee_payment_allocations",
        schema="dbo",
    )
    op.drop_index(
        "ix_fee_payments_tenant_student",
        table_name="fee_payments",
        schema="dbo",
    )
    op.drop_index(
        "ix_fee_installments_structure_deleted_due",
        table_name="fee_installments",
        schema="dbo",
    )
    op.drop_index(
        "ix_fee_structures_tenant_year_class_active",
        table_name="fee_structures",
        schema="dbo",
    )

