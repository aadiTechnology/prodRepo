"""Repository: persistence for notifications (canonical + per-user inbox)."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.notification import (
    Notification,
    UserDeviceToken,
    UserNotification,
    UserNotificationSettings,
)
from app.models.role import Role, user_roles
from app.models.user import User, UserRole

VALID_MODULES = ("syllabus", "holiday", "notice", "exam", "general")

# Audience token → role code/name fragments used when resolving `to`
_AUDIENCE_ROLE_CODES: dict[str, set[str]] = {
    "ALL": set(),
    "TEACHER": {"teacher", "teachers"},
    "STUDENT": {"student", "students", "parent", "parents"},
    "ADMIN": {
        "admin",
        "school_admin",
        "tenant_admin",
        "schooladmin",
        "tenantadmin",
    },
}


def get_settings(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> Optional[UserNotificationSettings]:
    return (
        db.query(UserNotificationSettings)
        .filter(
            UserNotificationSettings.tenant_id == tenant_id,
            UserNotificationSettings.user_id == user_id,
        )
        .first()
    )


def get_or_create_settings(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> UserNotificationSettings:
    existing = get_settings(db, tenant_id=tenant_id, user_id=user_id)
    if existing:
        return existing

    row = UserNotificationSettings(
        tenant_id=tenant_id,
        user_id=user_id,
        syllabus_enabled=True,
        holiday_enabled=True,
        notice_enabled=True,
        exam_enabled=True,
        created_at=datetime.utcnow(),
        created_by=user_id,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        existing = get_settings(db, tenant_id=tenant_id, user_id=user_id)
        if existing:
            return existing
        raise


def update_settings(
    db: Session,
    *,
    row: UserNotificationSettings,
    syllabus: Optional[bool],
    holiday: Optional[bool],
    notice: Optional[bool],
    exam: Optional[bool],
    user_id: int,
) -> UserNotificationSettings:
    if syllabus is not None:
        row.syllabus_enabled = syllabus
    if holiday is not None:
        row.holiday_enabled = holiday
    if notice is not None:
        row.notice_enabled = notice
    if exam is not None:
        row.exam_enabled = exam
    row.updated_at = datetime.utcnow()
    row.updated_by = user_id
    db.commit()
    db.refresh(row)
    return row


def list_notifications(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    enabled_modules: Sequence[str],
    page: int = 0,
    size: int = 50,
) -> Tuple[List[UserNotification], int]:
    if not enabled_modules:
        return [], 0

    query = db.query(UserNotification).filter(
        UserNotification.tenant_id == tenant_id,
        UserNotification.user_id == user_id,
        UserNotification.is_deleted == False,  # noqa: E712
        UserNotification.module.in_(list(enabled_modules)),
    )
    total = query.count()
    rows = (
        query.order_by(UserNotification.created_at.desc(), UserNotification.id.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )
    return rows, total


def count_unread(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    enabled_modules: Sequence[str],
) -> int:
    if not enabled_modules:
        return 0
    return (
        db.query(UserNotification)
        .filter(
            UserNotification.tenant_id == tenant_id,
            UserNotification.user_id == user_id,
            UserNotification.is_deleted == False,  # noqa: E712
            UserNotification.is_read == False,  # noqa: E712
            UserNotification.module.in_(list(enabled_modules)),
        )
        .count()
    )


def get_notification(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    notification_id: int,
) -> Optional[UserNotification]:
    return (
        db.query(UserNotification)
        .filter(
            UserNotification.id == notification_id,
            UserNotification.tenant_id == tenant_id,
            UserNotification.user_id == user_id,
            UserNotification.is_deleted == False,  # noqa: E712
        )
        .first()
    )


def mark_as_read(
    db: Session,
    *,
    row: UserNotification,
) -> Tuple[UserNotification, bool]:
    if row.is_read:
        return row, True
    row.is_read = True
    row.read_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row, False


def existing_source_keys(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    source_keys: Sequence[str],
) -> set[str]:
    if not source_keys:
        return set()
    rows = (
        db.query(UserNotification.source_key)
        .filter(
            UserNotification.tenant_id == tenant_id,
            UserNotification.user_id == user_id,
            UserNotification.source_key.in_(list(source_keys)),
            UserNotification.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    return {str(r[0]) for r in rows}


def bulk_insert_notifications(
    db: Session,
    *,
    rows: List[UserNotification],
) -> int:
    if not rows:
        return 0
    db.add_all(rows)
    try:
        db.commit()
        return len(rows)
    except IntegrityError:
        db.rollback()
        created = 0
        for row in rows:
            db.add(row)
            try:
                db.commit()
                created += 1
            except IntegrityError:
                db.rollback()
        return created


def insert_notification(
    db: Session,
    *,
    tenant_id: int,
    sender: str,
    recipient: str,
    subject: str,
    body: str,
    created_by: Optional[int],
) -> Notification:
    """Persist the canonical notifications row (From / To / Subject / Body)."""
    row = Notification(
        tenant_id=tenant_id,
        sender=sender,
        recipient=recipient,
        subject=subject,
        body=body,
        created_at=datetime.utcnow(),
        created_by=created_by,
        is_deleted=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def resolve_recipient_user_ids(
    db: Session,
    *,
    tenant_id: int,
    to: str,
) -> List[int]:
    """
    Resolve `to` into tenant user ids.

    Supported:
    - ALL / * → all active tenant users
    - TEACHER | STUDENT | ADMIN → RBAC role code/name (+ legacy admin roles)
    - comma-separated user ids (e.g. 1,2,3)
    - other strings → all active tenant users (school-wide default)
    """
    raw = (to or "").strip()
    if not raw:
        return []

    token = raw.upper()

    # Explicit user id list
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if parts and all(p.isdigit() for p in parts):
        ids = [int(p) for p in parts]
        rows = (
            db.query(User.id)
            .filter(
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
                User.is_active == True,  # noqa: E712
                User.id.in_(ids),
            )
            .all()
        )
        return [int(r[0]) for r in rows]

    base_q = db.query(User).filter(
        User.tenant_id == tenant_id,
        User.is_deleted == False,  # noqa: E712
        User.is_active == True,  # noqa: E712
    )

    if token in ("ALL", "*"):
        return [int(u.id) for u in base_q.all()]

    codes = _AUDIENCE_ROLE_CODES.get(token)
    if codes is None:
        # Unknown audience label → school-wide
        return [int(u.id) for u in base_q.all()]

    # Prefer RBAC role matching
    matched_role_ids: set[int] = set()
    role_rows = (
        db.query(Role.id, Role.code, Role.name)
        .filter(
            Role.is_deleted == False,  # noqa: E712
            Role.is_active == True,  # noqa: E712
        )
        .all()
    )
    for rid, code, name in role_rows:
        c = (code or "").strip().lower().replace(" ", "_")
        n = (name or "").strip().lower()
        for needle in codes:
            if needle == c or needle in c or needle in n:
                matched_role_ids.add(int(rid))
                break

    role_uid_set: set[int] = set()
    if matched_role_ids:
        user_ids_from_roles = (
            db.query(user_roles.c.user_id)
            .filter(user_roles.c.role_id.in_(matched_role_ids))
            .all()
        )
        role_uid_set = {int(r[0]) for r in user_ids_from_roles}

    admin_users: set[int] = set()
    if token == "ADMIN":
        admin_users = {
            int(u.id)
            for u in base_q.all()
            if u.role in (UserRole.ADMIN, UserRole.TENANT_ADMIN)
        }

    tenant_uids = {int(u.id) for u in base_q.all()}
    result = (role_uid_set | admin_users) & tenant_uids
    return sorted(result)


def create_user_inbox_rows(
    db: Session,
    *,
    tenant_id: int,
    user_ids: Sequence[int],
    subject: str,
    body: str,
    module: str,
    notification_id: int,
    created_by: Optional[int],
) -> int:
    """Fan-out canonical notification to per-user inbox rows."""
    if not user_ids:
        return 0
    module_key = module if module in VALID_MODULES else "general"
    rows: List[UserNotification] = []
    now = datetime.utcnow()
    for uid in user_ids:
        rows.append(
            UserNotification(
                tenant_id=tenant_id,
                user_id=int(uid),
                module=module_key,
                title=subject[:255],
                message=body,
                kind="general",
                is_read=False,
                source_key=f"notif:{notification_id}:user:{uid}",
                entity_id=notification_id,
                created_at=now,
                created_by=created_by,
                is_deleted=False,
            )
        )
    return bulk_insert_notifications(db, rows=rows)


def get_device_token_by_fcm(
    db: Session,
    *,
    fcm_token: str,
) -> Optional[UserDeviceToken]:
    return (
        db.query(UserDeviceToken)
        .filter(UserDeviceToken.fcm_token == fcm_token)
        .first()
    )


def upsert_device_token(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    fcm_token: str,
    platform: str,
    created_by: Optional[int],
) -> UserDeviceToken:
    """
    Register or refresh an FCM token.

    Unique on fcm_token: re-registration updates owner/platform and reactivates.
    """
    now = datetime.utcnow()
    existing = get_device_token_by_fcm(db, fcm_token=fcm_token)
    if existing:
        existing.tenant_id = tenant_id
        existing.user_id = user_id
        existing.platform = platform
        existing.is_active = True
        existing.updated_at = now
        existing.updated_by = created_by
        db.commit()
        db.refresh(existing)
        return existing

    row = UserDeviceToken(
        tenant_id=tenant_id,
        user_id=user_id,
        fcm_token=fcm_token,
        platform=platform,
        is_active=True,
        created_at=now,
        created_by=created_by,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        existing = get_device_token_by_fcm(db, fcm_token=fcm_token)
        if existing:
            existing.tenant_id = tenant_id
            existing.user_id = user_id
            existing.platform = platform
            existing.is_active = True
            existing.updated_at = now
            existing.updated_by = created_by
            db.commit()
            db.refresh(existing)
            return existing
        raise


def list_active_tokens_for_users(
    db: Session,
    *,
    tenant_id: int,
    user_ids: Sequence[int],
) -> List[UserDeviceToken]:
    if not user_ids:
        return []
    return (
        db.query(UserDeviceToken)
        .filter(
            UserDeviceToken.tenant_id == tenant_id,
            UserDeviceToken.user_id.in_(list(user_ids)),
            UserDeviceToken.is_active == True,  # noqa: E712
        )
        .all()
    )


def deactivate_device_tokens(
    db: Session,
    *,
    fcm_tokens: Sequence[str],
) -> int:
    """Mark invalid / unregistered FCM tokens inactive."""
    tokens = [t for t in fcm_tokens if t]
    if not tokens:
        return 0
    now = datetime.utcnow()
    rows = (
        db.query(UserDeviceToken)
        .filter(UserDeviceToken.fcm_token.in_(tokens))
        .all()
    )
    for row in rows:
        row.is_active = False
        row.updated_at = now
    if rows:
        db.commit()
    return len(rows)
