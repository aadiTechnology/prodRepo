from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.student_invoice import StudentInvoice

# ORM / API field name -> physical SQL Server column name
_UPDATE_COLUMN_MAP = {
    "installment": "Installment",
}


def list_invoices(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int | None,
    class_id: int | None,
    division_id: int | None,
    installment: str | None,
    status: str | None,
    search: str | None,
    page: int,
    size: int,
    scoped_student_ids: list[int] | None = None,
    student_id: int | None = None,
) -> tuple[list[dict], int]:
    where_sql = [
        "si.tenant_id = :tenant_id",
    ]
    params: dict = {"tenant_id": tenant_id}

    if scoped_student_ids is not None:
        if not scoped_student_ids:
            return [], 0
        placeholders = ", ".join(f":scoped_student_id_{idx}" for idx in range(len(scoped_student_ids)))
        where_sql.append(f"si.student_id IN ({placeholders})")
        for idx, scoped_id in enumerate(scoped_student_ids):
            params[f"scoped_student_id_{idx}"] = int(scoped_id)

    if student_id is not None:
        where_sql.append("si.student_id = :student_id")
        params["student_id"] = int(student_id)

    if academic_year_id is not None:
        where_sql.append("si.academic_year_id = :academic_year_id")
        params["academic_year_id"] = academic_year_id

    if class_id is not None:
        where_sql.append("si.class_id = :class_id")
        params["class_id"] = class_id

    if division_id is not None:
        where_sql.append("s.class_division_id = :division_id")
        params["division_id"] = division_id

    if installment:
        where_sql.append("LTRIM(RTRIM(ISNULL(si.[Installment], ''))) = :installment")
        params["installment"] = installment.strip()

    if search:
        search_term = search.strip()
        normalized_search = search_term.replace("-", "").replace(" ", "")
        where_sql.append(
            "("
            "s.student_name LIKE :search "
            "OR LTRIM(RTRIM(ISNULL(si.invoice_no, ''))) LIKE :search "
            "OR REPLACE(LTRIM(RTRIM(ISNULL(si.invoice_no, ''))), '-', '') LIKE :search_no_dash"
            ")"
        )
        params["search"] = f"%{search_term}%"
        params["search_no_dash"] = f"%{normalized_search}%"

    where_clause = " AND ".join(where_sql)
    offset = page * size
    params["offset"] = offset
    params["size"] = size
    status_filter_sql = ""
    if status:
        status_filter_sql = "WHERE grouped.status = :status"
        params["status"] = status

    grouped_sql = f"""
        SELECT
            MIN(si.id) AS id,
            si.tenant_id,
            si.student_id,
            MAX(s.student_name) AS student_name,
            MAX(s.admission_no) AS admission_no,
            si.academic_year_id,
            si.class_id,
            MAX(c.name) AS class_name,
            MIN(si.fee_structure_id) AS fee_structure_id,
            MIN(si.invoice_no) AS invoice_no,
            CASE
                WHEN COUNT_BIG(*) = 1 THEN MAX(LTRIM(RTRIM(ISNULL(si.[Installment], ''))))
                ELSE 'All installments'
            END AS installment,
            MIN(si.fee_installment_id) AS fee_installment_id,
            SUM(CONVERT(decimal(18, 2), si.total_amount)) AS total_amount,
            SUM(CONVERT(decimal(18, 2), si.paid_amount)) AS paid_amount,
            SUM(CONVERT(decimal(18, 2), si.due_amount)) AS due_amount,
            MIN(si.due_date) AS due_date,
            CASE
                WHEN SUM(CONVERT(decimal(18, 2), si.due_amount)) <= 0 THEN 'Paid'
                WHEN SUM(CASE WHEN si.status = 'Overdue' THEN 1 ELSE 0 END) > 0 THEN 'Overdue'
                WHEN SUM(CONVERT(decimal(18, 2), si.paid_amount)) > 0
                     AND SUM(CONVERT(decimal(18, 2), si.due_amount)) > 0 THEN 'Partial'
                ELSE 'Pending'
            END AS status,
            MAX(si.created_at) AS created_at,
            CASE
                WHEN COUNT_BIG(*) = 1 THEN MAX(fi.description)
                ELSE 'All installments'
            END AS installment_name
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        LEFT JOIN fee_installments fi ON fi.id = si.fee_installment_id
        WHERE {where_clause}
        GROUP BY si.tenant_id, si.student_id, si.academic_year_id, si.class_id
    """

    list_sql = text(
        f"""
        SELECT * FROM ({grouped_sql}) grouped
        {status_filter_sql}
        ORDER BY grouped.created_at DESC, grouped.id DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """
    )

    count_sql = text(
        f"""
        SELECT COUNT(1)
        FROM ({grouped_sql}) grouped
        {status_filter_sql}
        """
    )

    rows = db.execute(list_sql, params).mappings().all()
    total = db.execute(count_sql, params).scalar() or 0
    return [dict(r) for r in rows], int(total)


def get_invoice_by_id(db: Session, *, tenant_id: int, invoice_id: int) -> dict | None:
    sql = text(
        """
        SELECT
            si.id,
            si.tenant_id,
            si.student_id,
            s.student_name,
            s.admission_no,
            si.academic_year_id,
            si.class_id,
            c.name AS class_name,
            si.fee_structure_id,
            si.invoice_no,
            LTRIM(RTRIM(ISNULL(si.[Installment], ''))) AS installment,
            si.fee_installment_id,
            si.total_amount,
            si.paid_amount,
            si.due_amount,
            si.due_date,
            si.status,
            si.created_at,
            si.fee_installment_id,
            fi.description AS installment_name
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        LEFT JOIN fee_installments fi ON fi.id = si.fee_installment_id
        WHERE si.tenant_id = :tenant_id AND si.id = :invoice_id
        """
    )
    row = db.execute(sql, {"tenant_id": tenant_id, "invoice_id": invoice_id}).mappings().first()
    return dict(row) if row else None


def list_student_invoices_for_year(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
) -> list[dict]:
    sql = text(
        """
        SELECT
            si.id,
            si.tenant_id,
            si.student_id,
            s.student_name,
            s.admission_no,
            si.academic_year_id,
            si.class_id,
            c.name AS class_name,
            si.fee_structure_id,
            si.invoice_no,
            LTRIM(RTRIM(ISNULL(si.[Installment], ''))) AS installment,
            si.fee_installment_id,
            si.total_amount,
            si.paid_amount,
            si.due_amount,
            si.due_date,
            si.status,
            si.created_at,
            fi.description AS installment_name
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        LEFT JOIN fee_installments fi ON fi.id = si.fee_installment_id
        WHERE si.tenant_id = :tenant_id
          AND si.student_id = :student_id
          AND si.academic_year_id = :academic_year_id
        ORDER BY si.due_date ASC, si.id ASC
        """
    )
    rows = db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "student_id": student_id,
            "academic_year_id": academic_year_id,
        },
    ).mappings().all()
    return [dict(r) for r in rows]


def get_invoice_by_number(db: Session, *, tenant_id: int, invoice_no: str) -> dict | None:
    sql = text(
        """
        SELECT id, invoice_no
        FROM student_invoices
        WHERE tenant_id = :tenant_id AND invoice_no = :invoice_no
        """
    )
    row = db.execute(sql, {"tenant_id": tenant_id, "invoice_no": invoice_no}).mappings().first()
    return dict(row) if row else None


def insert_invoice(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    academic_year_id: int,
    class_id: int,
    fee_structure_id: int,
    invoice_no: str,
    total_amount: float,
    paid_amount: float,
    due_amount: float,
    due_date: date,
    status: str,
    fee_installment_id: int | None = None,
    installment: str | None = None,
) -> int:
    entity = StudentInvoice(
        tenant_id=tenant_id,
        student_id=student_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        fee_structure_id=fee_structure_id,
        invoice_no=invoice_no,
        total_amount=total_amount,
        paid_amount=paid_amount,
        due_amount=due_amount,
        due_date=due_date,
        status=status,
        fee_installment_id=fee_installment_id,
        installment=installment,
    )
    db.add(entity)
    db.flush()
    return int(entity.id)


def update_invoice(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int,
    update_fields: dict,
) -> None:
    if not update_fields:
        return

    set_parts: list[str] = []
    params: dict = {"tenant_id": tenant_id, "invoice_id": invoice_id}

    for key, value in update_fields.items():
        column = _UPDATE_COLUMN_MAP.get(key, key)
        set_parts.append(f"[{column}] = :{key}" if column != key else f"{column} = :{key}")
        params[key] = value

    sql = text(
        f"""
        UPDATE student_invoices
        SET {", ".join(set_parts)}
        WHERE tenant_id = :tenant_id AND id = :invoice_id
        """
    )
    db.execute(sql, params)


def delete_invoice(db: Session, *, tenant_id: int, invoice_id: int) -> None:
    sql = text(
        """
        DELETE FROM student_invoices
        WHERE tenant_id = :tenant_id AND id = :invoice_id
        """
    )
    db.execute(sql, {"tenant_id": tenant_id, "invoice_id": invoice_id})


def get_invoice_student_info(db: Session, *, tenant_id: int, invoice_id: int) -> dict | None:
    sql = text(
        """
        SELECT
            si.student_id,
            s.student_name,
            s.admission_no,
            s.roll_no,
            si.class_id,
            c.name AS class_name,
            s.class_division_id AS division_id,
            cd.division_name AS division_name
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        LEFT JOIN class_divisions cd ON cd.id = s.class_division_id
        WHERE si.tenant_id = :tenant_id AND si.id = :invoice_id
        """
    )
    row = db.execute(sql, {"tenant_id": tenant_id, "invoice_id": invoice_id}).mappings().first()
    return dict(row) if row else None


def get_invoice_fee_breakdown(db: Session, *, invoice_id: int) -> list[dict]:
    sql = text(
        """
        SELECT
            sii.id,
            sii.fee_category_id,
            fc.name AS fee_category_name,
            sii.amount
        FROM student_invoice_items sii
        LEFT JOIN fee_categories fc ON fc.id = sii.fee_category_id
        WHERE sii.invoice_id = :invoice_id
        ORDER BY sii.id ASC
        """
    )
    rows = db.execute(sql, {"invoice_id": invoice_id}).mappings().all()
    return [dict(r) for r in rows]


def get_fee_structure_breakdown_for_invoice(
    db: Session,
    *,
    tenant_id: int,
    invoice_id: int,
) -> list[dict]:
    sql = text(
        """
        ;WITH invoice_ctx AS (
            SELECT
                si.id AS invoice_id,
                si.tenant_id,
                si.fee_structure_id,
                CONVERT(decimal(10,2), ISNULL(si.total_amount, 0)) AS invoice_total,
                CONVERT(decimal(10,2), ISNULL(si.paid_amount, 0)) AS invoice_paid
            FROM student_invoices si
            WHERE si.tenant_id = :tenant_id AND si.id = :invoice_id
        ),
        category_ids AS (
            SELECT DISTINCT
                NULLIF(LTRIM(RTRIM(value)), '') AS fee_category_id
            FROM fee_structures fs
            INNER JOIN invoice_ctx ic ON ic.fee_structure_id = fs.id
            CROSS APPLY STRING_SPLIT(ISNULL(fs.multi_category_ids, ''), ',')
            UNION
            SELECT DISTINCT
                fs.fee_category_id
            FROM fee_structures fs
            INNER JOIN invoice_ctx ic ON ic.fee_structure_id = fs.id
            WHERE fs.fee_category_id IS NOT NULL
        ),
        category_rows AS (
            SELECT
                ROW_NUMBER() OVER (ORDER BY fc.name ASC, fc.id ASC) AS id,
                fc.id AS fee_category_id,
                fc.name AS fee_category_name,
                CONVERT(decimal(10,2), ISNULL(fc.amount, 0)) AS amount,
                fs.installment_type AS payable_for
            FROM invoice_ctx ic
            INNER JOIN fee_structures fs ON fs.id = ic.fee_structure_id
            INNER JOIN category_ids cids ON cids.fee_category_id IS NOT NULL
            LEFT JOIN fee_categories fc
                ON fc.id = cids.fee_category_id
               AND fc.tenant_id = ic.tenant_id
        )
        SELECT
            cr.id,
            cr.fee_category_id,
            cr.fee_category_name,
            cr.amount,
            cr.payable_for
        FROM category_rows cr
        """
    )
    rows = db.execute(sql, {"tenant_id": tenant_id, "invoice_id": invoice_id}).mappings().all()
    return [dict(r) for r in rows]


def get_invoice_payment_history(
    db: Session,
    *,
    tenant_id: int,
    student_id: int,
    fee_installment_id: int | None,
) -> list[dict]:
    where_parts = [
        "fp.tenant_id = :tenant_id",
        "fp.student_id = :student_id",
    ]
    params: dict = {
        "tenant_id": tenant_id,
        "student_id": student_id,
    }

    if fee_installment_id is not None:
        where_parts.append("fp.fee_installment_id = :fee_installment_id")
        params["fee_installment_id"] = fee_installment_id

    where_clause = " AND ".join(where_parts)
    sql = text(
        f"""
        SELECT
            fp.id AS payment_id,
            fp.payment_date,
            fp.total_amount AS amount,
            fp.payment_method,
            fp.reference_no,
            fp.fee_installment_id,
            fp.payment_status
        FROM fee_payments fp
        WHERE {where_clause}
        ORDER BY fp.payment_date DESC, fp.id DESC
        """
    )
    rows = db.execute(sql, params).mappings().all()
    return [dict(r) for r in rows]


def get_pending_payments_for_student(
    db: Session, *, tenant_id: int, student_id: int
) -> list[dict]:
    sql = text(
        """
        SELECT fp.id AS payment_id, fp.payment_date, fp.total_amount AS amount,
               fp.payment_method, fp.reference_no, fp.fee_installment_id, fp.payment_status
        FROM fee_payments fp
        WHERE fp.tenant_id = :tenant_id AND fp.student_id = :student_id
          AND fp.payment_status = 'pending_approval'
        ORDER BY fp.payment_date DESC, fp.id DESC
        """
    )
    rows = db.execute(sql, {"tenant_id": tenant_id, "student_id": student_id}).mappings().all()
    return [dict(r) for r in rows]


_STATUS_TO_DB = {
    "Pending Approval": "pending_approval",
    "Approved": "completed",
    "Rejected": "rejected",
}


def list_fee_pending_approvals(
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
    scoped_student_ids: list[int] | None = None,
) -> tuple[list[dict], int]:
    where_sql = ["fp.tenant_id = :tenant_id"]
    params: dict = {"tenant_id": tenant_id}

    if scoped_student_ids is not None:
        if not scoped_student_ids:
            return [], 0
        placeholders = ", ".join(f":scope_{idx}" for idx in range(len(scoped_student_ids)))
        where_sql.append(f"fp.student_id IN ({placeholders})")
        for idx, sid in enumerate(scoped_student_ids):
            params[f"scope_{idx}"] = int(sid)

    if class_id is not None:
        where_sql.append("s.class_id = :class_id")
        params["class_id"] = class_id
    if division_id is not None:
        where_sql.append("s.class_division_id = :division_id")
        params["division_id"] = division_id
    if student_id is not None:
        where_sql.append("fp.student_id = :student_id")
        params["student_id"] = student_id

    normalized_status = (status or "Pending Approval").strip() or "Pending Approval"
    if normalized_status != "ALL":
        where_sql.append("fp.payment_status = :payment_status")
        params["payment_status"] = _STATUS_TO_DB.get(normalized_status, "pending_approval")

    if search:
        term = f"%{search.strip()}%"
        where_sql.append("(s.student_name LIKE :search OR ISNULL(fp.reference_no, '') LIKE :search)")
        params["search"] = term

    where_clause = " AND ".join(where_sql)
    params["offset"] = page * size
    params["size"] = size

    list_sql = text(
        f"""
        SELECT
            fp.id,
            fp.payment_date AS request_date,
            fp.student_id,
            s.student_name,
            s.class_id,
            c.name AS class_name,
            s.class_division_id AS division_id,
            cd.division_name,
            fp.total_amount AS amount,
            fp.payment_method,
            fp.reference_no AS transaction_id,
            CASE
                WHEN fp.payment_status = 'pending_approval' THEN 'Pending Approval'
                WHEN fp.payment_status = 'rejected' THEN 'Rejected'
                ELSE 'Approved'
            END AS status
        FROM fee_payments fp
        INNER JOIN students s ON s.id = fp.student_id
        LEFT JOIN classes c ON c.id = s.class_id
        LEFT JOIN class_divisions cd ON cd.id = s.class_division_id
        WHERE {where_clause}
        ORDER BY fp.payment_date DESC, fp.id DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """
    )
    count_sql = text(
        f"""
        SELECT COUNT(1)
        FROM fee_payments fp
        INNER JOIN students s ON s.id = fp.student_id
        WHERE {where_clause}
        """
    )
    rows = db.execute(list_sql, params).mappings().all()
    total = db.execute(count_sql, params).scalar() or 0
    return [dict(r) for r in rows], int(total)
