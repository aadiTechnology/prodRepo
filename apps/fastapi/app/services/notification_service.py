"""Service: in-app notification list, mark-read, settings, and source materialization."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import List, Optional, Sequence

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging_config import get_logger
from app.models.holiday import Holiday
from app.models.notice import Notice
from app.models.notification import UserNotification
from app.models.syllabus import Syllabus
from app.repositories import notification_repository as repo
from app.schemas.notification_schema import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    NotificationCountResponse,
    NotificationCreateRequest,
    NotificationCreateResponse,
    NotificationListResponse,
    NotificationMarkReadResponse,
    NotificationResponse,
    NotificationSettingsResponse,
    NotificationSettingsUpdateRequest,
)
from app.services import fcm_service

logger = get_logger(__name__)

VALID_MODULES = ("syllabus", "holiday", "notice", "exam", "general")
VALID_PLATFORMS = ("android", "ios", "web")
# Lookback window when materializing recent notice / syllabus events
_MATERIALIZE_LOOKBACK_DAYS = 14
_MAX_SOURCE_ITEMS = 25


def _require_tenant(tenant_id: Optional[int]) -> int:
    if tenant_id is None:
        raise ValidationException("Notifications require a school (tenant) context")
    return int(tenant_id)


def _infer_module(subject: str, from_: str) -> str:
    """Infer settings-module key from subject/from text (no extra API fields)."""
    text = f"{subject} {from_}".lower()
    for module in ("syllabus", "holiday", "notice", "exam"):
        if module in text:
            return module
    return "general"


def _settings_to_response(row) -> NotificationSettingsResponse:
    return NotificationSettingsResponse(
        syllabus=bool(row.syllabus_enabled),
        holiday=bool(row.holiday_enabled),
        notice=bool(row.notice_enabled),
        exam=bool(row.exam_enabled),
    )


def _enabled_modules_from_settings(row) -> List[str]:
    result: List[str] = ["general"]  # always show generic creates
    if row.syllabus_enabled:
        result.append("syllabus")
    if row.holiday_enabled:
        result.append("holiday")
    if row.notice_enabled:
        result.append("notice")
    if row.exam_enabled:
        result.append("exam")
    return result


def create_notification(
    db: Session,
    *,
    tenant_id: Optional[int],
    from_: str,
    to: str,
    subject: str,
    body: str,
    created_by: Optional[int] = None,
) -> NotificationCreateResponse:
    """
    Reusable Notification Create API for any module.

    Only From / To / Subject / Body are accepted as content fields.
    Persists to `notifications`, fans out to `user_notifications` for the in-app
    inbox, then best-effort FCM push to registered device tokens.
    FCM failures never fail this create.

    Extension (Notices, Syllabus, etc.): after a successful Save, call this function
    with the same four fields. Do not re-implement insert logic in feature services.
    """
    tid = _require_tenant(tenant_id)

    sender = (from_ or "").strip()
    recipient = (to or "").strip()
    subj = (subject or "").strip()
    msg = (body or "").strip()

    if not sender:
        raise ValidationException("from is required")
    if not recipient:
        raise ValidationException("to is required")
    if not subj:
        raise ValidationException("subject is required")
    if not msg:
        raise ValidationException("body is required")

    # 1) Canonical table — single source of truth for push/Firebase workers
    master = repo.insert_notification(
        db,
        tenant_id=tid,
        sender=sender,
        recipient=recipient,
        subject=subj,
        body=msg,
        created_by=created_by,
    )

    # 2) Resolve audience → users and fan-out inbox rows
    user_ids = repo.resolve_recipient_user_ids(db, tenant_id=tid, to=recipient)
    module = _infer_module(subj, sender)
    delivered = repo.create_user_inbox_rows(
        db,
        tenant_id=tid,
        user_ids=user_ids,
        subject=subj,
        body=msg,
        module=module,
        notification_id=int(master.id),
        created_by=created_by,
    )
    logger.info(
        "Notification created id=%s tenant=%s recipients=%s delivered=%s module=%s",
        master.id,
        tid,
        len(user_ids),
        delivered,
        module,
    )

    # 3) FCM push — best-effort; never fail notification creation
    _dispatch_fcm_push(
        db,
        tenant_id=tid,
        user_ids=user_ids,
        subject=subj,
        body=msg,
        notification_id=int(master.id),
        module=module,
    )

    return NotificationCreateResponse(
        id=int(master.id),
        from_=master.sender,
        to=master.recipient,
        subject=master.subject,
        body=master.body,
    )


def register_device_token(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
    payload: DeviceRegisterRequest,
) -> DeviceRegisterResponse:
    """Upsert the caller's FCM device token (idempotent on fcm_token)."""
    tid = _require_tenant(tenant_id)
    token = (payload.fcm_token or "").strip()
    platform = (payload.platform or "").strip().lower()
    if not token:
        raise ValidationException("fcm_token is required")
    if platform not in VALID_PLATFORMS:
        raise ValidationException("platform must be android, ios, or web")

    row = repo.upsert_device_token(
        db,
        tenant_id=tid,
        user_id=user_id,
        fcm_token=token,
        platform=platform,
        created_by=user_id,
    )
    logger.info(
        "Device token registered id=%s user=%s tenant=%s platform=%s",
        row.id,
        user_id,
        tid,
        platform,
    )
    return DeviceRegisterResponse(
        id=int(row.id),
        fcm_token=row.fcm_token,
        platform=row.platform,
        is_active=bool(row.is_active),
    )


def _dispatch_fcm_push(
    db: Session,
    *,
    tenant_id: int,
    user_ids: Sequence[int],
    subject: str,
    body: str,
    notification_id: int,
    module: str,
) -> None:
    """Send FCM to active tokens for resolved recipients. Errors are logged only."""
    try:
        if not user_ids:
            return
        token_rows = repo.list_active_tokens_for_users(
            db, tenant_id=tenant_id, user_ids=user_ids
        )
        tokens = [r.fcm_token for r in token_rows if r.fcm_token]
        if not tokens:
            logger.debug(
                "FCM skipped for notification_id=%s: no active device tokens",
                notification_id,
            )
            return

        success, failure, invalid = fcm_service.send_to_tokens(
            tokens=tokens,
            title=subject[:255],
            body=body[:1000] if body else subject,
            data={
                "notification_id": str(notification_id),
                "module": module or "general",
                "type": "app_notification",
            },
        )
        logger.info(
            "FCM dispatch notification_id=%s tokens=%s success=%s failure=%s",
            notification_id,
            len(tokens),
            success,
            failure,
        )
        if invalid:
            deactivated = repo.deactivate_device_tokens(db, fcm_tokens=invalid)
            logger.info(
                "Deactivated %s invalid FCM token(s) after notification_id=%s",
                deactivated,
                notification_id,
            )
    except Exception:
        logger.exception(
            "FCM push failed for notification_id=%s (inbox create succeeded)",
            notification_id,
        )


def create_notification_from_request(
    db: Session,
    *,
    tenant_id: Optional[int],
    payload: NotificationCreateRequest,
    created_by: Optional[int] = None,
) -> NotificationCreateResponse:
    """HTTP-facing wrapper: maps the fixed From/To/Subject/Body request."""
    return create_notification(
        db,
        tenant_id=tenant_id,
        from_=payload.from_,
        to=payload.to,
        subject=payload.subject,
        body=payload.body,
        created_by=created_by,
    )


def _to_response(row: UserNotification) -> NotificationResponse:
    kind = (row.kind or "general").lower()
    if kind not in ("reminder", "day", "general"):
        kind = "general"
    module = (row.module or "").lower()
    if module not in VALID_MODULES:
        module = "general"
    return NotificationResponse(
        id=str(row.id),
        module=module,  # type: ignore[arg-type]
        title=row.title,
        message=row.message,
        created_at=row.created_at,
        is_read=bool(row.is_read),
        kind=kind,  # type: ignore[arg-type]
        entity_id=row.entity_id,
    )


def _is_exam_holiday(holiday: Holiday) -> bool:
    """Heuristic: treat holiday rows that look exam-related as Exam module events."""
    text = f"{holiday.holiday_type or ''} {holiday.holiday_name or ''}".upper()
    return "EXAM" in text


def _holiday_covers_day(holiday: Holiday, day: date) -> bool:
    start = holiday.start_date
    if start is None:
        return False
    end = holiday.end_date or start
    return start <= day <= end


def _active_holidays_for_window(db: Session, *, tenant_id: int, today: date, tomorrow: date):
    """Holidays active today or tomorrow (including multi-day ranges)."""
    return (
        db.query(Holiday)
        .filter(
            Holiday.tenant_id == tenant_id,
            Holiday.is_active == True,  # noqa: E712
            Holiday.start_date <= tomorrow,
            or_(Holiday.end_date.is_(None), Holiday.end_date >= today),
        )
        .all()
    )


def _materialize_holiday_exam_events(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    today: date,
) -> None:
    tomorrow = today + timedelta(days=1)
    holidays = _active_holidays_for_window(db, tenant_id=tenant_id, today=today, tomorrow=tomorrow)

    candidates: List[UserNotification] = []
    source_keys: List[str] = []

    for h in holidays:
        is_exam = _is_exam_holiday(h)
        module = "exam" if is_exam else "holiday"
        name = (h.holiday_name or "Event").strip() or "Event"

        if _holiday_covers_day(h, today):
            key = f"{module}:{h.id}:day:{today.isoformat()}"
            source_keys.append(key)
            if is_exam:
                title = f"{name} — today"
                message = (
                    f"Exam day: {name} is scheduled today. "
                    "Please ensure students arrive on time with required materials."
                )
            else:
                title = f"{name} — today"
                message = (
                    f"Holiday today: {name}. Classes and regular activities are suspended "
                    "as per the academic calendar."
                )
            candidates.append(
                UserNotification(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    module=module,
                    title=title,
                    message=message,
                    kind="day",
                    is_read=False,
                    source_key=key,
                    entity_id=h.id,
                    created_at=datetime.utcnow(),
                    created_by=user_id,
                )
            )

        if _holiday_covers_day(h, tomorrow):
            key = f"{module}:{h.id}:reminder:{tomorrow.isoformat()}"
            source_keys.append(key)
            if is_exam:
                title = f"Reminder: {name} tomorrow"
                message = (
                    f"{name} is scheduled for tomorrow. "
                    "Confirm exam seating and circulate last-minute instructions if needed."
                )
            else:
                title = f"Reminder: {name} tomorrow"
                message = (
                    f"{name} is scheduled for tomorrow. "
                    "Plan activities and communications accordingly."
                )
            candidates.append(
                UserNotification(
                    tenant_id=tenant_id,
                    user_id=user_id,
                    module=module,
                    title=title,
                    message=message,
                    kind="reminder",
                    is_read=False,
                    source_key=key,
                    entity_id=h.id,
                    created_at=datetime.utcnow(),
                    created_by=user_id,
                )
            )

    if not candidates:
        return

    existing = repo.existing_source_keys(
        db, tenant_id=tenant_id, user_id=user_id, source_keys=source_keys
    )
    to_create = [c for c in candidates if c.source_key not in existing]
    if to_create:
        created = repo.bulk_insert_notifications(db, rows=to_create)
        logger.info(
            "Materialized %s holiday/exam notification(s) for user %s tenant %s",
            created,
            user_id,
            tenant_id,
        )


def _materialize_notice_events(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    today: date,
) -> None:
    since = datetime.combine(today - timedelta(days=_MATERIALIZE_LOOKBACK_DAYS), datetime.min.time())
    notices = (
        db.query(Notice)
        .filter(
            Notice.tenant_id == tenant_id,
            Notice.is_deleted == False,  # noqa: E712
            Notice.is_published == True,  # noqa: E712
            Notice.created_at >= since,
        )
        .order_by(Notice.created_at.desc())
        .limit(_MAX_SOURCE_ITEMS)
        .all()
    )
    if not notices:
        return

    source_keys = [f"notice:{n.id}" for n in notices]
    existing = repo.existing_source_keys(
        db, tenant_id=tenant_id, user_id=user_id, source_keys=source_keys
    )
    candidates: List[UserNotification] = []
    for n in notices:
        key = f"notice:{n.id}"
        if key in existing:
            continue
        title = (n.title or "New notice").strip() or "New notice"
        desc = (n.description or "").strip()
        message = desc[:500] if desc else f"A notice has been posted: {title}"
        candidates.append(
            UserNotification(
                tenant_id=tenant_id,
                user_id=user_id,
                module="notice",
                title=title,
                message=message,
                kind="general",
                is_read=False,
                source_key=key,
                entity_id=n.id,
                created_at=n.published_at or n.created_at or datetime.utcnow(),
                created_by=user_id,
            )
        )
    if candidates:
        created = repo.bulk_insert_notifications(db, rows=candidates)
        logger.info(
            "Materialized %s notice notification(s) for user %s tenant %s",
            created,
            user_id,
            tenant_id,
        )


def _materialize_syllabus_events(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    today: date,
) -> None:
    since = datetime.combine(today - timedelta(days=_MATERIALIZE_LOOKBACK_DAYS), datetime.min.time())
    rows = (
        db.query(Syllabus)
        .filter(
            Syllabus.tenant_id == tenant_id,
            Syllabus.is_deleted == False,  # noqa: E712
            Syllabus.created_at >= since,
        )
        .order_by(Syllabus.created_at.desc())
        .limit(_MAX_SOURCE_ITEMS)
        .all()
    )
    if not rows:
        return

    source_keys = [f"syllabus:{s.id}" for s in rows]
    existing = repo.existing_source_keys(
        db, tenant_id=tenant_id, user_id=user_id, source_keys=source_keys
    )
    candidates: List[UserNotification] = []
    for s in rows:
        key = f"syllabus:{s.id}"
        if key in existing:
            continue
        month = (s.month or "").strip()
        class_label = ""
        try:
            if s.class_model and getattr(s.class_model, "name", None):
                class_label = str(s.class_model.name)
        except Exception:
            class_label = ""
        title = "New syllabus published"
        if class_label and month:
            message = f"Syllabus for {class_label} ({month}) has been published and is ready for review."
        elif class_label:
            message = f"Syllabus for {class_label} has been published and is ready for review."
        else:
            message = "A syllabus has been published and is ready for review."
        candidates.append(
            UserNotification(
                tenant_id=tenant_id,
                user_id=user_id,
                module="syllabus",
                title=title,
                message=message,
                kind="general",
                is_read=False,
                source_key=key,
                entity_id=s.id,
                created_at=s.created_at or datetime.utcnow(),
                created_by=user_id,
            )
        )
    if candidates:
        created = repo.bulk_insert_notifications(db, rows=candidates)
        logger.info(
            "Materialized %s syllabus notification(s) for user %s tenant %s",
            created,
            user_id,
            tenant_id,
        )


def materialize_notifications(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> None:
    """
    Idempotently create inbox rows from real module data (frontend filtering is not used).
    Holiday/Exam: day + 1-day-before reminder. Notice/Syllabus: recent published/created rows.
    """
    today = date.today()
    try:
        _materialize_holiday_exam_events(db, tenant_id=tenant_id, user_id=user_id, today=today)
        _materialize_notice_events(db, tenant_id=tenant_id, user_id=user_id, today=today)
        _materialize_syllabus_events(db, tenant_id=tenant_id, user_id=user_id, today=today)
    except Exception:
        logger.exception(
            "Notification materialization failed for tenant=%s user=%s",
            tenant_id,
            user_id,
        )


def get_settings(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
) -> NotificationSettingsResponse:
    tid = _require_tenant(tenant_id)
    row = repo.get_or_create_settings(db, tenant_id=tid, user_id=user_id)
    return _settings_to_response(row)


def update_settings(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
    payload: NotificationSettingsUpdateRequest,
) -> NotificationSettingsResponse:
    tid = _require_tenant(tenant_id)
    if (
        payload.syllabus is None
        and payload.holiday is None
        and payload.notice is None
        and payload.exam is None
    ):
        raise ValidationException("At least one module setting is required")

    row = repo.get_or_create_settings(db, tenant_id=tid, user_id=user_id)
    updated = repo.update_settings(
        db,
        row=row,
        syllabus=payload.syllabus,
        holiday=payload.holiday,
        notice=payload.notice,
        exam=payload.exam,
        user_id=user_id,
    )
    return _settings_to_response(updated)


def list_notifications(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
    page: int = 0,
    size: int = 50,
) -> NotificationListResponse:
    tid = _require_tenant(tenant_id)
    settings_row = repo.get_or_create_settings(db, tenant_id=tid, user_id=user_id)
    materialize_notifications(db, tenant_id=tid, user_id=user_id)
    enabled = _enabled_modules_from_settings(settings_row)
    rows, total = repo.list_notifications(
        db,
        tenant_id=tid,
        user_id=user_id,
        enabled_modules=enabled,
        page=page,
        size=size,
    )
    return NotificationListResponse(
        items=[_to_response(r) for r in rows],
        total=total,
        page=page,
        size=size,
    )


def get_unread_count(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
) -> NotificationCountResponse:
    tid = _require_tenant(tenant_id)
    settings_row = repo.get_or_create_settings(db, tenant_id=tid, user_id=user_id)
    materialize_notifications(db, tenant_id=tid, user_id=user_id)
    enabled = _enabled_modules_from_settings(settings_row)
    count = repo.count_unread(
        db,
        tenant_id=tid,
        user_id=user_id,
        enabled_modules=enabled,
    )
    return NotificationCountResponse(count=count)


def mark_as_read(
    db: Session,
    *,
    tenant_id: Optional[int],
    user_id: int,
    notification_id: int,
) -> NotificationMarkReadResponse:
    tid = _require_tenant(tenant_id)
    row = repo.get_notification(
        db,
        tenant_id=tid,
        user_id=user_id,
        notification_id=notification_id,
    )
    if not row:
        raise NotFoundException("Notification", notification_id)
    _, already = repo.mark_as_read(db, row=row)
    return NotificationMarkReadResponse(
        message="Notification marked as read" if not already else "Notification already read",
        notification_id=str(notification_id),
        already_read=already,
    )
