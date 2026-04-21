from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.academic import AcademicYear, SchoolClass
from app.models.fee import FeeStructure
from app.models.student import Student
from app.repositories import invoice_repository
from app.schemas.invoice import InvoiceCreateRequest, InvoiceListResponse, InvoiceResponse, InvoiceUpdateRequest

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
        total_amount=float(row["total_amount"]),
        paid_amount=float(row["paid_amount"] or 0),
        due_amount=float(row["due_amount"]),
        due_date=row["due_date"],
        status=str(row["status"]),
        created_at=row["created_at"],
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
    status: str | None = None,
    search: str | None = None,
) -> InvoiceListResponse:
    rows, total = invoice_repository.list_invoices(
        db,
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
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

    existing = invoice_repository.get_invoice_by_number(db, tenant_id=tenant_id, invoice_no=payload.invoice_no)
    if existing:
        raise ConflictException("Invoice number already exists.")

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
        invoice_no=payload.invoice_no,
        total_amount=payload.total_amount,
        paid_amount=payload.paid_amount,
        due_amount=payload.due_amount,
        due_date=payload.due_date,
        status=status,
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
