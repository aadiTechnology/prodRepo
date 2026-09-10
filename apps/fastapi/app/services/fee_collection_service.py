from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from decimal import Decimal
from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.academic import AcademicYear, ClassDivision, SchoolClass
from app.models.fee import FeeInstallment
from app.models.fee_payment import FeePayment, FeePaymentAllocation
from app.models.student import Student
from app.models.student_invoice import StudentInvoice
from app.models.student_fee_ledger import FeeLedger
from app.models.user import User
from app.repositories import invoice_repository
from app.services.invoice_access import assert_invoice_row_access, get_invoice_scope_student_ids
from app.schemas.fee_collection import (
    FeeReceiptDetailResponse,
    FeeReceiptFeeDetailItem,
    FeeReceiptPaymentLineItem,
    FeePaymentCollectRequest,
    FeePaymentCollectResponse,
    InvoicePaymentCollectRequest,
    FeePaymentApprovalActionResponse,
    FeePaymentApprovalListItem,
    FeePaymentApprovalListResponse,
    FeePaymentApprovalRejectRequest,
)

_ALLOWED_PAYMENT_METHODS = {"CASH", "UPI", "CARD", "BANK_TRANSFER"}
_NON_CASH_PAYMENT_METHODS = _ALLOWED_PAYMENT_METHODS - {"CASH"}
_WORDS_0_TO_19 = [
    "Zero",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
]
_WORDS_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


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


def _requires_payment_approval(
    db: Session,
    *,
    tenant_id: int,
    user_id: int | None,
    email: str | None,
    legacy_role: object | None,
) -> bool:
    if user_id is None or email is None:
        return False
    return get_invoice_scope_student_ids(
        db, tenant_id=tenant_id, user_id=user_id, email=email, legacy_role=legacy_role
    ) is not None


def _apply_invoice_payment_effects(
    db: Session,
    *,
    tenant_id: int,
    invoice: StudentInvoice,
    payment_amount: Decimal,
) -> None:
    due_amount = Decimal(str(invoice.due_amount))
    if payment_amount > due_amount:
        raise ValidationException(
            f"Payment amount {payment_amount} exceeds due amount {due_amount}"
        )
    new_paid = Decimal(str(invoice.paid_amount)) + payment_amount
    new_due = due_amount - payment_amount
    invoice.paid_amount = new_paid
    invoice.due_amount = new_due
    if new_due <= 0:
        invoice.status = "Paid"
        invoice.due_amount = Decimal("0.00")
    elif new_paid > 0:
        invoice.status = "Partial"
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
    if not ledger:
        ledger = (
            db.query(FeeLedger)
            .filter(FeeLedger.student_id == invoice.student_id, FeeLedger.tenant_id == tenant_id)
            .order_by(FeeLedger.id.desc())
            .first()
        )
    if ledger:
        ledger.total_paid = Decimal(str(ledger.total_paid)) + payment_amount
        ledger.total_balance = Decimal(str(ledger.total_balance)) - payment_amount


def _payment_collect_response(payment: FeePayment) -> FeePaymentCollectResponse:
    status = str(payment.payment_status or "completed")
    return FeePaymentCollectResponse(
        payment_id=payment.id,
        student_id=payment.student_id,
        total_amount=float(payment.total_amount),
        payment_date=payment.payment_date,
        receipt_number=payment.receipt_number,
        payment_status=status,
        pending_approval=status == "pending_approval",
    )


def _to_words_below_thousand(value: int) -> str:
    if value < 20:
        return _WORDS_0_TO_19[value]
    if value < 100:
        tens = _WORDS_TENS[value // 10]
        rest = value % 10
        return tens if rest == 0 else f"{tens} {_WORDS_0_TO_19[rest]}"
    hundreds = f"{_WORDS_0_TO_19[value // 100]} Hundred"
    rest = value % 100
    return hundreds if rest == 0 else f"{hundreds} {_to_words_below_thousand(rest)}"


def _amount_to_words(value: Decimal) -> str:
    rounded = int(value.quantize(Decimal("1")))
    if rounded == 0:
        return "Rupees Zero Only"

    chunks: list[str] = []
    units = [
        (10**7, "Crore"),
        (10**5, "Lakh"),
        (10**3, "Thousand"),
        (10**2, "Hundred"),
    ]

    remaining = rounded
    for divisor, label in units:
        part = remaining // divisor
        if part > 0:
            if divisor == 100:
                chunks.append(f"{_WORDS_0_TO_19[part]} {label}")
            else:
                chunks.append(f"{_to_words_below_thousand(part)} {label}")
            remaining = remaining % divisor

    if remaining > 0:
        chunks.append(_to_words_below_thousand(remaining))
    return f"Rupees {' '.join(chunks)} Only"


def _build_fee_details(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int | None,
    payment_amount: Decimal,
    invoice_total: Decimal,
) -> list[FeeReceiptFeeDetailItem]:
    if not invoice_id:
        return []
    rows = invoice_repository.get_invoice_fee_breakdown(db, invoice_id=invoice_id)
    if not rows:
        rows = invoice_repository.get_fee_structure_breakdown_for_invoice(
            db, tenant_id=tenant_id, invoice_id=invoice_id
        )
    if not rows:
        return []

    breakdown_total = sum(Decimal(str(r.get("amount") or 0)) for r in rows)
    if breakdown_total <= 0:
        breakdown_total = invoice_total if invoice_total > 0 else Decimal("1")

    paid_ratio = payment_amount / breakdown_total if breakdown_total > 0 else Decimal("0")

    items: list[FeeReceiptFeeDetailItem] = []
    running_paid = Decimal("0")
    for idx, row in enumerate(rows, start=1):
        amount = Decimal(str(row.get("amount") or 0))
        if idx == len(rows):
            allocated = max(Decimal("0"), payment_amount - running_paid)
        else:
            allocated = max(Decimal("0"), (amount * paid_ratio).quantize(Decimal("0.01")))
            running_paid += allocated
        items.append(
            FeeReceiptFeeDetailItem(
                sr_no=idx,
                fee_category_name=row.get("fee_category_name") or "Fee",
                payable_for=row.get("payable_for") or None,
                amount=float(amount),
                paid_amount=float(allocated),
            )
        )
    return items


def _payment_mode_label(method: str | None) -> str:
    normalized = str(method or "").strip().upper()
    if normalized == "BANK_TRANSFER":
        return "NEFT"
    return normalized or "N/A"


def _payment_bank_label(method: str | None) -> str:
    normalized = str(method or "").strip().upper()
    if normalized == "BANK_TRANSFER":
        return "BANK"
    if normalized == "UPI":
        return "UPI"
    if normalized == "CARD":
        return "CARD"
    return "CASH"


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
    email: str | None = None,
    legacy_role: object | None = None,
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

    if user_id is not None and email is not None:
        assert_invoice_row_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            email=email,
            legacy_role=legacy_role,
            student_id=int(invoice.student_id),
        )

    # 2. Validate: no overpayment
    due_amount = Decimal(str(invoice.due_amount))
    payment_amount = Decimal(str(req.payment_amount))

    if payment_amount <= 0:
        raise ValidationException("Payment amount must be greater than zero.")

    if payment_amount > due_amount:
        raise ValidationException(
            f"Payment amount {payment_amount} exceeds due amount {due_amount}"
        )

    requires_approval = _requires_payment_approval(
        db, tenant_id=tenant_id, user_id=user_id, email=email, legacy_role=legacy_role
    )
    if requires_approval and invoice.fee_installment_id:
        existing_pending = (
            db.query(FeePayment.id)
            .filter(
                FeePayment.tenant_id == tenant_id,
                FeePayment.student_id == invoice.student_id,
                FeePayment.fee_installment_id == invoice.fee_installment_id,
                FeePayment.payment_status == "pending_approval",
            )
            .first()
        )
        if existing_pending:
            raise ConflictException("A payment for this installment is already pending approval.")

    payment_status = "pending_approval" if requires_approval else "completed"
    receipt_number = None if requires_approval else _generate_receipt_number(db, tenant_id)

    # 4. Create FeePayment
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
        payment_status=payment_status,
        receipt_number=receipt_number,
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

    if not requires_approval:
        _apply_invoice_payment_effects(
            db, tenant_id=tenant_id, invoice=invoice, payment_amount=payment_amount
        )

    db.commit()
    db.refresh(payment)
    return _payment_collect_response(payment)


def get_receipt_detail(
    db: Session,
    *,
    tenant_id: int,
    payment_id: int,
    user_id: int | None = None,
    email: str | None = None,
    legacy_role: object | None = None,
) -> FeeReceiptDetailResponse:
    payment = (
        db.query(FeePayment)
        .filter(FeePayment.id == payment_id, FeePayment.tenant_id == tenant_id)
        .first()
    )
    if not payment:
        raise NotFoundException("Receipt", payment_id)
    if str(payment.payment_status or "") != "completed":
        raise ValidationException("Receipt is available only after payment approval.")

    if user_id is not None and email is not None:
        assert_invoice_row_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            email=email,
            legacy_role=legacy_role,
            student_id=int(payment.student_id),
        )

    student = (
        db.query(Student)
        .filter(Student.id == payment.student_id, Student.tenant_id == tenant_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", payment.student_id)

    school_class = db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
    division = db.query(ClassDivision).filter(ClassDivision.id == student.class_division_id).first()

    payment_year_id = payment.academic_year_id
    if not payment_year_id:
        invoice_year = (
            db.query(StudentInvoice.academic_year_id)
            .filter(
                StudentInvoice.tenant_id == tenant_id,
                StudentInvoice.student_id == payment.student_id,
            )
            .order_by(StudentInvoice.id.desc())
            .first()
        )
        payment_year_id = int(invoice_year[0]) if invoice_year else None

    academic_year = (
        db.query(AcademicYear).filter(AcademicYear.id == payment_year_id).first()
        if payment_year_id
        else None
    )

    matched_invoice = None
    if payment.fee_installment_id:
        matched_invoice = (
            db.query(StudentInvoice)
            .filter(
                StudentInvoice.tenant_id == tenant_id,
                StudentInvoice.student_id == payment.student_id,
                StudentInvoice.fee_installment_id == payment.fee_installment_id,
            )
            .order_by(StudentInvoice.id.desc())
            .first()
        )
    if not matched_invoice:
        matched_invoice = (
            db.query(StudentInvoice)
            .filter(
                StudentInvoice.tenant_id == tenant_id,
                StudentInvoice.student_id == payment.student_id,
            )
            .order_by(StudentInvoice.id.desc())
            .first()
        )

    payment_lines: list[FeeReceiptPaymentLineItem] = []
    allocations = (
        db.query(FeePaymentAllocation, FeeInstallment)
        .outerjoin(FeeInstallment, FeeInstallment.id == FeePaymentAllocation.fee_installment_id)
        .filter(FeePaymentAllocation.payment_id == payment.id)
        .order_by(FeePaymentAllocation.id.asc())
        .all()
    )
    for index, (allocation, _installment) in enumerate(allocations, start=1):
        payment_lines.append(
            FeeReceiptPaymentLineItem(
                sr_no=index,
                txn_number=payment.reference_no,
                payment_type=_payment_mode_label(payment.payment_method),
                bank_name=_payment_bank_label(payment.payment_method),
                amount=float(allocation.amount_allocated or 0),
            )
        )

    if not payment_lines:
        payment_lines.append(
            FeeReceiptPaymentLineItem(
                sr_no=1,
                txn_number=payment.reference_no,
                payment_type=_payment_mode_label(payment.payment_method),
                bank_name=_payment_bank_label(payment.payment_method),
                amount=float(payment.total_amount or 0),
            )
        )

    created_by_name = None
    if payment.created_by:
        creator = db.query(User).filter(User.id == payment.created_by).first()
        created_by_name = creator.full_name if creator else None

    paid_for_parts: list[str] = []
    if matched_invoice and matched_invoice.installment:
        paid_for_parts.append(str(matched_invoice.installment))
    elif payment.fee_installment_id:
        installment = db.query(FeeInstallment).filter(FeeInstallment.id == payment.fee_installment_id).first()
        if installment and installment.description:
            paid_for_parts.append(str(installment.description))
    if school_class and school_class.name:
        paid_for_parts.append(f"Class {school_class.name}")
    paid_for = " | ".join(part for part in paid_for_parts if part)

    payment_decimal = Decimal(str(payment.total_amount or 0))
    invoice_total_decimal = Decimal(str(matched_invoice.total_amount or 0)) if matched_invoice else payment_decimal
    fee_details = _build_fee_details(
        db,
        tenant_id=tenant_id,
        invoice_id=int(matched_invoice.id) if matched_invoice else None,
        payment_amount=payment_decimal,
        invoice_total=invoice_total_decimal,
    )

    return FeeReceiptDetailResponse(
        payment_id=int(payment.id),
        receipt_number=payment.receipt_number,
        payment_date=payment.payment_date,
        payment_method=payment.payment_method,
        transaction_number=payment.reference_no,
        total_amount=float(payment_decimal),
        amount_in_words=_amount_to_words(payment_decimal),
        notes=payment.notes,
        student_name=student.student_name,
        parent_name=student.parent_name,
        admission_no=student.admission_no,
        class_name=school_class.name if school_class else None,
        division_name=division.division_name if division else None,
        academic_year=academic_year.name if academic_year else None,
        invoice_no=matched_invoice.invoice_no if matched_invoice else None,
        installment=matched_invoice.installment if matched_invoice else None,
        paid_for=paid_for or None,
        created_by_name=created_by_name,
        payment_lines=payment_lines,
        fee_details=fee_details,
    )


def get_invoice_receipt_detail(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int,
    user_id: int | None = None,
    email: str | None = None,
    legacy_role: object | None = None,
) -> FeeReceiptDetailResponse:
    invoice = (
        db.query(StudentInvoice)
        .filter(StudentInvoice.id == invoice_id, StudentInvoice.tenant_id == tenant_id)
        .first()
    )
    if not invoice:
        raise NotFoundException("Invoice", invoice_id)

    if user_id is not None and email is not None:
        assert_invoice_row_access(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            email=email,
            legacy_role=legacy_role,
            student_id=int(invoice.student_id),
        )

    student = (
        db.query(Student)
        .filter(Student.id == invoice.student_id, Student.tenant_id == tenant_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", invoice.student_id)

    school_class = db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
    division = db.query(ClassDivision).filter(ClassDivision.id == student.class_division_id).first()
    academic_year = (
        db.query(AcademicYear).filter(AcademicYear.id == invoice.academic_year_id).first()
        if invoice.academic_year_id
        else None
    )

    payment_query = db.query(FeePayment).filter(
        FeePayment.tenant_id == tenant_id,
        FeePayment.student_id == invoice.student_id,
    )
    if invoice.fee_installment_id:
        payment_query = payment_query.filter(FeePayment.fee_installment_id == invoice.fee_installment_id)

    payments = (
        payment_query.filter(FeePayment.payment_status == "completed")
        .order_by(FeePayment.payment_date.desc(), FeePayment.id.desc())
        .all()
    )
    if not payments:
        raise NotFoundException("Receipt", invoice_id)

    payment_lines: list[FeeReceiptPaymentLineItem] = []
    total_amount = Decimal("0")
    for idx, payment in enumerate(payments, start=1):
        amount = Decimal(str(payment.total_amount or 0))
        total_amount += amount
        payment_lines.append(
            FeeReceiptPaymentLineItem(
                sr_no=idx,
                txn_number=payment.reference_no,
                payment_type=_payment_mode_label(payment.payment_method),
                bank_name=_payment_bank_label(payment.payment_method),
                amount=float(amount),
            )
        )

    latest_payment = payments[0]
    created_by_name = None
    if latest_payment.created_by:
        creator = db.query(User).filter(User.id == latest_payment.created_by).first()
        created_by_name = creator.full_name if creator else None

    paid_for_parts: list[str] = []
    if invoice.installment:
        paid_for_parts.append(str(invoice.installment))
    if school_class and school_class.name:
        paid_for_parts.append(f"Class {school_class.name}")
    paid_for = " | ".join(part for part in paid_for_parts if part)

    invoice_total_decimal = Decimal(str(invoice.total_amount or 0))
    fee_details = _build_fee_details(
        db,
        tenant_id=tenant_id,
        invoice_id=invoice_id,
        payment_amount=total_amount,
        invoice_total=invoice_total_decimal,
    )

    return FeeReceiptDetailResponse(
        payment_id=int(latest_payment.id),
        receipt_number=latest_payment.receipt_number,
        payment_date=latest_payment.payment_date,
        payment_method=latest_payment.payment_method,
        transaction_number=latest_payment.reference_no,
        total_amount=float(total_amount),
        amount_in_words=_amount_to_words(total_amount),
        notes=f"Combined receipt for {len(payments)} installment payment(s)",
        student_name=student.student_name,
        parent_name=student.parent_name,
        admission_no=student.admission_no,
        class_name=school_class.name if school_class else None,
        division_name=division.division_name if division else None,
        academic_year=academic_year.name if academic_year else None,
        invoice_no=invoice.invoice_no,
        installment=invoice.installment,
        paid_for=paid_for or None,
        created_by_name=created_by_name,
        payment_lines=payment_lines,
        fee_details=fee_details,
    )


def list_pending_approvals(
    db: Session,
    *,
    tenant_id: int,
    class_id: int | None,
    division_id: int | None,
    student_id: int | None,
    status: str | None,
    search: str | None,
    page: int,
    size: int,
    user_id: int | None = None,
    email: str | None = None,
    legacy_role: object | None = None,
) -> FeePaymentApprovalListResponse:
    scoped = None
    if user_id is not None and email is not None:
        scoped = get_invoice_scope_student_ids(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            email=email,
            legacy_role=legacy_role,
        )
    rows, total = invoice_repository.list_fee_pending_approvals(
        db,
        tenant_id=tenant_id,
        class_id=class_id,
        division_id=division_id,
        student_id=student_id,
        status=status,
        search=search,
        page=page,
        size=size,
        scoped_student_ids=scoped,
    )
    return FeePaymentApprovalListResponse(
        items=[
            FeePaymentApprovalListItem(
                id=int(row["id"]),
                request_date=row["request_date"],
                student_id=int(row["student_id"]),
                student_name=row["student_name"],
                class_id=row.get("class_id"),
                class_name=row.get("class_name"),
                division_id=row.get("division_id"),
                division_name=row.get("division_name"),
                amount=float(row["amount"] or 0),
                payment_method=str(row["payment_method"] or ""),
                transaction_id=row.get("transaction_id"),
                status=str(row["status"] or ""),
            )
            for row in rows
        ],
        total=total,
        page=page,
        size=size,
    )


def _get_pending_payment(db: Session, *, tenant_id: int, payment_id: int) -> FeePayment:
    payment = (
        db.query(FeePayment)
        .filter(FeePayment.id == payment_id, FeePayment.tenant_id == tenant_id)
        .first()
    )
    if not payment:
        raise NotFoundException("FeePayment", payment_id)
    if str(payment.payment_status) != "pending_approval":
        raise ConflictException("Only pending approval payments can be updated.")
    return payment


def approve_pending_payment(
    db: Session,
    *,
    tenant_id: int,
    payment_id: int,
) -> FeePaymentApprovalActionResponse:
    payment = _get_pending_payment(db, tenant_id=tenant_id, payment_id=payment_id)
    payment_amount = Decimal(str(payment.total_amount or 0))
    invoice = None
    if payment.fee_installment_id:
        invoice = (
            db.query(StudentInvoice)
            .filter(
                StudentInvoice.tenant_id == tenant_id,
                StudentInvoice.student_id == payment.student_id,
                StudentInvoice.fee_installment_id == payment.fee_installment_id,
            )
            .order_by(StudentInvoice.id.desc())
            .first()
        )
    if not invoice:
        invoice = (
            db.query(StudentInvoice)
            .filter(
                StudentInvoice.tenant_id == tenant_id,
                StudentInvoice.student_id == payment.student_id,
            )
            .order_by(StudentInvoice.due_date.asc(), StudentInvoice.id.asc())
            .first()
        )
    if invoice:
        _apply_invoice_payment_effects(
            db, tenant_id=tenant_id, invoice=invoice, payment_amount=payment_amount
        )
    payment.payment_status = "completed"
    if not payment.receipt_number:
        payment.receipt_number = _generate_receipt_number(db, tenant_id)
    db.commit()
    return FeePaymentApprovalActionResponse(
        id=int(payment.id),
        status="Approved",
        message="Payment approved",
    )


def reject_pending_payment(
    db: Session,
    *,
    tenant_id: int,
    payment_id: int,
    req: FeePaymentApprovalRejectRequest | None = None,
) -> FeePaymentApprovalActionResponse:
    payment = _get_pending_payment(db, tenant_id=tenant_id, payment_id=payment_id)
    payment.payment_status = "rejected"
    reason = (req.reason or "").strip() if req else ""
    if reason:
        payment.notes = f"{payment.notes}\nRejected: {reason}".strip() if payment.notes else f"Rejected: {reason}"
    db.commit()
    return FeePaymentApprovalActionResponse(
        id=int(payment.id),
        status="Rejected",
        message="Payment rejected",
    )
