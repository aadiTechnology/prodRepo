from __future__ import annotations

from datetime import date, datetime

from sqlalchemy.orm import Session

from app.models.attendance_configuration import (
    AttendanceConfigHoliday,
    AttendanceConfigNotification,
    AttendanceConfigShift,
    AttendanceConfigStatus,
    AttendanceConfiguration,
)


def get_by_tenant_year(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
) -> AttendanceConfiguration | None:
    return (
        db.query(AttendanceConfiguration)
        .filter(
            AttendanceConfiguration.tenant_id == tenant_id,
            AttendanceConfiguration.academic_year_id == academic_year_id,
            AttendanceConfiguration.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def get_by_id(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
) -> AttendanceConfiguration | None:
    return (
        db.query(AttendanceConfiguration)
        .filter(
            AttendanceConfiguration.id == configuration_id,
            AttendanceConfiguration.tenant_id == tenant_id,
            AttendanceConfiguration.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_configuration(
    db: Session,
    *,
    tenant_id: int,
    academic_year_id: int,
    user_id: int,
) -> AttendanceConfiguration:
    now = datetime.utcnow()
    row = AttendanceConfiguration(
        tenant_id=tenant_id,
        academic_year_id=academic_year_id,
        created_at=now,
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_configuration(
    db: Session,
    row: AttendanceConfiguration,
    *,
    user_id: int,
    **fields,
) -> AttendanceConfiguration:
    for key, value in fields.items():
        if value is not None and hasattr(row, key):
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.flush()
    return row


def soft_delete_configuration(
    db: Session,
    row: AttendanceConfiguration,
    *,
    user_id: int,
) -> None:
    now = datetime.utcnow()
    row.is_deleted = True
    row.deleted_at = now
    row.deleted_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.flush()


# ---- Holidays ----


def list_holidays(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigHoliday]:
    return (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.configuration_id == configuration_id,
            AttendanceConfigHoliday.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigHoliday.holiday_date.asc())
        .all()
    )


def get_holiday(
    db: Session, *, tenant_id: int, holiday_id: int
) -> AttendanceConfigHoliday | None:
    return (
        db.query(AttendanceConfigHoliday)
        .filter(
            AttendanceConfigHoliday.id == holiday_id,
            AttendanceConfigHoliday.tenant_id == tenant_id,
            AttendanceConfigHoliday.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_holiday(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    name: str,
    holiday_date: date,
    description: str | None,
    status: str,
) -> AttendanceConfigHoliday:
    row = AttendanceConfigHoliday(
        tenant_id=tenant_id,
        configuration_id=configuration_id,
        name=name.strip(),
        holiday_date=holiday_date,
        description=(description or "").strip() or None,
        status=status,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_holiday(
    db: Session,
    row: AttendanceConfigHoliday,
    *,
    user_id: int,
    **fields,
) -> AttendanceConfigHoliday:
    for key, value in fields.items():
        if value is not None and hasattr(row, key):
            if key == "name" and isinstance(value, str):
                value = value.strip()
            if key == "description" and isinstance(value, str):
                value = value.strip() or None
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.flush()
    return row


def soft_delete_holiday(
    db: Session, row: AttendanceConfigHoliday, *, user_id: int
) -> None:
    now = datetime.utcnow()
    row.is_deleted = True
    row.deleted_at = now
    row.deleted_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.flush()


# ---- Shifts ----


def list_shifts(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigShift]:
    return (
        db.query(AttendanceConfigShift)
        .filter(
            AttendanceConfigShift.tenant_id == tenant_id,
            AttendanceConfigShift.configuration_id == configuration_id,
            AttendanceConfigShift.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigShift.id.asc())
        .all()
    )


def get_shift(
    db: Session, *, tenant_id: int, shift_id: int
) -> AttendanceConfigShift | None:
    return (
        db.query(AttendanceConfigShift)
        .filter(
            AttendanceConfigShift.id == shift_id,
            AttendanceConfigShift.tenant_id == tenant_id,
            AttendanceConfigShift.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_shift(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    name: str,
    start_time: str,
    end_time: str,
    status: str,
) -> AttendanceConfigShift:
    row = AttendanceConfigShift(
        tenant_id=tenant_id,
        configuration_id=configuration_id,
        name=name.strip(),
        start_time=start_time,
        end_time=end_time,
        status=status,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_shift(
    db: Session,
    row: AttendanceConfigShift,
    *,
    user_id: int,
    **fields,
) -> AttendanceConfigShift:
    for key, value in fields.items():
        if value is not None and hasattr(row, key):
            if key == "name" and isinstance(value, str):
                value = value.strip()
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.flush()
    return row


def soft_delete_shift(
    db: Session, row: AttendanceConfigShift, *, user_id: int
) -> None:
    now = datetime.utcnow()
    row.is_deleted = True
    row.deleted_at = now
    row.deleted_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.flush()


# ---- Statuses ----


def list_statuses(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigStatus]:
    return (
        db.query(AttendanceConfigStatus)
        .filter(
            AttendanceConfigStatus.tenant_id == tenant_id,
            AttendanceConfigStatus.configuration_id == configuration_id,
            AttendanceConfigStatus.is_deleted == False,  # noqa: E712
        )
        .order_by(
            AttendanceConfigStatus.sort_order.asc(),
            AttendanceConfigStatus.id.asc(),
        )
        .all()
    )


def get_status(
    db: Session, *, tenant_id: int, status_id: int
) -> AttendanceConfigStatus | None:
    return (
        db.query(AttendanceConfigStatus)
        .filter(
            AttendanceConfigStatus.id == status_id,
            AttendanceConfigStatus.tenant_id == tenant_id,
            AttendanceConfigStatus.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def next_status_sort_order(
    db: Session, *, tenant_id: int, configuration_id: int
) -> int:
    rows = list_statuses(db, tenant_id=tenant_id, configuration_id=configuration_id)
    if not rows:
        return 0
    return max(r.sort_order for r in rows) + 1


def create_status(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    name: str,
    color: str,
    is_active: bool,
    sort_order: int,
) -> AttendanceConfigStatus:
    row = AttendanceConfigStatus(
        tenant_id=tenant_id,
        configuration_id=configuration_id,
        name=name.strip(),
        color=color.strip(),
        is_active=is_active,
        sort_order=sort_order,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_status(
    db: Session,
    row: AttendanceConfigStatus,
    *,
    user_id: int,
    **fields,
) -> AttendanceConfigStatus:
    for key, value in fields.items():
        if value is not None and hasattr(row, key):
            if key in ("name", "color") and isinstance(value, str):
                value = value.strip()
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.flush()
    return row


def soft_delete_status(
    db: Session, row: AttendanceConfigStatus, *, user_id: int
) -> None:
    now = datetime.utcnow()
    row.is_deleted = True
    row.deleted_at = now
    row.deleted_by = user_id
    row.updated_at = now
    row.updated_by = user_id
    db.flush()


# ---- Notifications ----


def list_notifications(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigNotification]:
    return (
        db.query(AttendanceConfigNotification)
        .filter(
            AttendanceConfigNotification.tenant_id == tenant_id,
            AttendanceConfigNotification.configuration_id == configuration_id,
            AttendanceConfigNotification.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigNotification.id.asc())
        .all()
    )


def get_notification(
    db: Session, *, tenant_id: int, notification_id: int
) -> AttendanceConfigNotification | None:
    return (
        db.query(AttendanceConfigNotification)
        .filter(
            AttendanceConfigNotification.id == notification_id,
            AttendanceConfigNotification.tenant_id == tenant_id,
            AttendanceConfigNotification.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def create_notification(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    label: str,
    recipients: str,
    triggers: str,
    channels: str,
    is_enabled: bool,
) -> AttendanceConfigNotification:
    row = AttendanceConfigNotification(
        tenant_id=tenant_id,
        configuration_id=configuration_id,
        label=label.strip(),
        recipients=recipients,
        triggers=triggers,
        channels=channels,
        is_enabled=is_enabled,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(row)
    db.flush()
    return row


def update_notification(
    db: Session,
    row: AttendanceConfigNotification,
    *,
    user_id: int,
    **fields,
) -> AttendanceConfigNotification:
    for key, value in fields.items():
        if value is not None and hasattr(row, key):
            setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.flush()
    return row


def commit(db: Session) -> None:
    db.commit()
