"""Backfill installment invoice amounts in student_invoices

Revision ID: backfill_invoice_installments
Revises: add_bank_transfer_fields
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "backfill_invoice_installments"
down_revision: Union[str, Sequence[str], None] = "add_bank_transfer_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix old generated installment invoices to use installment amount."""
    # Update only safe rows:
    # - installment text is present
    # - fee_installment_id is still missing
    # - invoice is unpaid (paid_amount = 0)
    # - due_amount equals total_amount
    # This avoids mutating historical paid/partial invoices.
    op.execute(
        """
        UPDATE si
        SET
            si.fee_installment_id = fi.id,
            si.total_amount = fi.amount,
            si.due_amount = fi.amount
        FROM student_invoices si
        INNER JOIN fee_structures fs ON fs.id = si.fee_structure_id
        INNER JOIN fee_installments fi
            ON fi.fee_structure_id = fs.id
            AND fi.is_deleted = 0
            AND (
                LTRIM(RTRIM(ISNULL(fi.description, ''))) = LTRIM(RTRIM(ISNULL(si.[Installment], '')))
                OR CONCAT('Installment ', CAST(fi.installment_number AS VARCHAR(10))) = LTRIM(RTRIM(ISNULL(si.[Installment], '')))
            )
        WHERE
            LTRIM(RTRIM(ISNULL(si.[Installment], ''))) <> ''
            AND si.fee_installment_id IS NULL
            AND ISNULL(si.paid_amount, 0) = 0
            AND ISNULL(si.due_amount, 0) = ISNULL(si.total_amount, 0);
        """
    )


def downgrade() -> None:
    """Rollback backfilled invoices to fee structure totals for same safe rows."""
    op.execute(
        """
        UPDATE si
        SET
            si.fee_installment_id = NULL,
            si.total_amount = fs.total_amount,
            si.due_amount = fs.total_amount
        FROM student_invoices si
        INNER JOIN fee_structures fs ON fs.id = si.fee_structure_id
        INNER JOIN fee_installments fi ON fi.id = si.fee_installment_id
        WHERE
            LTRIM(RTRIM(ISNULL(si.[Installment], ''))) <> ''
            AND ISNULL(si.paid_amount, 0) = 0
            AND ISNULL(si.due_amount, 0) = ISNULL(si.total_amount, 0)
            AND ISNULL(si.total_amount, 0) = ISNULL(fi.amount, 0);
        """
    )
