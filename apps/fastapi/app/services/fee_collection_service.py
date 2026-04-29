from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from decimal import Decimal
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.academic import AcademicYear
from app.models.fee import FeeInstallment
from app.models.fee_payment import FeePayment, FeePaymentAllocation
from app.models.student import Student
from app.models.student_invoice import StudentInvoice
from app.models.student_fee_ledger import FeeLedger
from app.schemas.fee_collection import (
    FeePaymentCollectRequest, 
    FeePaymentCollectResponse,
    InvoicePaymentCollectRequest
)

_ALLOWED_PAYMENT_METHODS = {"CASH", "UPI", "CARD", "BANK_TRANSFER"}
_NON_CASH_PAYMENT_METHODS = _ALLOWED_PAYMENT_METHODS - {"CASH"}


def _validate_payment_metadata(payment_method: str, reference_no: str | None) -> tuple[str, str | None]:
    normalized_method = str(payment_method or "").strip().upper()
    if normalized_method not in _ALLOWED_PAYMENT_METHODS:
        raise ValidationException("Invalid payment method selected.")

    normalized_reference = (reference_no or "").strip() or None
    if normalized_method in _NON_CASH_PAYMENT_METHODS and not normalized_reference:
        raise ValidationException("Reference number required for selected mode.")

    if normalized_method == "CASH":
        return normalized_method, None

    return normalized_method, normalized_reference


def _generate_receipt_number(db: Session, tenant_id: int) -> str:
    """Generate a unique receipt number: RCP-{YYYYMM}-{next_seq}"""
    prefix = f"RCP-{datetime.utcnow().strftime('%Y%m')}"
    count = (
        db.query(FeePayment)
        .filter(
            FeePayment.tenant_id == tenant_id,
            FeePayment.receipt_number.like(f"{prefix}-%"),
        )
        .count()
    )
    return f"{prefix}-{count + 1:04d}"


def collect_payment(
    db: Session,
    *,
    tenant_id: int,
    user_id: int | None,
    req: FeePaymentCollectRequest,
) -> FeePaymentCollectResponse:
    payment_method, reference_no = _validate_payment_metadata(
        req.payment_method, req.reference_no
    )

    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id, Student.id == req.student_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", req.student_id)

    installment_ids = [a.fee_installment_id for a in req.allocations]
    installments = (
        db.query(FeeInstallment)
        .filter(
            FeeInstallment.id.in_(installment_ids),
            FeeInstallment.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    found_ids = {i.id for i in installments}
    missing = [i for i in installment_ids if i not in found_ids]
    if missing:
        raise NotFoundException("FeeInstallment", missing[0])

    inst_amounts = {i.id: float(i.amount) for i in installments}
    for a in req.allocations:
        if float(a.amount_allocated) > inst_amounts.get(a.fee_installment_id, 0.0):
            raise ConflictException("Allocated amount cannot exceed installment amount.")

    total_amount = float(sum(a.amount_allocated for a in req.allocations))

    receipt_number = _generate_receipt_number(db, tenant_id)

    payment = FeePayment(
        tenant_id=tenant_id,
        student_id=req.student_id,
        payment_date=datetime.utcnow(),
        payment_method=payment_method,
        reference_no=reference_no,
        total_amount=total_amount,
        notes=req.notes,
        created_by=user_id,
        payment_status="completed",
        receipt_number=receipt_number,
    )
    db.add(payment)
    db.flush()

    for a in req.allocations:
        db.add(
            FeePaymentAllocation(
                tenant_id=tenant_id,
                payment_id=payment.id,
                fee_installment_id=a.fee_installment_id,
                amount_allocated=a.amount_allocated,
                created_by=user_id,
            )
        )

    db.commit()
    db.refresh(payment)

    return FeePaymentCollectResponse(
        payment_id=payment.id,
        student_id=payment.student_id,
        total_amount=float(payment.total_amount),
        payment_date=payment.payment_date,
        receipt_number=payment.receipt_number,
    )


def collect_invoice_payment(
    db: Session,
    *,
    tenant_id: int,
    user_id: int | None,
    req: InvoicePaymentCollectRequest,
) -> FeePaymentCollectResponse:
    payment_method, reference_no = _validate_payment_metadata(
        req.payment_method, req.reference_no
    )

    # 1. Fetch Invoice
    invoice = (
        db.query(StudentInvoice)
        .filter(StudentInvoice.id == req.invoice_id, StudentInvoice.tenant_id == tenant_id)
        .first()
    )
    if not invoice:
        raise NotFoundException("Invoice", req.invoice_id)

    # 2. Validate: no overpayment
    due_amount = Decimal(str(invoice.due_amount))
    payment_amount = Decimal(str(req.payment_amount))

    if payment_amount <= 0:
        raise ValidationException("Payment amount must be greater than zero.")

    if payment_amount > due_amount:
        raise ValidationException(
            f"Payment amount {payment_amount} exceeds due amount {due_amount}"
        )

    # 3. Generate receipt number
    receipt_number = _generate_receipt_number(db, tenant_id)

    # 4. Create FeePayment — link to installment and academic year from invoice
    bank_account_holder_name = None
    bank_account_no = None
    ifsc_code = None
    if payment_method == "BANK_TRANSFER":
        bank_account_holder_name = (req.bank_account_holder_name or "").strip() or None
        bank_account_no = (req.bank_account_no or "").strip() or None
        ifsc_code = (req.ifsc_code or "").strip().upper() or None

    payment = FeePayment(
        tenant_id=tenant_id,
        student_id=invoice.student_id,
        payment_date=req.payment_date or datetime.utcnow(),
        payment_method=payment_method,
        reference_no=reference_no,
        total_amount=payment_amount,
        notes=req.notes,
        created_by=user_id,
        payment_status="completed",
        receipt_number=receipt_number,
        # Link to installment and year from the invoice
        fee_installment_id=invoice.fee_installment_id,
        academic_year_id=invoice.academic_year_id,
        bank_account_holder_name=bank_account_holder_name,
        bank_account_no=bank_account_no,
        ifsc_code=ifsc_code,
    )
    db.add(payment)
    db.flush()

    # 5. Create allocation record (if invoice is linked to an installment)
    if invoice.fee_installment_id:
        db.add(
            FeePaymentAllocation(
                tenant_id=tenant_id,
                payment_id=payment.id,
                fee_installment_id=invoice.fee_installment_id,
                amount_allocated=payment_amount,
                created_by=user_id,
            )
        )

    # 6. Update Invoice amounts and status
    new_paid = Decimal(str(invoice.paid_amount)) + payment_amount
    new_due = due_amount - payment_amount

    invoice.paid_amount = new_paid
    invoice.due_amount = new_due

    if new_due <= 0:
        invoice.status = "Paid"
        invoice.due_amount = Decimal("0.00")   # avoid negative due
    elif new_paid > 0:
        invoice.status = "Partial"

    # 7. Update FeeLedger
    academic_year = db.query(AcademicYear).filter(AcademicYear.id == invoice.academic_year_id).first()
    academic_year_name = academic_year.name if academic_year else None

    ledger = None
    if academic_year_name:
        ledger = (
            db.query(FeeLedger)
            .filter(
                FeeLedger.student_id == invoice.student_id,
                FeeLedger.tenant_id == tenant_id,
                FeeLedger.academic_year == academic_year_name,
            )
            .first()
        )

    # Fallback: find any ledger for student+tenant if year-specific not found
    if not ledger:
        ledger = (
            db.query(FeeLedger)
            .filter(
                FeeLedger.student_id == invoice.student_id,
                FeeLedger.tenant_id == tenant_id,
            )
            .order_by(FeeLedger.id.desc())
            .first()
        )

    if ledger:
        ledger.total_paid = Decimal(str(ledger.total_paid)) + payment_amount
        ledger.total_balance = Decimal(str(ledger.total_balance)) - payment_amount

    db.commit()
    db.refresh(payment)

    return FeePaymentCollectResponse(
        payment_id=payment.id,
        student_id=payment.student_id,
        total_amount=float(payment.total_amount),
        payment_date=payment.payment_date,
        receipt_number=payment.receipt_number,
    )
