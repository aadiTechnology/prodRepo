from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from sqlalchemy.orm import Session

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
    return GalleryViewerContext(
        kind=hw_ctx.kind,
        scopes=hw_ctx.scopes,
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


def teacher_is_class_teacher(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> bool:
    from sqlalchemy import text

    from app.models.teacher import Teacher

    teacher_id = homework_repository._resolve_teacher_id(db, tenant_id, user_id)
    if teacher_id is None:
        return False

    class_teacher_sql = text(
        """
        SELECT TOP 1 1 AS ok
        FROM teacher_assignments ta
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.is_active = 1
          AND ta.subject_id IS NULL
          AND ta.class_division_id IS NOT NULL
        """
    )
    if (
        db.execute(
            class_teacher_sql, {"tenant_id": tenant_id, "teacher_id": teacher_id}
        ).mappings().first()
        is not None
    ):
        return True

    teacher_row = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    return bool(
        teacher_row
        and teacher_row.class_id is not None
        and teacher_row.class_division_id is not None
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
    return False


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
