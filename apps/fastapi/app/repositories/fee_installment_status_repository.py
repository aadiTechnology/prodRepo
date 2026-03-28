from __future__ import annotations

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


def _get_paid_for_installment(db: Session, student_id: int, installment_id: int, tenant_id: int) -> Decimal:
    """Sum all payments for an installment: direct FeePayment rows + allocation rows (collection API)."""
    direct = db.query(func.coalesce(func.sum(FeePayment.paid_amount), 0)).filter(
        FeePayment.student_id == student_id,
        FeePayment.fee_installment_id == installment_id,
        FeePayment.tenant_id == tenant_id,
        FeePayment.paid_amount.isnot(None),
    ).scalar()
    alloc_total = (
        db.query(func.coalesce(func.sum(FeePaymentAllocation.amount_allocated), 0))
        .join(FeePayment, FeePaymentAllocation.payment_id == FeePayment.id)
        .filter(
            FeePayment.student_id == student_id,
            FeePayment.tenant_id == tenant_id,
            FeePaymentAllocation.fee_installment_id == installment_id,
            FeePaymentAllocation.tenant_id == tenant_id,
        )
        .scalar()
    )
    return _to_decimal(direct) + _to_decimal(alloc_total)


def _get_fee_structures_for_student(db: Session, student: Student, tenant_id: int, academic_year_id: int):
    """
    Get fee structures for a student with strict academic year filtering.
    When academic_year_id is explicitly provided, only return structures for that year.
    """
    # Strategy 1: direct fee_structure_id on student (must match selected academic year when provided)
    if student.fee_structure_id:
        q = db.query(FeeStructure).filter(
            FeeStructure.id == student.fee_structure_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,  # noqa: E712
            FeeStructure.is_active == True,  # noqa: E712
        )
        if academic_year_id:
            q = q.filter(FeeStructure.academic_year_id == academic_year_id)
        structs = q.all()
        if structs:
            return structs

    # Strategy 2: class + academic year (strict filter when academic_year_id is provided)
    if student.class_id and academic_year_id:
        structs = db.query(FeeStructure).filter(
            FeeStructure.class_id == student.class_id,
            FeeStructure.academic_year_id == academic_year_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,
            FeeStructure.is_active == True,
        ).all()
        # Return even if empty - don't fall back to any year
        # This ensures academic year filtering is strictly respected
        return structs

    # Strategy 3: class only (only if no academic_year_id provided)
    # This is a safe fallback for legacy scenarios only
    if student.class_id and not academic_year_id:
        structs = db.query(FeeStructure).filter(
            FeeStructure.class_id == student.class_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,
            FeeStructure.is_active == True,
        ).all()
        if structs:
            return structs

    return []


def get_fee_installment_status(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
    class_id: int | None = None,
) -> FeeInstallmentStatusResponse:
    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id, Student.id == student_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", student_id)

    # When UI filters by class, only show data if the student belongs to that class
    if class_id is not None and student.class_id != class_id:
        return FeeInstallmentStatusResponse(
            summary=FeeInstallmentStatusSummary(total_due=0, total_paid=0, outstanding_balance=0),
            installments=[],
        )

    fee_structures = _get_fee_structures_for_student(db, student, tenant_id, academic_year_id)
    if not fee_structures:
        return FeeInstallmentStatusResponse(
            summary=FeeInstallmentStatusSummary(total_due=0, total_paid=0, outstanding_balance=0),
            installments=[],
        )

    installments: list[FeeInstallmentStatusItem] = []
    total_due = Decimal("0")
    total_paid = Decimal("0")
    total_balance = Decimal("0")
    today = date.today()

    for fs in fee_structures:
        fs_installments = db.query(FeeInstallment).filter(
            FeeInstallment.fee_structure_id == fs.id,
            FeeInstallment.is_deleted == False,
        ).order_by(FeeInstallment.installment_number.asc()).all()

        for inst in fs_installments:
            amount = _to_decimal(inst.amount)
            paid = _get_paid_for_installment(db, student_id, inst.id, tenant_id)
            # Match Ledger's cap: paid = min(paid, amount)
            # Use original paid for status, but capped for balance/totals if Ledger does it
            # Actually Ledger does: balance = max(amount - paid, 0.0) where paid is capped.
            paid_capped = min(paid, amount)
            balance = max(amount - paid_capped, Decimal("0"))
            
            # Category name
            fee_category_name = "Tuition"
            if inst.fee_category_id:
                cat = db.query(FeeCategory).filter(
                    FeeCategory.id == inst.fee_category_id,
                    FeeCategory.tenant_id == tenant_id
                ).first()
                if cat:
                    fee_category_name = cat.name
            elif hasattr(inst, 'description') and inst.description:
                fee_category_name = inst.description

            # Status (Sync with Ledger logic but keep Status page casing)
            if balance == 0 and amount > 0:
                status = "Paid"
            elif paid > 0 and balance > 0:
                status = "Partial"
            elif inst.due_date < today:
                status = "Overdue"
            else:
                status = "Pending"

            installments.append(
                FeeInstallmentStatusItem(
                    fee_installment_id=int(inst.id),
                    installment=_installment_label(int(inst.installment_number)),
                    category=str(fee_category_name),
                    due_date=inst.due_date,
                    amount=float(amount),
                    paid=float(paid_capped),
                    balance=float(balance),
                    status=status,
                )
            )

            total_due += amount
            total_paid += paid_capped
            total_balance += balance

    # Sort final list to match common view
    installments.sort(key=lambda x: (x.due_date, x.category))

    return FeeInstallmentStatusResponse(
        summary=FeeInstallmentStatusSummary(
            total_due=float(total_due),
            total_paid=float(total_paid),
            outstanding_balance=float(total_balance),
        ),
        installments=installments,
    )
