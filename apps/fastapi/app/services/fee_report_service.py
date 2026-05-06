"""Fee Report Service — reads from student_invoices (source of truth)."""

from datetime import date
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session

from app.schemas.fee_report_schema import (
    FeeReportFilterOptions,
    FeeReportResponse,
    FeeReportRow,
    FeeReportSummary,
)


def get_filter_options(db: Session, tenant_id: int) -> FeeReportFilterOptions:
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

    classes = db.execute(
        text("""
            SELECT DISTINCT c.id, c.name
            FROM classes c
            JOIN student_invoices si ON si.class_id = c.id
            JOIN students s ON s.id = si.student_id
            WHERE s.tenant_id = :tenant_id
              AND c.is_active = 1
              AND c.is_deleted = 0
            ORDER BY c.name
        """),
        {"tenant_id": tenant_id},
    ).fetchall()

    installments = db.execute(
        text("""
            SELECT DISTINCT si.Installment
            FROM student_invoices si
            JOIN students s ON s.id = si.student_id
            WHERE s.tenant_id = :tenant_id
              AND si.Installment IS NOT NULL
            ORDER BY si.Installment
        """),
        {"tenant_id": tenant_id},
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
        filters.append(
            "("
            "LOWER(s.student_name) LIKE :search "
            "OR LOWER(ISNULL(s.admission_no, '')) LIKE :search "
            "OR LOWER(ISNULL(s.student_code, '')) LIKE :search "
            "OR LOWER(si.invoice_no) LIKE :search"
            ")"
        )
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
