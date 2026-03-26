from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.student import Student
from app.models.fee import FeeCategory, FeeInstallment, FeeStructure
from app.models.fee_payment import FeePayment
from app.schemas.fee_installment_status import (
    FeeInstallmentStatusItem,
    FeeInstallmentStatusResponse,
    FeeInstallmentStatusSummary,
)


def _ordinal(n: int) -> str:
    if 10 <= (n % 100) <= 20:
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suffix}"


def _installment_label(installment_number: int) -> str:
    if installment_number in (1, 2, 3, 4):
        return f"{_ordinal(installment_number)} Quarter"
    return f"{_ordinal(installment_number)} Installment"


def _to_decimal(v) -> Decimal:
    if isinstance(v, Decimal):
        return v
    if v is None:
        return Decimal("0")
    return Decimal(str(v))


def get_fee_installment_status(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
) -> FeeInstallmentStatusResponse:
    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id, Student.id == student_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", student_id)
    if not student.class_id:
        raise NotFoundException("Student class", f"student_id={student_id}")

    class_id = student.class_id

    # Get all fee installments for this student's class + academic year
    # Use the canonical fee structure per category (min id wins)
    canonical_structure_subq = (
        db.query(
            FeeStructure.fee_category_id,
            func.min(FeeStructure.id).label("canonical_id"),
        )
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.class_id == class_id,
            func.coalesce(FeeStructure.is_deleted, False) == False,
            func.coalesce(FeeStructure.is_active, True) == True,
        )
        .group_by(FeeStructure.fee_category_id)
    ).subquery()

    # Fetch installments with per-installment paid amounts from fee_payments
    # Uses fee_payments.fee_installment_id + fee_payments.paid_amount (direct columns in DB)
    q = (
        db.query(
            FeeInstallment.id.label("fee_installment_id"),
            FeeInstallment.installment_number.label("installment_number"),
            FeeCategory.name.label("fee_category_name"),
            FeeInstallment.due_date.label("due_date"),
            FeeInstallment.amount.label("amount"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            (FeePayment.student_id == student_id)
                            & (FeePayment.tenant_id == tenant_id)
                            & (FeePayment.fee_installment_id == FeeInstallment.id)
                            & (FeePayment.paid_amount.isnot(None)),
                            FeePayment.paid_amount,
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
            FeePayment,
            (FeePayment.fee_installment_id == FeeInstallment.id)
            & (FeePayment.student_id == student_id)
            & (FeePayment.tenant_id == tenant_id),
        )
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeCategory.tenant_id == tenant_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.class_id == class_id,
            func.coalesce(FeeStructure.is_deleted, False) == False,
            func.coalesce(FeeStructure.is_active, True) == True,
            func.coalesce(FeeInstallment.is_deleted, False) == False,
            FeeCategory.deleted_at.is_(None),
        )
        .group_by(
            FeeInstallment.id,
            FeeInstallment.installment_number,
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

    today = date.today()
    installments: list[FeeInstallmentStatusItem] = []
    total_due = Decimal("0")
    total_paid = Decimal("0")
    total_balance = Decimal("0")

    for r in q.all():
        amount = _to_decimal(r.amount)
        paid = _to_decimal(r.paid)
        balance = max(amount - paid, Decimal("0"))

        if paid >= amount and amount > 0:
            status = "Paid"
        elif paid > 0 and paid < amount:
            status = "Partial"
        elif r.due_date < today:
            status = "Overdue"
        else:
            status = "Pending"

        installments.append(
            FeeInstallmentStatusItem(
                fee_installment_id=int(r.fee_installment_id),
                installment=_installment_label(int(r.installment_number)),
                category=str(r.fee_category_name),
                due_date=r.due_date,
                amount=float(amount),
                paid=float(paid),
                balance=float(balance),
                status=status,
            )
        )

        total_due += amount
        total_paid += paid
        total_balance += balance

    return FeeInstallmentStatusResponse(
        summary=FeeInstallmentStatusSummary(
            total_due=float(total_due),
            total_paid=float(total_paid),
            outstanding_balance=float(total_balance),
        ),
        installments=installments,
    )
