from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException
from app.services.homework_access import (
    ClassDivisionScope,
    HomeworkViewerContext,
    is_admin_like,
    is_parent_user,
    is_student_user,
    resolve_homework_viewer_context,
    resolve_teacher_assignment_scopes,
)
from app.repositories import homework_repository

ACTIVITY_GALLERY_MENU_PATH = "/activity-management/photo-video-gallery"
MAX_MEDIA_PER_GALLERY = 20
MAX_PHOTO_GALLERY_TOTAL_MB = 10
MAX_PHOTO_GALLERY_TOTAL_BYTES = MAX_PHOTO_GALLERY_TOTAL_MB * 1024 * 1024


@dataclass(frozen=True)
class GalleryViewerContext:
    kind: str
    scopes: Tuple[ClassDivisionScope, ...]
    published_only: bool
    manage: bool


def resolve_gallery_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
    manage: bool = False,
) -> GalleryViewerContext:
    if manage:
        return GalleryViewerContext(kind="admin", scopes=(), published_only=False, manage=True)

    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    hw_ctx = resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        teacher_id=teacher_id,
    )

    scopes = hw_ctx.scopes
    if hw_ctx.kind == "teacher" and not _gallery_menu_permission(db, user_id, "view"):
        class_teacher_targets = resolve_class_teacher_targets(
            db, tenant_id=tenant_id, user_id=user_id
        )
        if class_teacher_targets:
            scopes = tuple(
                ClassDivisionScope(class_id=class_id, class_division_id=division_id)
                for class_id, division_id in class_teacher_targets
            )

    return GalleryViewerContext(
        kind=hw_ctx.kind,
        scopes=scopes,
        published_only=hw_ctx.published_only,
        manage=hw_ctx.kind == "admin" or (hw_ctx.kind == "teacher" and not hw_ctx.published_only),
    )


def _gallery_menu_permission(
    db: Session,
    user_id: int,
    action: str,
) -> bool:
    from app.models.menu import Menu
    from app.models.role import user_roles as user_roles_table
    from app.models.role_menu_permission import RoleMenuPermission

    action_col = {
        "view": RoleMenuPermission.can_view,
        "create": RoleMenuPermission.can_create,
        "edit": RoleMenuPermission.can_edit,
        "delete": RoleMenuPermission.can_delete,
    }.get(action)
    if action_col is None:
        return False

    role_id_rows = (
        db.query(user_roles_table.c.role_id)
        .filter(user_roles_table.c.user_id == user_id)
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
            Menu.path == ACTIVITY_GALLERY_MENU_PATH,
            Menu.is_active == True,
            Menu.is_deleted == False,
            action_col == True,
        )
        .first()
    )
    return perm is not None


def resolve_class_teacher_targets(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> list[tuple[int, int]]:
    """Class/division pairs where the user is assigned as class teacher."""
    from sqlalchemy import text

    from app.models.teacher import Teacher

    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    if teacher_id is None:
        return []

    targets: list[tuple[int, int]] = []
    class_teacher_sql = text(
        """
        SELECT DISTINCT ta.class_id, ta.class_division_id AS division_id
        FROM teacher_assignments ta
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.is_active = 1
          AND ta.subject_id IS NULL
          AND ta.class_division_id IS NOT NULL
        """
    )
    for row in db.execute(
        class_teacher_sql, {"tenant_id": tenant_id, "teacher_id": teacher_id}
    ).mappings().all():
        targets.append((int(row["class_id"]), int(row["division_id"])))

    if targets:
        return targets

    teacher_row = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if (
        teacher_row
        and teacher_row.class_id is not None
        and teacher_row.class_division_id is not None
    ):
        return [(int(teacher_row.class_id), int(teacher_row.class_division_id))]
    return []


def teacher_is_class_teacher(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> bool:
    return bool(resolve_class_teacher_targets(db, tenant_id=tenant_id, user_id=user_id))


def class_teacher_can_manage_class_division(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    class_id: int,
    division_id: int,
) -> bool:
    for assigned_class_id, assigned_division_id in resolve_class_teacher_targets(
        db, tenant_id=tenant_id, user_id=user_id
    ):
        if assigned_class_id == class_id and assigned_division_id == division_id:
            return True
    return False


def user_can_view_gallery(db: Session, current_user: object) -> bool:
    if _gallery_menu_permission(db, int(current_user.id), "view"):
        return True
    return teacher_is_class_teacher(
        db,
        tenant_id=int(current_user.tenant_id),
        user_id=int(current_user.id),
    )


def user_can_create_gallery(db: Session, current_user: object) -> bool:
    if _gallery_menu_permission(db, int(current_user.id), "create"):
        return True
    return teacher_is_class_teacher(
        db,
        tenant_id=int(current_user.tenant_id),
        user_id=int(current_user.id),
    )


def user_can_edit_gallery(db: Session, current_user: object) -> bool:
    if _gallery_menu_permission(db, int(current_user.id), "edit"):
        return True
    return teacher_is_class_teacher(
        db,
        tenant_id=int(current_user.tenant_id),
        user_id=int(current_user.id),
    )


def user_can_delete_gallery(db: Session, current_user: object) -> bool:
    if _gallery_menu_permission(db, int(current_user.id), "delete"):
        return True
    return teacher_is_class_teacher(
        db,
        tenant_id=int(current_user.tenant_id),
        user_id=int(current_user.id),
    )


def user_can_manage_galleries(db: Session, current_user: object) -> bool:
    from app.core.dependencies import get_rbac_role_codes
    from app.models.user import UserRole

    role = getattr(current_user, "role", None)
    if role in (UserRole.SUPER_ADMIN, UserRole.ADMIN) and getattr(current_user, "tenant_id", None) is None:
        return True
    if role == UserRole.SUPER_ADMIN:
        return True

    rbac_roles = get_rbac_role_codes(db, int(current_user.id))
    if "system_admin" in {r.lower() for r in rbac_roles}:
        return True

    if user_can_create_gallery(db, current_user) or user_can_edit_gallery(db, current_user):
        return True
    if user_can_delete_gallery(db, current_user):
        return True
    return False


def assert_gallery_manage_access(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    class_id: int,
    division_id: int,
) -> None:
    """Raise ForbiddenException unless user may manage this class/division gallery."""
    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return

    uid = int(user_id)
    has_rbac_manage = (
        _gallery_menu_permission(db, uid, "create")
        or _gallery_menu_permission(db, uid, "edit")
        or _gallery_menu_permission(db, uid, "delete")
    )
    if has_rbac_manage:
        if teacher_can_manage_class_division(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            legacy_role=legacy_role,
            class_id=class_id,
            division_id=division_id,
        ):
            return
        raise ForbiddenException("You are not authorized for this activity")

    if class_teacher_can_manage_class_division(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        class_id=class_id,
        division_id=division_id,
    ):
        return
    raise ForbiddenException("You are not authorized for this activity")


def is_gallery_consumer(ctx: GalleryViewerContext) -> bool:
    return ctx.kind in ("student", "parent") or (ctx.kind == "teacher" and ctx.published_only)


def teacher_can_manage_class_division(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    class_id: int,
    division_id: int,
) -> bool:
    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return True

    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    if teacher_id is None:
        return False

    scopes = resolve_teacher_assignment_scopes(
        db, tenant_id=tenant_id, teacher_id=teacher_id
    )
    for scope in scopes:
        if scope.class_id != class_id:
            continue
        if scope.class_division_id is None or scope.class_division_id == division_id:
            return True
    return False


def gallery_visible_to_viewer(
    *,
    class_id: int | None,
    division_id: int | None,
    is_published: bool,
    ctx: GalleryViewerContext,
) -> bool:
    if ctx.kind == "admin":
        return True
    if ctx.published_only and not is_published:
        return False
    if class_id is None or division_id is None:
        return False
    if not ctx.scopes:
        return False
    for scope in ctx.scopes:
        if scope.class_id != class_id:
            continue
        if scope.class_division_id is None or scope.class_division_id == division_id:
            return True
    return False
