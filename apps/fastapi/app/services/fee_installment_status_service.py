from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.models.student import Student
from app.repositories.fee_installment_status_repository import (
    fetch_fee_installment_status_rows,
)
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
    # Matches the user story example ("1st Quarter") while staying deterministic.
    if installment_number in (1, 2, 3, 4):
        return f"{_ordinal(installment_number)} Quarter"
    return f"{_ordinal(installment_number)} Installment"


def _to_decimal(v: float | int | Decimal) -> Decimal:
    if isinstance(v, Decimal):
        return v
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

    db_rows = fetch_fee_installment_status_rows(
        db=db,
        tenant_id=tenant_id,
        student_id=student_id,
        academic_year_id=academic_year_id,
        class_id=student.class_id,
    )

    # Defensive fallback:
    # If the UI passed an academic_year_id that doesn't match the student's
    # legacy academic_year string (common when tenant scoping or IDs drift),
    # try to resolve it and re-run the query.
    if not db_rows and getattr(student, "academic_year", None):
        academic_year_name = (student.academic_year or "").strip()
        if academic_year_name:
            from app.models.academic import AcademicYear

            fallback_ay = (
                db.query(AcademicYear)
                .filter(
                    AcademicYear.tenant_id == tenant_id,
                    (AcademicYear.name == academic_year_name) | (AcademicYear.code == academic_year_name),
                    AcademicYear.is_active == True,  # noqa: E712
                    AcademicYear.is_deleted == False,  # noqa: E712
                )
                .first()
            )
            if fallback_ay:
                db_rows = fetch_fee_installment_status_rows(
                    db=db,
                    tenant_id=tenant_id,
                    student_id=student_id,
                    academic_year_id=fallback_ay.id,
                    class_id=student.class_id,
                )

    today = date.today()
    installments: list[FeeInstallmentStatusItem] = []

    total_due = Decimal("0")
    total_paid = Decimal("0")
    total_balance = Decimal("0")

    # Sort by installment (quarter) serial order, then category, then due date
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

        # Status logic (exactly as specified; no SQL CASE)
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

