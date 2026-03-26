from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.student import Student
from app.models.fee import FeeCategory, FeeInstallment, FeeStructure
from app.models.fee_payment import FeePayment, FeePaymentAllocation
from app.schemas.fee_installment_status import (
    FeeInstallmentStatusItem,
    FeeInstallmentStatusResponse,
    FeeInstallmentStatusSummary,
)


@dataclass(frozen=True)
class FeeInstallmentStatusDbRow:
    fee_installment_id: int
    installment_number: int
    fee_category_name: str
    due_date: date
    amount: float
    paid: float


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


def _to_decimal(v: float | int | Decimal) -> Decimal:
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def fetch_fee_installment_status_rows(
    *,
    db: Session,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
    class_id: int,
) -> list[FeeInstallmentStatusDbRow]:
    from sqlalchemy import case

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
            func.coalesce(FeeStructure.is_deleted, False) == False,
            func.coalesce(FeeStructure.is_active, True) == True,
            func.coalesce(FeeInstallment.is_deleted, False) == False,
            FeeCategory.deleted_at.is_(None),
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

    db_rows = fetch_fee_installment_status_rows(
        db=db,
        tenant_id=tenant_id,
        student_id=student_id,
        academic_year_id=academic_year_id,
        class_id=student.class_id,
    )

    today = date.today()
    installments: list[FeeInstallmentStatusItem] = []

    total_due = Decimal("0")
    total_paid = Decimal("0")
    total_balance = Decimal("0")

    db_rows_sorted = sorted(
        db_rows,
        key=lambda r: (r.installment_number, r.fee_category_name, r.due_date),
    )

    for r in db_rows_sorted:
        amount = _to_decimal(r.amount)
        paid = _to_decimal(r.paid)
        balance = amount - paid
        if balance < 0:
            balance = Decimal("0")

        if paid >= amount and amount > 0:
            status = "Paid"
        elif paid > 0 and paid < amount:
            status = "Partial"
        elif paid == 0 and r.due_date >= today:
            status = "Pending"
        else:
            status = "Overdue"

        installments.append(
            FeeInstallmentStatusItem(
                fee_installment_id=r.fee_installment_id,
                installment=_installment_label(r.installment_number),
                category=r.fee_category_name,
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
