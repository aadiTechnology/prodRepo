from __future__ import annotations

from datetime import date
from decimal import Decimal
import re

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.academic import AcademicYear, ClassDivision, SchoolClass
from app.models.fee import FeeStructure
from app.models.student import Student
from app.repositories import invoice_repository
from app.schemas.invoice import (
    FeePlanResponse,
    GenerateInvoiceRequest,
    GenerateInvoiceResponse,
    InvoiceCreateRequest,
    InvoiceDetailResponse,
    InvoiceFeeBreakdownItem,
    InvoiceListResponse,
    InvoicePaymentHistoryItem,
    InvoicePaymentSummary,
    InvoiceResponse,
    InvoiceStudentInfo,
    InvoiceStudentItem,
    InvoiceUpdateRequest,
)

ALLOWED_INVOICE_STATUSES = {"Paid", "Partial", "Pending", "Overdue"}


def _calc_status(*, total_amount: Decimal, paid_amount: Decimal, due_date: date) -> str:
    today = date.today()
    if paid_amount >= total_amount:
        return "Paid"
    if paid_amount > Decimal("0"):
        return "Partial"
    if due_date < today:
        return "Overdue"
    return "Pending"


def _to_invoice_response(row: dict) -> InvoiceResponse:
    return InvoiceResponse(
        id=int(row["id"]),
        tenant_id=int(row["tenant_id"]),
        student_id=int(row["student_id"]),
        student_name=str(row["student_name"]),
        admission_no=row.get("admission_no"),
        academic_year_id=int(row["academic_year_id"]),
        class_id=int(row["class_id"]),
        class_name=row.get("class_name"),
        fee_structure_id=int(row["fee_structure_id"]),
        invoice_no=str(row["invoice_no"]),
        installment=row.get("installment") or row.get("Installment"),
        total_amount=float(row["total_amount"]),
        paid_amount=float(row["paid_amount"] or 0),
        due_amount=float(row["due_amount"]),
        due_date=row["due_date"],
        status=str(row["status"]),
        created_at=row["created_at"],
        fee_installment_id=int(row["fee_installment_id"]) if row.get("fee_installment_id") else None,
        installment_name=row.get("installment_name"),
    )


def _validate_relations(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
    class_id: int,
    fee_structure_id: int,
) -> None:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.tenant_id == tenant_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", student_id)

    year = (
        db.query(AcademicYear)
        .filter(AcademicYear.id == academic_year_id, AcademicYear.tenant_id == tenant_id)
        .first()
    )
    if not year:
        raise NotFoundException("AcademicYear", academic_year_id)

    school_class = (
        db.query(SchoolClass)
        .filter(SchoolClass.id == class_id, SchoolClass.tenant_id == tenant_id)
        .first()
    )
    if not school_class:
        raise NotFoundException("SchoolClass", class_id)

    structure = (
        db.query(FeeStructure)
        .filter(
            FeeStructure.id == fee_structure_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if not structure:
        raise NotFoundException("FeeStructure", fee_structure_id)


def list_invoices(
    db: Session,
    *,
    tenant_id: int,
    page: int,
    size: int,
    academic_year_id: int | None = None,
    class_id: int | None = None,
    installment: str | None = None,
    status: str | None = None,
    search: str | None = None,
) -> InvoiceListResponse:
    rows, total = invoice_repository.list_invoices(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        installment=installment,
        status=status,
        search=search,
        page=page,
        size=size,
    )
    return InvoiceListResponse(
        items=[_to_invoice_response(row) for row in rows],
        total=total,
        page=page,
        size=size,
    )


def get_invoice(db: Session, *, tenant_id: int, invoice_id: int) -> InvoiceResponse:
    row = invoice_repository.get_invoice_by_id(db, tenant_id=tenant_id, invoice_id=invoice_id)
    if not row:
        raise NotFoundException("StudentInvoice", invoice_id)
    return _to_invoice_response(row)


def get_invoice_detail(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int,
) -> InvoiceDetailResponse:
    invoice_row = invoice_repository.get_invoice_by_id(db, tenant_id=tenant_id, invoice_id=invoice_id)
    if not invoice_row:
        raise NotFoundException("StudentInvoice", invoice_id)

    student_info_row = invoice_repository.get_invoice_student_info(
        db, tenant_id=tenant_id, invoice_id=invoice_id
    )
    fee_breakdown_rows = invoice_repository.get_invoice_fee_breakdown(db, invoice_id=invoice_id)
    if not fee_breakdown_rows:
        fee_breakdown_rows = invoice_repository.get_fee_structure_breakdown_for_invoice(
            db,
            tenant_id=tenant_id,
            invoice_id=invoice_id,
        )
    payment_history_rows = invoice_repository.get_invoice_payment_history(
        db,
        tenant_id=tenant_id,
        student_id=int(invoice_row["student_id"]),
        fee_installment_id=invoice_row.get("fee_installment_id"),
    )

    invoice = _to_invoice_response(invoice_row)
    paid_amount = float(invoice_row["paid_amount"] or 0)
    due_amount = float(invoice_row["due_amount"] or 0)
    available_actions: list[str] = ["download_invoice", "print_invoice", "back"]
    if due_amount > 0:
        available_actions.extend(["pay_now", "collect_payment"])

    breakdown_total = sum(float(item.get("amount") or 0) for item in fee_breakdown_rows)
    paid_ratio = (paid_amount / breakdown_total) if breakdown_total > 0 else 0

    breakdown_items: list[InvoiceFeeBreakdownItem] = []
    running_paid = 0.0
    for idx, item in enumerate(fee_breakdown_rows):
        amount = float(item.get("amount") or 0)
        if idx == len(fee_breakdown_rows) - 1:
            allocated_paid = max(0.0, min(amount, paid_amount - running_paid))
        else:
            allocated_paid = max(0.0, min(amount, round(amount * paid_ratio, 2)))
            running_paid += allocated_paid
        pending = max(0.0, round(amount - allocated_paid, 2))
        breakdown_items.append(
            InvoiceFeeBreakdownItem(
                id=int(item["id"]),
                fee_category_id=item.get("fee_category_id"),
                fee_category_name=item.get("fee_category_name"),
                amount=amount,
                paid_amount=allocated_paid,
                pending_amount=pending,
                payable_for=item.get("payable_for"),
            )
        )

    return InvoiceDetailResponse(
        invoice=invoice,
        student_info=InvoiceStudentInfo(
            student_id=int(student_info_row["student_id"]),
            student_name=str(student_info_row["student_name"]),
            admission_no=student_info_row.get("admission_no"),
            roll_no=student_info_row.get("roll_no"),
            class_id=int(student_info_row["class_id"]),
            class_name=student_info_row.get("class_name"),
            division_id=student_info_row.get("division_id"),
            division_name=student_info_row.get("division_name"),
        ),
        fee_breakdown=breakdown_items,
        payment_summary=InvoicePaymentSummary(
            total_amount=float(invoice_row["total_amount"] or 0),
            paid_amount=paid_amount,
            due_amount=due_amount,
        ),
        payment_history=[
            InvoicePaymentHistoryItem(
                payment_id=int(item["payment_id"]),
                payment_date=item["payment_date"],
                amount=float(item["amount"] or 0),
                payment_method=str(item["payment_method"]),
                reference_no=item.get("reference_no"),
            )
            for item in payment_history_rows
        ],
        available_actions=available_actions,
    )


def create_invoice(
    db: Session,
    *,
    tenant_id: int,
    payload: InvoiceCreateRequest,
) -> InvoiceResponse:
    _validate_relations(
        db,
        tenant_id=tenant_id,
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        fee_structure_id=payload.fee_structure_id,
    )

    if payload.paid_amount > payload.total_amount:
        raise ValidationException("paid_amount cannot be greater than total_amount")

    expected_due = Decimal(str(payload.total_amount)) - Decimal(str(payload.paid_amount))
    if Decimal(str(payload.due_amount)) != expected_due:
        raise ValidationException("due_amount must be equal to total_amount - paid_amount")

    invoice_no = _format_invoice_no(_next_invoice_sequence(db))

    status = _calc_status(
        total_amount=Decimal(str(payload.total_amount)),
        paid_amount=Decimal(str(payload.paid_amount)),
        due_date=payload.due_date,
    )
    if status not in ALLOWED_INVOICE_STATUSES:
        raise ValidationException("Invalid invoice status derived from input values")

    invoice_id = invoice_repository.insert_invoice(
        db,
        tenant_id=tenant_id,
        student_id=payload.student_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        fee_structure_id=payload.fee_structure_id,
        invoice_no=invoice_no,
        total_amount=payload.total_amount,
        paid_amount=payload.paid_amount,
        due_amount=payload.due_amount,
        due_date=payload.due_date,
        status=status,
        fee_installment_id=payload.fee_installment_id,
    )
    db.commit()
    return get_invoice(db, tenant_id=tenant_id, invoice_id=invoice_id)


def update_invoice(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int,
    payload: InvoiceUpdateRequest,
) -> InvoiceResponse:
    existing = invoice_repository.get_invoice_by_id(db, tenant_id=tenant_id, invoice_id=invoice_id)
    if not existing:
        raise NotFoundException("StudentInvoice", invoice_id)

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        return _to_invoice_response(existing)

    next_student_id = int(existing["student_id"])
    next_academic_year_id = int(update_data.get("academic_year_id", existing["academic_year_id"]))
    next_class_id = int(update_data.get("class_id", existing["class_id"]))
    next_fee_structure_id = int(update_data.get("fee_structure_id", existing["fee_structure_id"]))

    _validate_relations(
        db,
        tenant_id=tenant_id,
        student_id=next_student_id,
        academic_year_id=next_academic_year_id,
        class_id=next_class_id,
        fee_structure_id=next_fee_structure_id,
    )

    invoice_no = update_data.get("invoice_no")
    if invoice_no:
        duplicate = invoice_repository.get_invoice_by_number(db, tenant_id=tenant_id, invoice_no=invoice_no)
        if duplicate and int(duplicate["id"]) != invoice_id:
            raise ConflictException("Invoice number already exists.")

    total_amount = Decimal(str(update_data.get("total_amount", existing["total_amount"])))
    paid_amount = Decimal(str(update_data.get("paid_amount", existing["paid_amount"] or 0)))
    due_amount = Decimal(str(update_data.get("due_amount", existing["due_amount"])))
    due_date = update_data.get("due_date", existing["due_date"])

    if paid_amount > total_amount:
        raise ValidationException("paid_amount cannot be greater than total_amount")
    if due_amount != (total_amount - paid_amount):
        raise ValidationException("due_amount must be equal to total_amount - paid_amount")

    update_data["status"] = _calc_status(total_amount=total_amount, paid_amount=paid_amount, due_date=due_date)
    invoice_repository.update_invoice(db, tenant_id=tenant_id, invoice_id=invoice_id, update_fields=update_data)
    db.commit()
    return get_invoice(db, tenant_id=tenant_id, invoice_id=invoice_id)


def delete_invoice(db: Session, *, tenant_id: int, invoice_id: int) -> None:
    existing = invoice_repository.get_invoice_by_id(db, tenant_id=tenant_id, invoice_id=invoice_id)
    if not existing:
        raise NotFoundException("StudentInvoice", invoice_id)
    invoice_repository.delete_invoice(db, tenant_id=tenant_id, invoice_id=invoice_id)
    db.commit()


def get_fee_plan(
    db: Session,
    *,
    tenant_id: int,
    class_id: int,
    division_id: int | None,
) -> FeePlanResponse | None:
    q = (
        db.query(FeeStructure)
        .filter(
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.class_id == class_id,
            FeeStructure.is_deleted == False,  # noqa: E712
            FeeStructure.is_active == True,  # noqa: E712
        )
        .order_by(FeeStructure.id.desc())
    )
    if division_id is not None:
        q = q.filter(FeeStructure.class_division_id == division_id)
    else:
        q = q.filter(FeeStructure.class_division_id.is_(None))

    plan = q.first()
    if not plan and division_id is not None:
        plan = (
            db.query(FeeStructure)
            .filter(
                FeeStructure.tenant_id == tenant_id,
                FeeStructure.class_id == class_id,
                FeeStructure.class_division_id.is_(None),
                FeeStructure.is_deleted == False,  # noqa: E712
                FeeStructure.is_active == True,  # noqa: E712
            )
            .order_by(FeeStructure.id.desc())
            .first()
        )
    if not plan:
        return None

    return FeePlanResponse(
        id=int(plan.id),
        class_id=int(plan.class_id),
        division_id=int(plan.class_division_id) if plan.class_division_id else None,
        academic_year_id=int(plan.academic_year_id),
        total_amount=float(plan.total_amount or 0),
        name=plan.name,
    )


def get_students_for_invoice(
    db: Session,
    *,
    tenant_id: int,
    class_id: int,
    division_id: int,
    academic_year_id: int,
    installment_name: str | None = None,
) -> list[InvoiceStudentItem]:
    students = (
        db.query(
            Student.id,
            Student.student_name,
            Student.admission_no,
            Student.student_code,
            Student.roll_no,
            SchoolClass.name.label("class_name"),
            ClassDivision.division_name.label("division_name"),
        )
        .outerjoin(SchoolClass, SchoolClass.id == Student.class_id)
        .outerjoin(ClassDivision, ClassDivision.id == Student.class_division_id)
        .filter(
            Student.tenant_id == tenant_id,
            Student.class_id == class_id,
            Student.class_division_id == division_id,
            Student.academic_year_id == academic_year_id,
            Student.is_active == True,  # noqa: E712
        )
        .order_by(Student.student_name.asc(), Student.id.asc())
        .all()
    )
    if not students:
        return []

    student_ids = [int(s.id) for s in students]
    existing_invoice_query = db.query(
        invoice_repository.StudentInvoice.student_id,
        invoice_repository.StudentInvoice.invoice_no,
    ).filter(
        invoice_repository.StudentInvoice.tenant_id == tenant_id,
        invoice_repository.StudentInvoice.academic_year_id == academic_year_id,
        invoice_repository.StudentInvoice.student_id.in_(student_ids),
    )
    if installment_name:
        existing_invoice_query = existing_invoice_query.filter(
            invoice_repository.StudentInvoice.installment == installment_name
        )
    existing_invoice_rows = existing_invoice_query.all()

    generated_set = {int(row[0]) for row in existing_invoice_rows}

    return [
        InvoiceStudentItem(
            id=int(s.id),
            student_name=s.student_name,
            admission_no=s.admission_no,
            student_code=s.student_code,
            roll_no=s.roll_no,
            class_name=s.class_name,
            division_name=s.division_name,
            is_invoice_generated=int(s.id) in generated_set,
        )
        for s in students
    ]


def _next_invoice_sequence(db: Session) -> int:
    invoice_rows = (
        db.query(invoice_repository.StudentInvoice.invoice_no)
        .filter(invoice_repository.StudentInvoice.invoice_no.like("INV-%"))
        .all()
    )
    max_seq = 0
    for row in invoice_rows:
        value = str(row[0] or "").strip()
        match = re.fullmatch(r"INV-(\d+)", value)
        if not match:
            continue
        max_seq = max(max_seq, int(match.group(1)))
    return max_seq + 1


def _format_invoice_no(sequence: int) -> str:
    return f"INV-{sequence:02d}"


def _resolve_installment_for_generation(
    *,
    fee_structure: FeeStructure,
    installment_name: str,
) -> tuple[int, float]:
    target_name = (installment_name or "").strip()
    if not target_name:
        raise ValidationException("Installment is required")

    active_installments = [
        inst
        for inst in (fee_structure.installments or [])
        if not bool(getattr(inst, "is_deleted", False))
    ]

    selected = None
    for installment in active_installments:
        description = (installment.description or "").strip()
        fallback_name = f"Installment {int(installment.installment_number)}"
        if description == target_name or fallback_name == target_name:
            selected = installment
            break

    if not selected:
        raise ValidationException("Selected installment is invalid for the fee structure")

    return int(selected.id), float(selected.amount or 0)


def generate_invoices(
    db: Session,
    *,
    tenant_id: int,
    payload: GenerateInvoiceRequest,
) -> GenerateInvoiceResponse:
    if not payload.student_ids:
        return GenerateInvoiceResponse(
            created_count=0,
            skipped_count=0,
            message="No students selected",
            skipped_student_ids=[],
        )
    if payload.due_date < payload.invoice_date:
        raise ValidationException("due_date cannot be earlier than invoice_date")

    target_students = (
        db.query(Student.id)
        .filter(
            Student.tenant_id == tenant_id,
            Student.id.in_(payload.student_ids),
            Student.class_id == payload.class_id,
            Student.class_division_id == payload.division_id,
            Student.academic_year_id == payload.academic_year_id,
            Student.is_active == True,  # noqa: E712
        )
        .all()
    )
    valid_student_ids = {int(s[0]) for s in target_students}
    skipped_set = {int(sid) for sid in payload.student_ids if int(sid) not in valid_student_ids}
    if not valid_student_ids:
        return GenerateInvoiceResponse(
            created_count=0,
            skipped_count=len(skipped_set),
            message="No valid students found for selected filters",
            skipped_student_ids=sorted(skipped_set),
        )

    fee_structure = (
        db.query(FeeStructure)
        .filter(
            FeeStructure.id == payload.fee_structure_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.class_id == payload.class_id,
            FeeStructure.academic_year_id == payload.academic_year_id,
            FeeStructure.is_deleted == False,  # noqa: E712
            FeeStructure.is_active == True,  # noqa: E712
        )
        .first()
    )
    if not fee_structure:
        raise ValidationException("Selected fee structure is invalid for selected class and academic year")

    if (
        fee_structure.class_division_id is not None
        and int(fee_structure.class_division_id) != payload.division_id
    ):
        raise ValidationException("Selected fee structure does not belong to selected division")

    existing = (
        db.query(invoice_repository.StudentInvoice.student_id, invoice_repository.StudentInvoice.invoice_no)
        .filter(
            invoice_repository.StudentInvoice.tenant_id == tenant_id,
            invoice_repository.StudentInvoice.academic_year_id == payload.academic_year_id,
            invoice_repository.StudentInvoice.student_id.in_(list(valid_student_ids)),
            invoice_repository.StudentInvoice.installment == payload.installment_name,
        )
        .all()
    )
    existing_student_ids = {int(row[0]) for row in existing}
    skipped_set.update(existing_student_ids)
    to_create_ids = sorted(list(valid_student_ids - existing_student_ids))
    if not to_create_ids:
        return GenerateInvoiceResponse(
            created_count=0,
            skipped_count=len(skipped_set),
            message="Invoices already generated for selected students",
            skipped_student_ids=sorted(skipped_set),
        )

    selected_installment_id, selected_installment_amount = _resolve_installment_for_generation(
        fee_structure=fee_structure,
        installment_name=payload.installment_name,
    )

    next_invoice_seq = _next_invoice_sequence(db)
    rows = [
        invoice_repository.StudentInvoice(
            tenant_id=tenant_id,
            student_id=student_id,
            academic_year_id=payload.academic_year_id,
            class_id=payload.class_id,
            fee_structure_id=int(fee_structure.id),
            invoice_no=_format_invoice_no(next_invoice_seq + index),
            total_amount=selected_installment_amount,
            paid_amount=0,
            due_amount=selected_installment_amount,
            due_date=payload.due_date,
            status="Pending",
            installment=payload.installment_name,
            fee_installment_id=selected_installment_id,
        )
        for index, student_id in enumerate(to_create_ids)
    ]
    db.bulk_save_objects(rows)
    db.commit()

    msg = "Invoices generated successfully"
    if skipped_set:
        msg = f"Invoices generated with warnings. Skipped {len(skipped_set)} students"
    return GenerateInvoiceResponse(
        created_count=len(to_create_ids),
        skipped_count=len(skipped_set),
        message=msg,
        skipped_student_ids=sorted(skipped_set),
    )
