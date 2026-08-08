"""Repository: persistence for notifications (canonical + per-user inbox)."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Sequence, Tuple

from sqlalchemy import and_, exists, false, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Query, Session, aliased

from app.models.holiday import Holiday
from app.models.notice import Notice, NoticeTarget
from app.models.notification import (
    Notification,
    UserDeviceToken,
    UserNotification,
    UserNotificationSettings,
)
from app.models.role import Role, user_roles
from app.models.syllabus import Syllabus
from app.models.user import User, UserRole
from app.services.homework_access import HomeworkViewerContext, resolve_student_user_ids_for_notice_targets
from app.services.notice_access import is_notice_consumer

VALID_MODULES = ("syllabus", "holiday", "notice", "exam", "general")

_TENANT_WIDE_MODULES = ("general", "holiday", "exam")


def _notice_target_matches_scope(scope) -> object:
    """EXISTS clause: notice target row matches one class/division scope."""
    base = and_(
        NoticeTarget.notice_id == Notice.id,
        NoticeTarget.is_deleted == False,  # noqa: E712
    )
    if scope.class_division_id is not None:
        return exists(
            select(NoticeTarget.id).where(
                base,
                or_(
                    NoticeTarget.division_id == scope.class_division_id,
                    and_(
                        NoticeTarget.class_id == scope.class_id,
                        NoticeTarget.division_id.is_(None),
                    ),
                ),
            )
        )
    return exists(
        select(NoticeTarget.id).where(
            base,
            NoticeTarget.class_id == scope.class_id,
        )
    )


def _notice_has_no_class_targets() -> object:
    """True when the notice has no class/division target rows (tenant-wide for its audience)."""
    return ~exists(
        select(NoticeTarget.id).where(
            NoticeTarget.notice_id == Notice.id,
            NoticeTarget.is_deleted == False,  # noqa: E712
        )
    )


def _notice_entity_visible_clause(
    *,
    tenant_id: int,
    viewer_context: HomeworkViewerContext,
) -> object:
    """Inbox row visible when its linked notice is in the viewer's role/class scope."""
    now = datetime.utcnow()
    published_filters = []
    if viewer_context.published_only:
        published_filters = [
            Notice.status == "PUBLISHED",
            Notice.is_published == True,  # noqa: E712
            or_(Notice.expiry_date.is_(None), Notice.expiry_date >= now),
        ]

    base_notice = and_(
        Notice.id == UserNotification.entity_id,
        Notice.tenant_id == tenant_id,
        Notice.is_deleted == False,  # noqa: E712
        *published_filters,
    )

    if viewer_context.kind == "teacher":
        teacher_audience = exists(
            select(Notice.id).where(base_notice, Notice.audience_type == "TEACHER")
        )
        all_audience = exists(
            select(Notice.id).where(base_notice, Notice.audience_type == "ALL")
        )
        tenant_wide = exists(
            select(Notice.id).where(
                base_notice,
                Notice.audience_type.in_(("TEACHER", "ALL")),
                _notice_has_no_class_targets(),
            )
        )
        scope_parts = [_notice_target_matches_scope(scope) for scope in viewer_context.scopes]
        scoped_audience = false()
        if scope_parts:
            scoped_audience = exists(
                select(Notice.id).where(
                    base_notice,
                    Notice.audience_type.in_(("STUDENT", "ALL")),
                    or_(_notice_has_no_class_targets(), or_(*scope_parts)),
                )
            )
        return and_(
            UserNotification.module == "notice",
            or_(teacher_audience, all_audience, tenant_wide, scoped_audience),
        )

    if viewer_context.kind in ("student", "parent"):
        scope_parts = [_notice_target_matches_scope(scope) for scope in viewer_context.scopes]
        tenant_wide = exists(
            select(Notice.id).where(
                base_notice,
                Notice.audience_type.in_(("STUDENT", "ALL")),
                _notice_has_no_class_targets(),
            )
        )
        scoped = false()
        if scope_parts:
            scoped = exists(
                select(Notice.id).where(
                    base_notice,
                    Notice.audience_type.in_(("STUDENT", "ALL")),
                    or_(*scope_parts),
                )
            )
        return and_(
            UserNotification.module == "notice",
            or_(tenant_wide, scoped),
        )

    return false()


def _syllabus_entity_visible_clause(
    *,
    tenant_id: int,
    viewer_context: HomeworkViewerContext,
) -> object:
    scoped_class_ids = sorted({scope.class_id for scope in viewer_context.scopes})
    if not scoped_class_ids:
        return false()
    return and_(
        UserNotification.module == "syllabus",
        exists(
            select(Syllabus.id).where(
                Syllabus.id == UserNotification.entity_id,
                Syllabus.tenant_id == tenant_id,
                Syllabus.is_deleted == False,  # noqa: E712
                Syllabus.class_id.in_(scoped_class_ids),
            )
        ),
    )


def apply_inbox_entity_visibility(
    query: Query,
    *,
    tenant_id: int,
    viewer_context: HomeworkViewerContext | None,
) -> Query:
    """
    Restrict notice/syllabus inbox rows to the viewer's class scope.

    Admin-like viewers see all rows. Tenant-wide modules (holiday/exam/general)
    are never filtered here.
    """
    if viewer_context is None or viewer_context.kind == "admin":
        return query
    if not is_notice_consumer(viewer_context):
        return query

    passthrough = or_(
        UserNotification.module.in_(_TENANT_WIDE_MODULES),
        UserNotification.entity_id.is_(None),
        ~UserNotification.module.in_(("notice", "syllabus")),
    )
    scoped = or_(
        _notice_entity_visible_clause(tenant_id=tenant_id, viewer_context=viewer_context),
        _syllabus_entity_visible_clause(tenant_id=tenant_id, viewer_context=viewer_context),
    )
    return query.filter(or_(passthrough, scoped))


def apply_exclude_self_created(
    query: Query,
    *,
    tenant_id: int,
    user_id: int,
) -> Query:
    """
    Hide inbox rows for notice/syllabus/holiday entities authored by the viewer.

    Creators still receive other users' notifications; only their own items are suppressed.
    """
    lifecycle = aliased(UserNotification)

    notice_self = and_(
        UserNotification.module == "notice",
        UserNotification.entity_id.isnot(None),
        exists(
            select(Notice.id).where(
                Notice.id == UserNotification.entity_id,
                Notice.tenant_id == tenant_id,
                Notice.is_deleted == False,  # noqa: E712
                Notice.created_by == user_id,
            )
        ),
    )
    syllabus_self = and_(
        UserNotification.module == "syllabus",
        UserNotification.entity_id.isnot(None),
        exists(
            select(Syllabus.id).where(
                Syllabus.id == UserNotification.entity_id,
                Syllabus.tenant_id == tenant_id,
                Syllabus.is_deleted == False,  # noqa: E712
                Syllabus.created_by == user_id,
            )
        ),
    )
    holiday_meta_self = and_(
        UserNotification.module.in_(("holiday", "exam")),
        UserNotification.entity_id.isnot(None),
        exists(
            select(Holiday.id).where(
                Holiday.id == UserNotification.entity_id,
                Holiday.tenant_id == tenant_id,
                Holiday.description.like(f'%"created_by_user_id":{int(user_id)}%'),
            )
        ),
    )
    holiday_lifecycle_self = and_(
        UserNotification.module.in_(("holiday", "exam")),
        UserNotification.entity_id.isnot(None),
        exists(
            select(lifecycle.id).where(
                lifecycle.tenant_id == tenant_id,
                lifecycle.entity_id == UserNotification.entity_id,
                lifecycle.module == "holiday",
                lifecycle.kind == "general",
                lifecycle.created_by == user_id,
            )
        ),
    )
    holiday_inbox_self = and_(
        UserNotification.module == "holiday",
        UserNotification.kind == "general",
        UserNotification.user_id == user_id,
        UserNotification.created_by == user_id,
    )

    authored = or_(
        notice_self,
        syllabus_self,
        holiday_meta_self,
        holiday_lifecycle_self,
        holiday_inbox_self,
    )
    return query.filter(~authored)


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
    viewer_context: HomeworkViewerContext | None = None,
) -> Tuple[List[UserNotification], int]:
    if not enabled_modules:
        return [], 0

    query = db.query(UserNotification).filter(
        UserNotification.tenant_id == tenant_id,
        UserNotification.user_id == user_id,
        UserNotification.is_deleted == False,  # noqa: E712
        UserNotification.module.in_(list(enabled_modules)),
    )
    query = apply_inbox_entity_visibility(
        query, tenant_id=tenant_id, viewer_context=viewer_context
    )
    query = apply_exclude_self_created(query, tenant_id=tenant_id, user_id=user_id)
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
    viewer_context: HomeworkViewerContext | None = None,
) -> int:
    if not enabled_modules:
        return 0
    query = db.query(UserNotification).filter(
        UserNotification.tenant_id == tenant_id,
        UserNotification.user_id == user_id,
        UserNotification.is_deleted == False,  # noqa: E712
        UserNotification.is_read == False,  # noqa: E712
        UserNotification.module.in_(list(enabled_modules)),
    )
    query = apply_inbox_entity_visibility(
        query, tenant_id=tenant_id, viewer_context=viewer_context
    )
    query = apply_exclude_self_created(query, tenant_id=tenant_id, user_id=user_id)
    return query.count()


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


def mark_module_as_read(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    module: str,
) -> int:
    """Mark all unread inbox rows for one module as read. Returns rows updated."""
    now = datetime.utcnow()
    rows = (
        db.query(UserNotification)
        .filter(
            UserNotification.tenant_id == tenant_id,
            UserNotification.user_id == user_id,
            UserNotification.module == module,
            UserNotification.is_deleted == False,  # noqa: E712
            UserNotification.is_read == False,  # noqa: E712
        )
        .all()
    )
    if not rows:
        return 0
    for row in rows:
        row.is_read = True
        row.read_at = now
    db.commit()
    return len(rows)


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


def resolve_notice_recipient_user_ids(
    db: Session,
    *,
    tenant_id: int,
    audience: str,
    targets: Sequence[dict] | None = None,
) -> List[int]:
    """
    Resolve notice recipients.

    When class/division targets exist for STUDENT/ALL audience, fan-out only to
    student login accounts linked to matching student rows. Falls back to role
    audience tokens when no scoped users are found.
    """
    aud = (audience or "ALL").strip().upper()
    scoped_targets = [t for t in (targets or []) if t.get("class_id") is not None]
    if aud in ("STUDENT", "ALL") and scoped_targets:
        scoped_user_ids = resolve_student_user_ids_for_notice_targets(
            db,
            tenant_id=tenant_id,
            targets=list(scoped_targets),
        )
        if scoped_user_ids:
            return scoped_user_ids
    return resolve_recipient_user_ids(db, tenant_id=tenant_id, to=aud)


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
    source_key: Optional[str] = None,
    entity_id: Optional[int] = None,
) -> int:
    """
    Fan-out canonical notification to per-user inbox rows.

    When `source_key` is provided (entity lifecycle keys shared with materialization),
    the same key is used for every recipient so unique (tenant, user, source_key)
    dedupes eager create against lazy materialize. Without it, falls back to
    notif:{notification_id}:user:{uid} for generic API creates.
    """
    if not user_ids:
        return 0
    module_key = module if module in VALID_MODULES else "general"
    rows: List[UserNotification] = []
    now = datetime.utcnow()
    entity = int(entity_id) if entity_id is not None else int(notification_id)
    for uid in user_ids:
        key = (source_key or "").strip() or f"notif:{notification_id}:user:{uid}"
        rows.append(
            UserNotification(
                tenant_id=tenant_id,
                user_id=int(uid),
                module=module_key,
                title=subject[:255],
                message=body,
                kind="general",
                is_read=False,
                source_key=key[:120],
                entity_id=entity,
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
