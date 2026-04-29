from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.student_invoice import StudentInvoice

def list_invoices(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int | None,
    class_id: int | None,
    installment: str | None,
    status: str | None,
    search: str | None,
    page: int,
    size: int,
) -> tuple[list[dict], int]:
    where_sql = [
        "si.tenant_id = :tenant_id",
    ]
    params: dict = {"tenant_id": tenant_id}

    if academic_year_id is not None:
        where_sql.append("si.academic_year_id = :academic_year_id")
        params["academic_year_id"] = academic_year_id

    if class_id is not None:
        where_sql.append("si.class_id = :class_id")
        params["class_id"] = class_id

    if installment:
        where_sql.append("LTRIM(RTRIM(ISNULL(si.[Installment], ''))) = :installment")
        params["installment"] = installment.strip()

    if status:
        where_sql.append("si.status = :status")
        params["status"] = status

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

    list_sql = text(
        f"""
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
            si.created_at
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        WHERE {where_clause}
        ORDER BY si.created_at DESC, si.id DESC
        OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """
    )

    count_sql = text(
        f"""
        SELECT COUNT(1)
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        WHERE {where_clause}
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
            si.created_at
        FROM student_invoices si
        INNER JOIN students s ON s.id = si.student_id
        INNER JOIN classes c ON c.id = si.class_id
        WHERE si.tenant_id = :tenant_id AND si.id = :invoice_id
        """
    )
    row = db.execute(sql, {"tenant_id": tenant_id, "invoice_id": invoice_id}).mappings().first()
    return dict(row) if row else None


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
        set_parts.append(f"{key} = :{key}")
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
        LEFT JOIN fee_categories fc ON fc.id = TRY_CONVERT(varchar(36), sii.fee_category_id)
        WHERE sii.invoice_id = :invoice_id
        ORDER BY sii.id ASC
        """
    )
    rows = db.execute(sql, {"invoice_id": invoice_id}).mappings().all()
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
            fp.reference_no
        FROM fee_payments fp
        WHERE {where_clause}
        ORDER BY fp.payment_date DESC, fp.id DESC
        """
    )
    rows = db.execute(sql, params).mappings().all()
    return [dict(r) for r in rows]
