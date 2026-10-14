from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.models.attendance_configuration import (
    AttendanceConfigDateShift,
    AttendanceConfigExtraWorkingDay,
    AttendanceConfigHoliday,
    AttendanceConfigNonWorkingDate,
    AttendanceConfigNotification,
    AttendanceConfigShift,
    AttendanceConfigStatus,
    AttendanceConfiguration,
)

_extra_table_ready = False
_date_shift_table_ready = False
_non_working_dates_table_ready = False


def ensure_date_shift_table(db: Session) -> None:
    global _date_shift_table_ready
    if not _date_shift_table_ready:
        db.execute(
            text(
                """
                IF NOT EXISTS (
                    SELECT 1 FROM sys.tables
                    WHERE name = N'attendance_config_date_shifts'
                      AND schema_id = SCHEMA_ID(N'dbo')
                )
                BEGIN
                    CREATE TABLE [dbo].[attendance_config_date_shifts] (
                        [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                        [tenant_id] INT NOT NULL,
                        [configuration_id] INT NOT NULL,
                        [work_date] DATE NOT NULL,
                        [teacher_id] INT NULL,
                        [shift_id] INT NULL,
                        [start_time] VARCHAR(5) NOT NULL,
                        [end_time] VARCHAR(5) NOT NULL,
                        [created_at] DATETIME NOT NULL
                            CONSTRAINT [DF_att_date_shift_created] DEFAULT (GETUTCDATE()),
                        [created_by] INT NULL,
                        [updated_at] DATETIME NULL,
                        [updated_by] INT NULL,
                        [is_deleted] BIT NOT NULL
                            CONSTRAINT [DF_att_date_shift_deleted] DEFAULT ((0)),
                        [deleted_at] DATETIME NULL,
                        [deleted_by] INT NULL
                    );
                END
                """
            )
        )
        db.commit()
        _date_shift_table_ready = True

    db.execute(
        text(
            """
            IF OBJECT_ID(N'dbo.attendance_config_date_shifts', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.attendance_config_date_shifts', N'teacher_id') IS NULL
            BEGIN
                ALTER TABLE [dbo].[attendance_config_date_shifts]
                ADD [teacher_id] INT NULL;
            END
            """
        )
    )
    db.commit()


def ensure_non_working_dates_table(db: Session) -> None:
    global _non_working_dates_table_ready
    if _non_working_dates_table_ready:
        return
    db.execute(
        text(
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.tables
                WHERE name = N'attendance_config_non_working_dates'
                  AND schema_id = SCHEMA_ID(N'dbo')
            )
            BEGIN
                CREATE TABLE [dbo].[attendance_config_non_working_dates] (
                    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [tenant_id] INT NOT NULL,
                    [configuration_id] INT NOT NULL,
                    [work_date] DATE NOT NULL,
                    [created_at] DATETIME NOT NULL
                        CONSTRAINT [DF_att_non_working_created] DEFAULT (GETUTCDATE()),
                    [created_by] INT NULL,
                    [updated_at] DATETIME NULL,
                    [updated_by] INT NULL,
                    [is_deleted] BIT NOT NULL
                        CONSTRAINT [DF_att_non_working_deleted] DEFAULT ((0)),
                    [deleted_at] DATETIME NULL,
                    [deleted_by] INT NULL
                );
            END
            """
        )
    )
    db.commit()
    _non_working_dates_table_ready = True


def ensure_extra_working_table(db: Session) -> None:
    """Create the extra-working-day table when this database predates the model."""
    global _extra_table_ready
    if _extra_table_ready:
        return
    db.execute(
        text(
            """
            IF NOT EXISTS (
                SELECT 1 FROM sys.tables
                WHERE name = N'attendance_config_extra_working_days'
                  AND schema_id = SCHEMA_ID(N'dbo')
            )
            BEGIN
                CREATE TABLE [dbo].[attendance_config_extra_working_days] (
                    [id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    [tenant_id] INT NOT NULL,
                    [configuration_id] INT NOT NULL,
                    [teacher_id] INT NOT NULL,
                    [weekday] VARCHAR(10) NOT NULL,
                    [created_at] DATETIME NOT NULL
                        CONSTRAINT [DF_att_extra_created] DEFAULT (GETUTCDATE()),
                    [created_by] INT NULL,
                    [updated_at] DATETIME NULL,
                    [updated_by] INT NULL,
                    [is_deleted] BIT NOT NULL
                        CONSTRAINT [DF_att_extra_deleted] DEFAULT ((0)),
                    [deleted_at] DATETIME NULL,
                    [deleted_by] INT NULL
                );
            END
            IF COL_LENGTH(N'dbo.attendance_config_extra_working_days', N'work_date') IS NULL
            BEGIN
                ALTER TABLE [dbo].[attendance_config_extra_working_days]
                ADD [work_date] DATE NULL;
            END
            """
        )
    )
    db.commit()
    _extra_table_ready = True


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


def list_extra_working_days(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigExtraWorkingDay]:
    ensure_extra_working_table(db)
    return (
        db.query(AttendanceConfigExtraWorkingDay)
        .filter(
            AttendanceConfigExtraWorkingDay.tenant_id == tenant_id,
            AttendanceConfigExtraWorkingDay.configuration_id == configuration_id,
            AttendanceConfigExtraWorkingDay.is_deleted == False,  # noqa: E712
        )
        .order_by(
            AttendanceConfigExtraWorkingDay.weekday.asc(),
            AttendanceConfigExtraWorkingDay.teacher_id.asc(),
        )
        .all()
    )


def replace_extra_working_days(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    items: list[tuple[int, str, date | None]],
) -> None:
    now = datetime.utcnow()
    for row in list_extra_working_days(
        db, tenant_id=tenant_id, configuration_id=configuration_id
    ):
        row.is_deleted = True
        row.deleted_at = now
        row.deleted_by = user_id
        row.updated_at = now
        row.updated_by = user_id
    for teacher_id, weekday, work_date in items:
        db.add(
            AttendanceConfigExtraWorkingDay(
                tenant_id=tenant_id,
                configuration_id=configuration_id,
                teacher_id=teacher_id,
                weekday=weekday,
                work_date=work_date,
                created_at=now,
                created_by=user_id,
            )
        )
    db.flush()


def list_date_shift_overrides(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigDateShift]:
    ensure_date_shift_table(db)
    return (
        db.query(AttendanceConfigDateShift)
        .filter(
            AttendanceConfigDateShift.tenant_id == tenant_id,
            AttendanceConfigDateShift.configuration_id == configuration_id,
            AttendanceConfigDateShift.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigDateShift.work_date.asc())
        .all()
    )


def get_date_shift_override_for_teacher(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    work_date: date,
    teacher_id: int | None = None,
) -> AttendanceConfigDateShift | None:
    ensure_date_shift_table(db)
    base = (
        AttendanceConfigDateShift.tenant_id == tenant_id,
        AttendanceConfigDateShift.configuration_id == configuration_id,
        AttendanceConfigDateShift.work_date == work_date,
        AttendanceConfigDateShift.is_deleted == False,  # noqa: E712
    )
    if teacher_id is not None:
        row = (
            db.query(AttendanceConfigDateShift)
            .filter(*base, AttendanceConfigDateShift.teacher_id == teacher_id)
            .first()
        )
        if row is not None:
            return row
    return (
        db.query(AttendanceConfigDateShift)
        .filter(*base, AttendanceConfigDateShift.teacher_id.is_(None))
        .first()
    )


def list_non_working_dates(
    db: Session, *, tenant_id: int, configuration_id: int
) -> list[AttendanceConfigNonWorkingDate]:
    ensure_non_working_dates_table(db)
    return (
        db.query(AttendanceConfigNonWorkingDate)
        .filter(
            AttendanceConfigNonWorkingDate.tenant_id == tenant_id,
            AttendanceConfigNonWorkingDate.configuration_id == configuration_id,
            AttendanceConfigNonWorkingDate.is_deleted == False,  # noqa: E712
        )
        .order_by(AttendanceConfigNonWorkingDate.work_date.asc())
        .all()
    )


def is_non_working_date(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    work_date: date,
) -> bool:
    ensure_non_working_dates_table(db)
    row = (
        db.query(AttendanceConfigNonWorkingDate.id)
        .filter(
            AttendanceConfigNonWorkingDate.tenant_id == tenant_id,
            AttendanceConfigNonWorkingDate.configuration_id == configuration_id,
            AttendanceConfigNonWorkingDate.work_date == work_date,
            AttendanceConfigNonWorkingDate.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    return row is not None


def replace_non_working_dates(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    work_dates: list[date],
) -> None:
    ensure_non_working_dates_table(db)
    now = datetime.utcnow()
    for row in list_non_working_dates(
        db, tenant_id=tenant_id, configuration_id=configuration_id
    ):
        row.is_deleted = True
        row.deleted_at = now
        row.deleted_by = user_id
        row.updated_at = now
        row.updated_by = user_id
    for work_date in work_dates:
        db.add(
            AttendanceConfigNonWorkingDate(
                tenant_id=tenant_id,
                configuration_id=configuration_id,
                work_date=work_date,
                created_at=now,
                created_by=user_id,
            )
        )
    db.flush()


def replace_date_shift_overrides(
    db: Session,
    *,
    tenant_id: int,
    configuration_id: int,
    user_id: int,
    items: list[tuple[date, str, str, int | None, int | None]],
) -> None:
    ensure_date_shift_table(db)
    now = datetime.utcnow()
    for row in list_date_shift_overrides(
        db, tenant_id=tenant_id, configuration_id=configuration_id
    ):
        row.is_deleted = True
        row.deleted_at = now
        row.deleted_by = user_id
        row.updated_at = now
        row.updated_by = user_id
    for work_date, start_time, end_time, shift_id, teacher_id in items:
        db.add(
            AttendanceConfigDateShift(
                tenant_id=tenant_id,
                configuration_id=configuration_id,
                work_date=work_date,
                teacher_id=teacher_id,
                shift_id=shift_id,
                start_time=start_time,
                end_time=end_time,
                created_at=now,
                created_by=user_id,
            )
        )
    db.flush()
