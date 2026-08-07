from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ValidationException
from app.core.logging_config import get_logger
from app.models.user import User
from app.repositories import notice_repository
from app.services.homework_access import ClassDivisionScope, HomeworkViewerContext, is_admin_like
from app.services.notice_access import (
    NoticeViewerContext,
    assert_teacher_notice_targets_allowed,
    is_notice_consumer,
    resolve_notice_viewer_context,
    resolve_teacher_notice_target_pairs,
)
from app.services.notice_attachment_storage import (
    delete_notice_attachment_file,
    resolve_attachment_url,
    save_notice_attachment_file,
    validate_attachment_path,
)
from app.services import notification_service
from app.schemas.notice import (
    NoticeAttachmentResponse,
    NoticeCreateRequest,
    NoticeDropdownOptionsResponse,
    NoticeListResponse,
    NoticeResponse,
    NoticeStatusUpdateResponse,
    NoticeTargetResponse,
    NoticeUpdateRequest,
)

logger = get_logger(__name__)

ALLOWED_ATTACHMENT_TYPES = {"application/pdf", "image/jpeg", "image/jpg", "image/png"}
ALLOWED_AUDIENCE_TYPES = {"ALL", "STUDENT", "TEACHER", "ADMIN"}
NOTICE_MENU_PATH = "/communication/notices"
ALLOWED_NOTICE_TYPES = {"GENERAL", "FEE", "EVENT", "HOLIDAY", "EXAM"}
AUDIENCE_WITH_CLASS_TARGETS = frozenset({"STUDENT", "ALL"})


def _actor_display_name(db: Session, user_id: int | None) -> str:
    if not user_id:
        return "System"
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return "System"
    name = (user.full_name or "").strip()
    if name:
        return name
    email = (user.email or "").strip()
    return email or "System"


def _emit_notice_notification(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    audience_type: str,
    title: str,
    body: str,
    notice_id: int | None = None,
) -> None:
    """Call shared Notification Create API after notice save/publish (non-blocking)."""
    try:
        notification_service.create_notification(
            db,
            tenant_id=tenant_id,
            from_=_actor_display_name(db, user_id),
            to=(audience_type or "ALL").strip().upper() or "ALL",
            subject="Notice Notification",
            body=body,
            created_by=user_id,
        )
    except Exception:
        logger.exception(
            "Failed to create notification after notice save (notice_id=%s)",
            notice_id,
        )

def _coerce_naive_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.replace(tzinfo=None)
    return value


def _validate_notice_input(
    *,
    title: str | None,
    description: str | None,
    audience_type: str | None,
    notice_type: str | None,
    publish_date: datetime | None,
    expiry_date: datetime | None,
    targets: list[dict] | None,
    attachments: list[dict] | None,
) -> None:
    if title is not None and not title.strip():
        raise ValidationException("Please enter notice title")
    if description is not None and not description.strip():
        raise ValidationException("Please enter description")
    if audience_type is not None and audience_type not in ALLOWED_AUDIENCE_TYPES:
        raise ValidationException("Please select audience")
    if notice_type is not None and notice_type not in ALLOWED_NOTICE_TYPES:
        raise ValidationException("Invalid notice type")
    publish_date = _coerce_naive_utc(publish_date)
    expiry_date = _coerce_naive_utc(expiry_date)
    if publish_date and expiry_date and expiry_date < publish_date:
        raise ValidationException("Expiry date cannot be before publish date")

    if audience_type in AUDIENCE_WITH_CLASS_TARGETS:
        if not targets:
            raise ValidationException("Please select audience")
        if all(t.get("class_id") is None and t.get("division_id") is None for t in targets):
            raise ValidationException("Please select audience")
    elif audience_type in {"TEACHER", "ADMIN"} and targets:
        for t in targets:
            if t.get("class_id") is not None or t.get("division_id") is not None:
                raise ValidationException("Class and division targets apply only to All or Students audience")

    if attachments:
        for item in attachments:
            file_type = (item.get("file_type") or "").lower()
            if file_type and file_type not in ALLOWED_ATTACHMENT_TYPES:
                raise ValidationException("Invalid file format or size exceeded")


def _derive_status_from_timeline(*, publish_date: datetime, expiry_date: datetime | None) -> str:
    publish_date = _coerce_naive_utc(publish_date) or datetime.utcnow()
    expiry_date = _coerce_naive_utc(expiry_date)
    now = datetime.utcnow()
    if expiry_date and expiry_date < now:
        return "EXPIRED"
    if publish_date > now:
        return "UNPUBLISHED"
    return "PUBLISHED"


def _effective_notice_status(row: dict) -> str:
    stored = str(row.get("status") or "DRAFT")
    expiry_date = _coerce_naive_utc(row.get("expiry_date"))
    now = datetime.utcnow()
    if expiry_date and expiry_date < now:
        return "EXPIRED"
    if stored in {"DRAFT", "UNPUBLISHED", "EXPIRED"}:
        return stored
    publish_date = _coerce_naive_utc(row.get("publish_date"))
    if publish_date and publish_date > now:
        return "UNPUBLISHED"
    return stored


def user_can_manage_notices(db: Session, current_user: object) -> bool:
    from app.core.dependencies import get_rbac_role_codes
    from app.models.menu import Menu
    from app.models.role import user_roles as user_roles_table
    from app.models.role_menu_permission import RoleMenuPermission
    from app.models.user import UserRole

    role = getattr(current_user, "role", None)
    if role in (UserRole.SUPER_ADMIN, UserRole.ADMIN) and getattr(current_user, "tenant_id", None) is None:
        return True
    if role == UserRole.SUPER_ADMIN:
        return True

    rbac_roles = get_rbac_role_codes(db, int(current_user.id))
    if "system_admin" in {r.lower() for r in rbac_roles}:
        return True

    role_id_rows = (
        db.query(user_roles_table.c.role_id)
        .filter(user_roles_table.c.user_id == current_user.id)
        .all()
    )
    role_ids = [r[0] for r in role_id_rows]
    if not role_ids:
        return False

    perm = (
        db.query(RoleMenuPermission)
        .join(Menu, RoleMenuPermission.menu_id == Menu.id)
        .filter(
            RoleMenuPermission.role_id.in_(role_ids),
            Menu.path == NOTICE_MENU_PATH,
            Menu.is_active == True,
            Menu.is_deleted == False,
        )
        .first()
    )
    if not perm:
        return False
    return bool(perm.can_edit or perm.can_create)


def get_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
    manage: bool = False,
) -> NoticeViewerContext:
    # Admins always see tenant-wide notices (even if also linked as a teacher).
    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return HomeworkViewerContext(
            kind="admin",
            scopes=(),
            published_only=not manage,
        )

    ctx = resolve_notice_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
    )
    if ctx.kind != "teacher":
        return ctx

    # Class teacher: TEACHER audience + STUDENT notices for assigned class/div.
    # Subject-only teachers: TEACHER audience only (empty class-teacher scopes).
    class_teacher_targets = resolve_teacher_notice_target_pairs(
        db, tenant_id=tenant_id, user_id=user_id
    )
    scopes = tuple(
        ClassDivisionScope(class_id=class_id, class_division_id=division_id)
        for class_id, division_id in class_teacher_targets
    )
    return HomeworkViewerContext(
        kind="teacher",
        scopes=scopes,
        published_only=not manage,
    )


def _normalize_attachments(*, attachments: list[dict]) -> list[dict]:
    normalized: list[dict] = []
    for item in attachments:
        file_path = item.get("file_path") or ""
        if not file_path:
            continue
        stored_path = validate_attachment_path(str(file_path))
        normalized.append({**item, "file_path": stored_path})
    return normalized


def _attachment_response(item: dict) -> NoticeAttachmentResponse:
    payload = dict(item)
    file_path = payload.get("file_path")
    if file_path:
        payload["file_path"] = resolve_attachment_url(str(file_path))
    return NoticeAttachmentResponse(**payload)


def _to_notice_response(
    db: Session, row: dict, *, is_viewed: bool = False
) -> NoticeResponse:
    targets = notice_repository.get_notice_targets(db, notice_id=int(row["id"]))
    attachments = notice_repository.get_notice_attachments(db, notice_id=int(row["id"]))
    return NoticeResponse(
        id=int(row["id"]),
        tenant_id=int(row["tenant_id"]),
        title=str(row["title"]),
        description=str(row["description"]),
        notice_type=str(row["notice_type"]),
        audience_type=str(row["audience_type"]),
        status=_effective_notice_status(row),
        publish_date=row["publish_date"],
        expiry_date=row.get("expiry_date"),
        is_draft=str(row["status"]) == "DRAFT",
        is_published=bool(row["is_published"]),
        published_at=row.get("published_at"),
        unpublished_at=row.get("unpublished_at"),
        send_notification=bool(row["send_notification"]),
        created_by=int(row["created_by"]),
        created_at=row["created_at"],
        updated_by=int(row["updated_by"]) if row.get("updated_by") else None,
        updated_at=row.get("updated_at"),
        is_deleted=bool(row["is_deleted"]),
        targets=[NoticeTargetResponse(**item) for item in targets],
        attachments=[_attachment_response(item) for item in attachments],
        is_viewed=is_viewed,
    )


def list_notices(
    db: Session,
    *,
    tenant_id: int,
    page: int,
    size: int,
    search: str | None = None,
    status: str | None = None,
    audience_type: str | None = None,
    notice_type: str | None = None,
    is_published: bool | None = None,
    viewer_context: NoticeViewerContext | None = None,
    current_user_id: int | None = None,
) -> NoticeListResponse:
    if viewer_context and is_notice_consumer(viewer_context) and viewer_context.published_only:
        status = None
        is_published = None

    rows, total = notice_repository.list_notices(
        db,
        tenant_id=tenant_id,
        search=search,
        status=status,
        audience_type=audience_type,
        notice_type=notice_type,
        is_published=is_published,
        page=page,
        size=size,
        viewer_context=viewer_context,
    )
    viewed_ids: set[int] = set()
    if current_user_id is not None and rows:
        viewed_ids = notice_repository.get_viewed_notice_ids(
            db,
            tenant_id=tenant_id,
            user_id=current_user_id,
            notice_ids=[int(row["id"]) for row in rows],
        )
    return NoticeListResponse(
        items=[
            _to_notice_response(
                db, row, is_viewed=int(row["id"]) in viewed_ids
            )
            for row in rows
        ],
        total=total,
        page=page,
        size=size,
    )


def count_unread_notices(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    viewer_context: NoticeViewerContext | None = None,
    audience_type: str | None = None,
    notice_type: str | None = None,
    status: str | None = None,
) -> int:
    """
    Notices visible to this user that they have not opened.

    Scope (viewer_context):
      - admin / manage teacher: unread across Draft+Published+Unpublished+Expired
        (or one status when status filter is set)
      - teacher (view-only) / student/parent: published unread in role scope

    Optional status / audience_type / notice_type match NoticeList toolbar filters.
    """
    return notice_repository.count_unread_notices(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        viewer_context=viewer_context,
        audience_type=audience_type,
        notice_type=notice_type,
        status=status,
    )


def mark_notice_viewed(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    notice_id: int,
    viewer_context: NoticeViewerContext | None = None,
) -> tuple[bool, int]:
    """Mark notice as viewed by current user. Returns (already_viewed, notice_id)."""
    row = _assert_notice_visible(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        viewer_context=viewer_context,
        current_user_id=user_id,
    )
    marked_notice_id, already_viewed = notice_repository.mark_notice_viewed(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        notice_id=int(row["id"]),
    )
    return already_viewed, marked_notice_id


def _targets_match_scopes(targets: list[dict], scopes: tuple[ClassDivisionScope, ...]) -> bool:
    for scope in scopes:
        for target in targets:
            div_id = target.get("division_id")
            class_id = target.get("class_id")
            if div_id is not None and scope.class_division_id == div_id:
                return True
            if class_id is not None and scope.class_id == class_id and div_id is None:
                return True
    return False


def _consumer_can_view_notice(
    row: dict,
    targets: list[dict],
    viewer_context: NoticeViewerContext,
) -> bool:
    if viewer_context.published_only:
        if _effective_notice_status(row) != "PUBLISHED" or not bool(row.get("is_published")):
            return False
        expiry_date = _coerce_naive_utc(row.get("expiry_date"))
        if expiry_date and expiry_date < datetime.utcnow():
            return False

    audience = str(row.get("audience_type") or "")
    if viewer_context.kind == "teacher":
        if audience == "TEACHER":
            return True
        if audience != "STUDENT":
            return False
        if not viewer_context.scopes:
            return False
        return _targets_match_scopes(targets, viewer_context.scopes)
    if viewer_context.kind in ("student", "parent"):
        if audience not in {"STUDENT", "ALL"}:
            return False
        if not viewer_context.scopes:
            return False
        return _targets_match_scopes(targets, viewer_context.scopes)
    return True


def _assert_notice_visible(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    viewer_context: NoticeViewerContext | None,
    current_user_id: int | None = None,
) -> dict:
    row = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not row:
        raise NotFoundException("Notice", notice_id)
    if viewer_context and is_notice_consumer(viewer_context):
        targets = notice_repository.get_notice_targets(db, notice_id=notice_id)
        if not _consumer_can_view_notice(row, targets, viewer_context):
            raise NotFoundException("Notice", notice_id)
    return row


def get_notice(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    viewer_context: NoticeViewerContext | None = None,
    current_user_id: int | None = None,
) -> NoticeResponse:
    row = _assert_notice_visible(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        viewer_context=viewer_context,
        current_user_id=current_user_id,
    )
    return _to_notice_response(db, row)


def create_notice(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    payload: NoticeCreateRequest,
) -> NoticeResponse:
    publish_date = payload.publish_date or datetime.utcnow()
    targets = [t.model_dump() for t in payload.targets]
    attachments = [a.model_dump() for a in payload.attachments]
    notice_type = payload.notice_type.upper()
    audience_type = payload.audience_type.upper()
    requested_status = payload.status.upper() if payload.status else None
    if requested_status:
        status = requested_status
    elif payload.is_draft is True:
        status = "DRAFT"
    else:
        status = _derive_status_from_timeline(publish_date=publish_date, expiry_date=payload.expiry_date)
    is_published = status == "PUBLISHED"
    published_at = datetime.utcnow() if is_published else None
    unpublished_at = datetime.utcnow() if status == "UNPUBLISHED" else None

    _validate_notice_input(
        title=payload.title,
        description=payload.description,
        audience_type=audience_type,
        notice_type=notice_type,
        publish_date=publish_date,
        expiry_date=payload.expiry_date,
        targets=targets,
        attachments=attachments,
    )
    assert_teacher_notice_targets_allowed(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        audience_type=audience_type,
        targets=targets,
    )

    notice_id = notice_repository.insert_notice(
        db,
        payload={
            "tenant_id": tenant_id,
            "title": payload.title.strip(),
            "description": payload.description.strip(),
            "notice_type": notice_type,
            "audience_type": audience_type,
            "status": status,
            "publish_date": publish_date,
            "expiry_date": payload.expiry_date,
            "is_published": is_published,
            "published_at": published_at,
            "unpublished_at": unpublished_at,
            "send_notification": payload.send_notification,
            "created_by": user_id,
            "is_deleted": False,
        },
    )
    notice_repository.replace_notice_targets(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        user_id=user_id,
        targets=targets if audience_type in AUDIENCE_WITH_CLASS_TARGETS else [],
    )
    stored_attachments = _normalize_attachments(attachments=attachments)
    notice_repository.replace_notice_attachments(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        user_id=user_id,
        attachments=stored_attachments,
    )
    db.commit()

    title = payload.title.strip()
    _emit_notice_notification(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        audience_type=audience_type,
        title=title,
        body=f"{title} notice has been created.",
        notice_id=notice_id,
    )

    return get_notice(db, tenant_id=tenant_id, notice_id=notice_id)


def upload_notice_attachment(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
    file_name: str,
    content: bytes,
    content_type: str,
) -> NoticeAttachmentResponse:
    row = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not row:
        raise NotFoundException("Notice", notice_id)

    stored_path = save_notice_attachment_file(
        tenant_id=tenant_id,
        notice_id=notice_id,
        file_name=file_name,
        content=content,
        content_type=content_type,
    )
    attachment = {
        "file_name": file_name,
        "file_path": stored_path,
        "file_type": content_type,
        "file_size_kb": int(len(content) / 1024),
    }
    notice_repository.replace_notice_attachments(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        user_id=user_id,
        attachments=[attachment],
    )
    db.commit()
    attachments = notice_repository.get_notice_attachments(db, notice_id=notice_id)
    if not attachments:
        raise ValidationException("File upload failed")
    return _attachment_response(attachments[-1])


def delete_notice_attachment(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    attachment_id: int,
    user_id: int,
) -> str | None:
    row = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not row:
        raise NotFoundException("Notice", notice_id)

    attachment = notice_repository.get_notice_attachment(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        attachment_id=attachment_id,
    )
    if not attachment:
        raise NotFoundException("Notice attachment", attachment_id)

    file_path = str(attachment.get("file_path") or "")
    notice_repository.replace_notice_attachments(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        user_id=user_id,
        attachments=[],
    )
    db.commit()
    if file_path:
        delete_notice_attachment_file(file_path)
    return file_path or None


def update_notice(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
    legacy_role: object,
    payload: NoticeUpdateRequest,
) -> NoticeResponse:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)

    effective_status = _effective_notice_status(existing)
    if effective_status in {"PUBLISHED", "EXPIRED"}:
        raise ValidationException("Action not allowed in current state")

    update_data = payload.model_dump(exclude_unset=True)
    targets = update_data.pop("targets", None)
    attachments = update_data.pop("attachments", None)
    if "title" in update_data and update_data["title"] is not None:
        update_data["title"] = update_data["title"].strip()
    if "description" in update_data and update_data["description"] is not None:
        update_data["description"] = update_data["description"].strip()
    if "notice_type" in update_data and update_data["notice_type"] is not None:
        update_data["notice_type"] = str(update_data["notice_type"]).upper()
    if "audience_type" in update_data and update_data["audience_type"] is not None:
        update_data["audience_type"] = str(update_data["audience_type"]).upper()
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = str(update_data["status"]).upper()

    next_audience_type = update_data.get("audience_type", existing["audience_type"])
    next_notice_type = update_data.get("notice_type", existing["notice_type"])
    next_publish_date = update_data.get("publish_date", existing["publish_date"])
    next_expiry_date = update_data.get("expiry_date", existing.get("expiry_date"))
    # payload.model_dump() already converts nested targets/attachments to plain dicts.
    normalized_targets = targets
    normalized_attachments = attachments

    effective_targets = (
        normalized_targets
        if normalized_targets is not None
        else notice_repository.get_notice_targets(db, notice_id=notice_id)
    )
    _validate_notice_input(
        title=update_data.get("title", existing["title"]),
        description=update_data.get("description", existing["description"]),
        audience_type=next_audience_type,
        notice_type=next_notice_type,
        publish_date=next_publish_date,
        expiry_date=next_expiry_date,
        targets=effective_targets,
        attachments=normalized_attachments,
    )
    assert_teacher_notice_targets_allowed(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        legacy_role=legacy_role,
        audience_type=str(next_audience_type).upper(),
        targets=effective_targets,
    )

    existing_status = str(existing.get("status") or "DRAFT").upper()
    if "status" in update_data and update_data["status"] is not None:
        next_status = str(update_data["status"]).upper()
    elif update_data.get("is_draft") is True:
        next_status = "DRAFT"
    elif update_data.get("is_draft") is False:
        next_status = _derive_status_from_timeline(
            publish_date=next_publish_date,
            expiry_date=next_expiry_date,
        )
    elif existing_status in {"PUBLISHED", "UNPUBLISHED"}:
        next_status = existing_status
    else:
        next_status = _derive_status_from_timeline(
            publish_date=next_publish_date,
            expiry_date=next_expiry_date,
        )
    update_data["status"] = next_status
    update_data.pop("is_draft", None)
    update_data["is_published"] = next_status == "PUBLISHED"
    update_data["published_at"] = (
        datetime.utcnow()
        if next_status == "PUBLISHED" and existing_status != "PUBLISHED"
        else existing.get("published_at")
    )
    update_data["unpublished_at"] = (
        datetime.utcnow() if next_status == "UNPUBLISHED" else existing.get("unpublished_at")
    )
    update_data["updated_by"] = user_id
    update_data["updated_at"] = datetime.utcnow()

    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields=update_data,
    )
    if normalized_targets is not None:
        notice_repository.replace_notice_targets(
            db,
            tenant_id=tenant_id,
            notice_id=notice_id,
            user_id=user_id,
            targets=normalized_targets if next_audience_type in AUDIENCE_WITH_CLASS_TARGETS else [],
        )
    if normalized_attachments is not None:
        stored_attachments = _normalize_attachments(attachments=normalized_attachments)
        notice_repository.replace_notice_attachments(
            db,
            tenant_id=tenant_id,
            notice_id=notice_id,
            user_id=user_id,
            attachments=stored_attachments,
        )
    db.commit()
    return get_notice(db, tenant_id=tenant_id, notice_id=notice_id)


def publish_notice(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
) -> NoticeStatusUpdateResponse:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)
    if bool(existing.get("is_deleted")):
        raise ValidationException("Action not allowed in current state")
    if existing.get("expiry_date") and existing["expiry_date"] < datetime.utcnow():
        raise ValidationException("Action not allowed in current state")

    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields={
            "is_published": True,
            "status": "PUBLISHED",
            "published_at": datetime.utcnow(),
            "unpublished_at": None,
            "updated_by": user_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()

    title = str(existing.get("title") or "Notice").strip() or "Notice"
    audience_type = str(existing.get("audience_type") or "ALL").strip().upper() or "ALL"
    _emit_notice_notification(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        audience_type=audience_type,
        title=title,
        body=f"{title} notice has been published.",
        notice_id=notice_id,
    )

    return NoticeStatusUpdateResponse(
        message="Notice published successfully",
        notice=get_notice(db, tenant_id=tenant_id, notice_id=notice_id),
    )


def unpublish_notice(
    db: Session,
    *,
    tenant_id: int,
    notice_id: int,
    user_id: int,
) -> NoticeStatusUpdateResponse:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)
    if not bool(existing.get("is_published")):
        raise ValidationException("Action not allowed in current state")

    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields={
            "is_published": False,
            "status": "UNPUBLISHED",
            "unpublished_at": datetime.utcnow(),
            "updated_by": user_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()
    return NoticeStatusUpdateResponse(
        message="Notice unpublished successfully.",
        notice=get_notice(db, tenant_id=tenant_id, notice_id=notice_id),
    )


def delete_notice(db: Session, *, tenant_id: int, notice_id: int, user_id: int) -> None:
    existing = notice_repository.get_notice_by_id(db, tenant_id=tenant_id, notice_id=notice_id)
    if not existing:
        raise NotFoundException("Notice", notice_id)
    notice_repository.update_notice(
        db,
        tenant_id=tenant_id,
        notice_id=notice_id,
        update_fields={
            "is_deleted": True,
            "deleted_at": datetime.utcnow(),
            "deleted_by": user_id,
            "updated_by": user_id,
            "updated_at": datetime.utcnow(),
        },
    )
    db.commit()


def get_dropdown_options() -> NoticeDropdownOptionsResponse:
    return NoticeDropdownOptionsResponse(
        notice_types=["GENERAL", "FEE", "EVENT", "HOLIDAY", "EXAM"],
        audience_types=["ALL", "STUDENT", "TEACHER", "ADMIN"],
        status_types=["DRAFT", "PUBLISHED", "UNPUBLISHED", "EXPIRED"],
    )
