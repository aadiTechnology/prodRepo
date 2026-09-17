"""Chatbot action: get_fee_status — invoice-backed due/paid summary."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.services import invoice_service
from app.services.chatbot_actions.errors import from_exception, no_linked_student, validation
from app.services.chatbot_actions.scope import as_date, optional_int, resolve_consumer_student
from app.services.invoice_access import get_invoice_scope_student_ids


_STATUS_MAP = {
    "unpaid": "Pending",
    "pending": "Pending",
    "overdue": "Overdue",
    "paid": "Paid",
    "all": None,
}


def get_fee_status(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    try:
        return _get_fee_status(db, current_user, payload or {})
    except Exception as exc:
        raise from_exception(exc) from exc


def _get_fee_status(db: Session, current_user: Any, payload: dict[str, Any]) -> dict[str, Any]:
    student_id = optional_int(payload.get("student_id"), field="student_id")
    academic_year_id = optional_int(payload.get("academic_year_id"), field="academic_year_id")
    status_key = str(payload.get("status") or "all").strip().lower()
    if status_key not in _STATUS_MAP:
        raise validation("status must be unpaid, overdue, paid, or all.")
    list_status = _STATUS_MAP[status_key]

    student, _scoped = resolve_consumer_student(
        db,
        current_user,
        student_id=student_id,
        allow_unscoped_staff=False,
    )
    if student is None:
        raise validation("Please specify which student you are asking about.")

    scoped_ids = get_invoice_scope_student_ids(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    if scoped_ids is not None and not scoped_ids:
        raise no_linked_student()

    listing = invoice_service.list_invoices(
        db,
        tenant_id=current_user.tenant_id,
        page=0,
        size=50,
        academic_year_id=academic_year_id,
        student_id=int(student.id),
        status=list_status,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )

    installments = []
    total_amount = 0.0
    paid_amount = 0.0
    due_amount = 0.0
    is_overdue = False
    next_due: date | None = None
    today = date.today()

    for invoice in listing.items:
        due = float(invoice.due_amount or 0)
        total_amount += float(invoice.total_amount or 0)
        paid_amount += float(invoice.paid_amount or 0)
        due_amount += due
        due_date = as_date(invoice.due_date)
        status_value = str(invoice.status or "")
        if status_value.lower() == "overdue" or (due > 0 and due_date is not None and due_date < today):
            is_overdue = True
        if due > 0 and due_date is not None:
            if next_due is None or due_date < next_due:
                next_due = due_date
        installments.append(
            {
                "name": invoice.installment_name or invoice.installment,
                "due_date": due_date.isoformat() if due_date else None,
                "due_amount": due,
                "status": status_value,
                "invoice_no": invoice.invoice_no,
            }
        )

    return {
        "action": "get_fee_status",
        "student_name": student.student_name,
        "class_name": student.class_model.name if student.class_model else None,
        "total_amount": round(total_amount, 2),
        "paid_amount": round(paid_amount, 2),
        "due_amount": round(due_amount, 2),
        "is_overdue": is_overdue,
        "next_due_date": next_due.isoformat() if next_due else None,
        "installments": installments,
    }
