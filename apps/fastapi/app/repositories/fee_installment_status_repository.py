from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.fee import FeeCategory, FeeInstallment, FeeStructure
from app.models.fee_payment import FeePayment, FeePaymentAllocation


@dataclass(frozen=True)
class FeeInstallmentStatusDbRow:
    fee_installment_id: int
    installment_number: int
    fee_category_name: str
    due_date: date
    amount: float
    paid: float


def fetch_fee_installment_status_rows(
    *,
    db: Session,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
    class_id: int,
) -> list[FeeInstallmentStatusDbRow]:
    """
    Fetch installments with paid amounts for a specific student.
    Uses CASE WHEN to ensure only this student's allocations are summed.

    Deduplication: When multiple fee structures exist for the same
    (class, academic_year, fee_category), only the one with the lowest
    fee_structure.id is shown to avoid duplicate category rows.

    Returns one row per (installment, fee category).
    Sorted by: installment_number first, then category, then due_date.
    """
    from sqlalchemy import case

    # Subquery: one canonical fee_structure_id per (class, academic_year, fee_category)
    # Pick the structure with minimum id to avoid duplicates when multiple exist
    canonical_structure_subq = (
        db.query(
            FeeStructure.fee_category_id,
            func.min(FeeStructure.id).label("canonical_id"),
        )
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.class_id == class_id,
            func.coalesce(FeeStructure.is_deleted, False) == False,  # noqa: E712
            func.coalesce(FeeStructure.is_active, True) == True,  # noqa: E712
        )
        .group_by(FeeStructure.fee_category_id)
    ).subquery()

    q = (
        db.query(
            FeeInstallment.id.label("fee_installment_id"),
            FeeInstallment.installment_number.label("installment_number"),
            FeeCategory.id.label("fee_category_id"),
            FeeCategory.name.label("fee_category_name"),
            FeeInstallment.due_date.label("due_date"),
            FeeInstallment.amount.label("amount"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (FeePayment.student_id == student_id)
                            & (FeePayment.tenant_id == tenant_id),
                            FeePaymentAllocation.amount_allocated,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("paid"),
        )
        .join(FeeStructure, FeeStructure.id == FeeInstallment.fee_structure_id)
        .join(
            canonical_structure_subq,
            (FeeStructure.id == canonical_structure_subq.c.canonical_id)
            & (FeeStructure.fee_category_id == canonical_structure_subq.c.fee_category_id),
        )
        .join(FeeCategory, FeeCategory.id == FeeStructure.fee_category_id)
        .outerjoin(
            FeePaymentAllocation,
            FeePaymentAllocation.fee_installment_id == FeeInstallment.id,
        )
        .outerjoin(
            FeePayment,
            FeePaymentAllocation.payment_id == FeePayment.id,
        )
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeCategory.tenant_id == tenant_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.class_id == class_id,
            func.coalesce(FeeStructure.is_deleted, False) == False,  # noqa: E712
            func.coalesce(FeeStructure.is_active, True) == True,  # noqa: E712
            func.coalesce(FeeInstallment.is_deleted, False) == False,  # noqa: E712
            FeeCategory.deleted_at.is_(None),  # exclude soft-deleted categories
        )
        .group_by(
            FeeInstallment.id,
            FeeInstallment.installment_number,
            FeeCategory.id,
            FeeCategory.name,
            FeeInstallment.due_date,
            FeeInstallment.amount,
        )
        .order_by(
            FeeInstallment.installment_number.asc(),
            FeeCategory.name.asc(),
            FeeInstallment.due_date.asc(),
        )
    )

    rows: list[FeeInstallmentStatusDbRow] = []
    for r in q.all():
        rows.append(
            FeeInstallmentStatusDbRow(
                fee_installment_id=int(r.fee_installment_id),
                installment_number=int(r.installment_number),
                fee_category_name=str(r.fee_category_name),
                due_date=r.due_date,
                amount=float(r.amount or 0),
                paid=float(r.paid or 0),
            )
        )

    return rows

