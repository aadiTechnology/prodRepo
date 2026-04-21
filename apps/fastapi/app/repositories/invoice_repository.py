from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session


def list_invoices(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int | None,
    class_id: int | None,
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

    if status:
        where_sql.append("si.status = :status")
        params["status"] = status

    if search:
        where_sql.append("s.student_name LIKE :search")
        params["search"] = f"%{search.strip()}%"

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
    sql = text(
        """
        INSERT INTO student_invoices (
            tenant_id, student_id, academic_year_id, class_id, fee_structure_id,
            invoice_no, total_amount, paid_amount, due_amount, due_date, status, created_at
        )
        VALUES (
            :tenant_id, :student_id, :academic_year_id, :class_id, :fee_structure_id,
            :invoice_no, :total_amount, :paid_amount, :due_amount, :due_date, :status, GETUTCDATE()
        );
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;
        """
    )
    row = db.execute(
        sql,
        {
            "tenant_id": tenant_id,
            "student_id": student_id,
            "academic_year_id": academic_year_id,
            "class_id": class_id,
            "fee_structure_id": fee_structure_id,
            "invoice_no": invoice_no,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "due_amount": due_amount,
            "due_date": due_date,
            "status": status,
        },
    ).first()
    return int(row[0])


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
