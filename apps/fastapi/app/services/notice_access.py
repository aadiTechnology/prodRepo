from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.services.homework_access import (
    HomeworkViewerContext,
    resolve_homework_viewer_context,
)
from app.repositories import homework_repository as homework_repo

if TYPE_CHECKING:
    pass

NoticeViewerContext = HomeworkViewerContext


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
