"""Fee Report Service — reads from student_invoices (source of truth)."""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.repositories import invoice_repository
from app.schemas.dashboard import (
    AdminFeeOverview,
    DashboardFeeDueItem,
    StudentFeeInstallmentItem,
    StudentFeeWidgets,
)
from app.schemas.fee_report_schema import (
    FeeReportFilterOptions,
    FeeReportResponse,
    FeeReportRow,
    FeeReportSummary,
)
from app.services import fee_service
from app.services.homework_service import resolve_current_academic_year_id

DASHBOARD_UPCOMING_DUES_LIMIT = 5


def get_filter_options(
    db: Session,
    tenant_id: int,
    academic_year_id: Optional[int] = None,
) -> FeeReportFilterOptions:
    """Return dropdown options for academic year, class, and installment filters."""

    academic_years = db.execute(
        text("""
            SELECT DISTINCT ay.id, ay.name
            FROM academic_years ay
            JOIN student_invoices si ON si.academic_year_id = ay.id
            JOIN students s ON s.id = si.student_id
            WHERE s.tenant_id = :tenant_id
              AND ay.is_active = 1
              AND ay.is_deleted = 0
            ORDER BY ay.name DESC
        """),
        {"tenant_id": tenant_id},
    ).fetchall()

    class_filters = [
        "s.tenant_id = :tenant_id",
        "c.is_active = 1",
        "c.is_deleted = 0",
    ]
    class_params: dict = {"tenant_id": tenant_id}
    if academic_year_id:
        class_filters.append("si.academic_year_id = :academic_year_id")
        class_params["academic_year_id"] = academic_year_id

    classes = db.execute(
        text(f"""
            SELECT DISTINCT c.id, c.name
            FROM classes c
            JOIN student_invoices si ON si.class_id = c.id
            JOIN students s ON s.id = si.student_id
            WHERE {" AND ".join(class_filters)}
            ORDER BY c.name
        """),
        class_params,
    ).fetchall()

    installment_filters = [
        "s.tenant_id = :tenant_id",
        "si.Installment IS NOT NULL",
    ]
    installment_params: dict = {"tenant_id": tenant_id}
    if academic_year_id:
        installment_filters.append("si.academic_year_id = :academic_year_id")
        installment_params["academic_year_id"] = academic_year_id

    installments = db.execute(
        text(f"""
            SELECT DISTINCT si.Installment
            FROM student_invoices si
            JOIN students s ON s.id = si.student_id
            WHERE {" AND ".join(installment_filters)}
            ORDER BY si.Installment
        """),
        installment_params,
    ).fetchall()

    return FeeReportFilterOptions(
        academic_years=[{"id": r.id, "name": r.name} for r in academic_years],
        classes=[{"id": r.id, "name": r.name} for r in classes],
        installments=[r.Installment for r in installments if r.Installment],
    )


def get_fee_report(
    db: Session,
    tenant_id: int,
    page: int = 0,
    size: int = 20,
    academic_year_id: Optional[int] = None,
    class_id: Optional[int] = None,
    installment: Optional[str] = None,
    search: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> FeeReportResponse:
    """Return paginated report rows + summary cards."""

    filters = ["s.tenant_id = :tenant_id", "s.is_active = 1"]
    params: dict = {"tenant_id": tenant_id}

    if academic_year_id:
        filters.append("si.academic_year_id = :academic_year_id")
        params["academic_year_id"] = academic_year_id

    if class_id:
        filters.append("si.class_id = :class_id")
        params["class_id"] = class_id

    if installment:
        filters.append("si.Installment = :installment")
        params["installment"] = installment

    if search and search.strip():
        filters.append("LOWER(s.student_name) LIKE :search")
        params["search"] = f"%{search.strip().lower()}%"

    if start_date:
        filters.append("CAST(si.created_at AS DATE) >= :start_date")
        params["start_date"] = start_date

    if end_date:
        filters.append("CAST(si.created_at AS DATE) <= :end_date")
        params["end_date"] = end_date

    where_clause = " AND ".join(filters)

    # Summary aggregation (unfiltered by pagination)
    summary_sql = text(f"""
        SELECT
            COUNT(DISTINCT si.student_id)           AS total_students,
            ISNULL(SUM(si.total_amount), 0)         AS total_invoiced,
            ISNULL(SUM(si.paid_amount), 0)          AS total_collected,
            ISNULL(SUM(si.due_amount), 0)           AS total_pending
        FROM student_invoices si
        JOIN students s ON s.id = si.student_id
        WHERE {where_clause}
    """)
    summary_row = db.execute(summary_sql, params).fetchone()

    total_invoiced = float(summary_row.total_invoiced or 0)
    total_collected = float(summary_row.total_collected or 0)
    total_pending = float(summary_row.total_pending or 0)
    collection_pct = (
        round(total_collected * 100.0 / total_invoiced, 2)
        if total_invoiced > 0
        else 0.0
    )

    summary = FeeReportSummary(
        total_students=summary_row.total_students or 0,
        total_invoiced=total_invoiced,
        total_collected=total_collected,
        total_pending=total_pending,
        collection_percentage=collection_pct,
    )

    # Count for pagination
    count_sql = text(f"""
        SELECT COUNT(*) AS cnt
        FROM student_invoices si
        JOIN students s ON s.id = si.student_id
        WHERE {where_clause}
    """)
    total = db.execute(count_sql, params).fetchone().cnt

    # Paginated rows
    offset = page * size
    params["offset"] = offset
    params["size"] = size

    rows_sql = text(f"""
        SELECT
            s.id                        AS student_id,
            s.student_name,
            s.student_code,
            s.admission_no,
            c.name                      AS class_name,
            cd.division_name,
            si.invoice_no,
            si.Installment              AS installment_label,
            si.total_amount             AS invoiced_amount,
            ISNULL(si.paid_amount, 0)   AS paid_amount,
            si.due_amount,
            si.status                   AS invoice_status,
            si.due_date,
            si.created_at               AS invoice_date
        FROM student_invoices si
        JOIN students s              ON s.id  = si.student_id
        JOIN classes c               ON c.id  = si.class_id
        LEFT JOIN class_divisions cd ON cd.id = s.class_division_id
        WHERE {where_clause}
        ORDER BY s.student_name, si.created_at DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
    """)
    rows = db.execute(rows_sql, params).fetchall()

    items = [
        FeeReportRow(
            student_id=r.student_id,
            student_name=r.student_name,
            student_code=r.student_code,
            admission_no=r.admission_no,
            class_name=r.class_name,
            division_name=r.division_name,
            invoice_no=r.invoice_no,
            installment_label=r.installment_label,
            invoiced_amount=float(r.invoiced_amount or 0),
            paid_amount=float(r.paid_amount or 0),
            due_amount=float(r.due_amount or 0),
            invoice_status=r.invoice_status,
            due_date=r.due_date,
            invoice_date=r.invoice_date,
        )
        for r in rows
    ]

    return FeeReportResponse(
        summary=summary,
        items=items,
        total=total,
        page=page,
        size=size,
    )


def _installment_label(installment_name: Optional[str], installment: Optional[str]) -> str:
    name = (installment_name or "").strip()
    if name:
        return name
    code = (installment or "").strip()
    if not code:
        return "Fee"
    if code.isdigit():
        return f"Installment {code}"
    return code


def _as_date(value) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def get_student_fee_widgets(
    db: Session,
    tenant_id: int,
    student_id: int,
    academic_year_id: Optional[int] = None,
) -> StudentFeeWidgets:
    """Paid, pending, and overdue totals for one student. Never includes other students."""
    ay_id = academic_year_id or resolve_current_academic_year_id(db, tenant_id)
    if ay_id is None:
        return StudentFeeWidgets()

    rows = invoice_repository.list_student_invoices_for_year(
        db,
        tenant_id=tenant_id,
        student_id=student_id,
        academic_year_id=ay_id,
    )
    today = datetime.utcnow().date()
    total_fee = paid_fee = pending_fee = overdue_fee = 0.0
    installments: list[StudentFeeInstallmentItem] = []

    for row in rows:
        total_amount = float(row.get("total_amount") or 0)
        paid_amount = float(row.get("paid_amount") or 0)
        due_amount = float(row.get("due_amount") or 0)
        due_on = _as_date(row.get("due_date"))
        total_fee += total_amount
        paid_fee += paid_amount
        if due_amount > 0 and due_on is not None and due_on < today:
            fee_status = "overdue"
            overdue_fee += due_amount
        elif due_amount > 0:
            fee_status = "pending"
            pending_fee += due_amount
        else:
            fee_status = "paid"

        installments.append(
            StudentFeeInstallmentItem(
                invoice_id=int(row["id"]),
                label=_installment_label(row.get("installment_name"), row.get("installment")),
                due_date=due_on,
                total_amount=round(total_amount, 2),
                paid_amount=round(paid_amount, 2),
                due_amount=round(due_amount, 2),
                fee_status=fee_status,
            )
        )

    return StudentFeeWidgets(
        academic_year_id=ay_id,
        total_fee=round(total_fee, 2),
        paid_fee=round(paid_fee, 2),
        pending_fee=round(pending_fee, 2),
        overdue_fee=round(overdue_fee, 2),
        total_due=round(pending_fee + overdue_fee, 2),
        paid_percentage=round(paid_fee * 100.0 / total_fee, 1) if total_fee > 0 else 0.0,
        installments=installments,
    )


def get_dashboard_fee_overview(
    db: Session,
    tenant_id: int,
    academic_year_id: Optional[int] = None,
) -> AdminFeeOverview:
    """Fee status for the admin dashboard widgets; defaults to the tenant's current academic year."""
    ay_id = academic_year_id or resolve_current_academic_year_id(db, tenant_id)
    if ay_id is None:
        return AdminFeeOverview()

    invoice_summary = invoice_repository.get_dashboard_invoice_summary(
        db, tenant_id=tenant_id, academic_year_id=ay_id
    )
    total_fee = float(invoice_summary.get("total_fee") or 0)
    total_collected = float(invoice_summary.get("total_collected") or 0)

    # fee_payments.payment_date is stored in UTC.
    today_utc = datetime.utcnow().date()
    collections = invoice_repository.get_dashboard_collection_summary(
        db,
        tenant_id=tenant_id,
        academic_year_id=ay_id,
        today=today_utc,
        month_start=today_utc.replace(day=1),
    )

    due_list = fee_service.get_fee_due_list_v2(
        db,
        tenant_id=tenant_id,
        academic_year_id=ay_id,
        page=1,
        page_size=DASHBOARD_UPCOMING_DUES_LIMIT,
    )

    return AdminFeeOverview(
        academic_year_id=ay_id,
        total_fee=total_fee,
        total_collected=total_collected,
        total_pending=float(invoice_summary.get("total_pending") or 0),
        collection_percentage=(
            round(total_collected * 100.0 / total_fee, 2) if total_fee > 0 else 0.0
        ),
        paid_invoices=int(invoice_summary.get("paid_invoices") or 0),
        partial_invoices=int(invoice_summary.get("partial_invoices") or 0),
        pending_invoices=int(invoice_summary.get("pending_invoices") or 0),
        students_with_dues=int(invoice_summary.get("students_with_dues") or 0),
        today_collected=float(collections.get("today_collected") or 0),
        month_collected=float(collections.get("month_collected") or 0),
        pending_approval_count=int(collections.get("pending_approval_count") or 0),
        pending_approval_amount=float(collections.get("pending_approval_amount") or 0),
        due_total=float(due_list["summary"]["total_due"] or 0),
        due_count=int(due_list["total"] or 0),
        due_window_days=fee_service.get_due_list_window_days(db, tenant_id),
        upcoming_dues=[
            DashboardFeeDueItem(
                student_id=row["student_id"],
                student_name=row["student_name"],
                class_name=row["class_name"],
                installment=row["installment"] or None,
                invoice_row_id=row["invoice_row_id"],
                due_amount=row["due_amount"],
                due_date=row["due_date"],
            )
            for row in due_list["data"]
        ],
    )
