from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models.staff_attendance import StaffAttendance


def list_records(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: int | None,
    from_date: date | None,
    to_date: date | None,
) -> list[StaffAttendance]:
    query = db.query(StaffAttendance).filter(
        StaffAttendance.tenant_id == tenant_id,
        StaffAttendance.is_deleted == False,  # noqa: E712
    )
    if teacher_id is not None:
        query = query.filter(StaffAttendance.teacher_id == teacher_id)
    if from_date is not None:
        query = query.filter(StaffAttendance.attendance_date >= from_date)
    if to_date is not None:
        query = query.filter(StaffAttendance.attendance_date <= to_date)
    return query.order_by(StaffAttendance.attendance_date.desc()).all()


def get_by_id(
    db: Session,
    *,
    tenant_id: int,
    record_id: int,
) -> StaffAttendance | None:
    return (
        db.query(StaffAttendance)
        .filter(
            StaffAttendance.id == record_id,
            StaffAttendance.tenant_id == tenant_id,
            StaffAttendance.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def get_by_teacher_date(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: int,
    attendance_date: date,
) -> StaffAttendance | None:
    return (
        db.query(StaffAttendance)
        .filter(
            StaffAttendance.tenant_id == tenant_id,
            StaffAttendance.teacher_id == teacher_id,
            StaffAttendance.attendance_date == attendance_date,
            StaffAttendance.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def upsert_mark(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: int,
    attendance_date: date,
    status: str,
    check_in_time: str | None,
    check_out_time: str | None,
    remarks: str | None,
    working_hours_minutes: int | None,
    overtime_minutes: int | None,
    is_submitted: bool,
    approval_status: str,
    rejection_reason: str | None,
    user_id: int,
) -> StaffAttendance:
    row = get_by_teacher_date(
        db,
        tenant_id=tenant_id,
        teacher_id=teacher_id,
        attendance_date=attendance_date,
    )
    if row is None:
        row = StaffAttendance(
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            attendance_date=attendance_date,
            created_by=user_id,
        )
        db.add(row)

    row.status = status
    row.check_in_time = check_in_time
    row.check_out_time = check_out_time
    row.remarks = remarks
    row.working_hours_minutes = working_hours_minutes
    row.overtime_minutes = overtime_minutes
    row.is_submitted = is_submitted
    row.approval_status = approval_status
    row.rejection_reason = rejection_reason
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row


def update_approval(
    db: Session,
    row: StaffAttendance,
    *,
    approval_status: str,
    rejection_reason: str | None,
    user_id: int,
) -> StaffAttendance:
    row.approval_status = approval_status
    row.rejection_reason = rejection_reason if approval_status == "Rejected" else None
    row.updated_by = user_id
    row.updated_at = datetime.utcnow()
    db.flush()
    return row
