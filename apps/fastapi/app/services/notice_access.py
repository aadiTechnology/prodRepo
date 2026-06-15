from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.core.exceptions import ValidationException
from app.services.activity_gallery_access import resolve_class_teacher_targets
from app.services.homework_access import (
    HomeworkViewerContext,
    is_admin_like,
    resolve_homework_viewer_context,
)
from app.repositories import homework_repository as homework_repo

if TYPE_CHECKING:
    pass

NoticeViewerContext = HomeworkViewerContext

AUDIENCE_WITH_CLASS_TARGETS = frozenset({"STUDENT", "ALL"})


def resolve_notice_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
) -> NoticeViewerContext:
    teacher_id = homework_repo._resolve_teacher_id(db, tenant_id, user_id)
    return resolve_homework_viewer_context(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        email=email,
        legacy_role=legacy_role,
        teacher_id=teacher_id,
    )


def is_notice_consumer(ctx: NoticeViewerContext) -> bool:
    return ctx.kind in ("teacher", "student", "parent")


def resolve_teacher_notice_target_pairs(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
) -> set[tuple[int, int]]:
    """Class/division pairs where the user is the assigned class teacher."""
    return set(resolve_class_teacher_targets(db, tenant_id=tenant_id, user_id=user_id))


def assert_teacher_notice_targets_allowed(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    legacy_role: object,
    audience_type: str,
    targets: list[dict],
) -> None:
    """
  Teachers with notice manage access may only publish to Students in their
  assigned class teacher class/division pairs.
    """
    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return

    teacher_id = homework_repo._resolve_teacher_id(db, tenant_id, user_id)
    if teacher_id is None:
        return

    audience = str(audience_type or "").upper()
    if audience != "STUDENT":
        raise ValidationException("Teachers can only send notices to the Students audience")

    allowed_pairs = resolve_teacher_notice_target_pairs(
        db, tenant_id=tenant_id, user_id=user_id
    )
    if not allowed_pairs:
        raise ValidationException(
            "No class teacher assignment found. Contact your administrator."
        )

    if not targets:
        raise ValidationException("Please select your assigned class and division")

    for target in targets:
        class_id = target.get("class_id")
        division_id = target.get("division_id")
        if class_id is None or division_id is None:
            raise ValidationException(
                "Teachers must target a specific assigned class and division"
            )
        pair = (int(class_id), int(division_id))
        if pair not in allowed_pairs:
            raise ValidationException(
                "You can only send notices to your assigned class and division"
            )
