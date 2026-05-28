from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.models.demo_video import DemoVideo
from app.schemas.demo_video import DemoVideoCreate, DemoVideoUpdate


def list_demo_videos(
    db: Session,
    module_key: str | None = None,
    active_only: bool | None = None,
) -> list[DemoVideo]:
    query = db.query(DemoVideo).filter(DemoVideo.is_deleted == False)  # noqa: E712
    if module_key:
        query = query.filter(DemoVideo.module_key == module_key.strip())
    if active_only is True:
        query = query.filter(DemoVideo.is_active == True)  # noqa: E712
    return query.order_by(DemoVideo.module_name.asc(), DemoVideo.title.asc()).all()


def get_demo_video(db: Session, demo_video_id: int) -> DemoVideo:
    row = (
        db.query(DemoVideo)
        .filter(DemoVideo.id == demo_video_id, DemoVideo.is_deleted == False)  # noqa: E712
        .first()
    )
    if not row:
        raise NotFoundException("Demo video", demo_video_id)
    return row


def create_demo_video(db: Session, data: DemoVideoCreate, created_by: int | None = None) -> DemoVideo:
    existing = (
        db.query(DemoVideo)
        .filter(
            DemoVideo.is_deleted == False,  # noqa: E712
            DemoVideo.module_key == data.module_key.strip(),
            DemoVideo.title == data.title.strip(),
        )
        .first()
    )
    if existing:
        raise ConflictException("Demo video with the same module and title already exists")

    row = DemoVideo(
        module_key=data.module_key.strip(),
        module_name=data.module_name.strip(),
        title=data.title.strip(),
        description=data.description.strip() if data.description else None,
        video_url=data.video_url.strip(),
        is_active=data.is_active,
        created_by=created_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def update_demo_video(
    db: Session,
    demo_video_id: int,
    data: DemoVideoUpdate,
    updated_by: int | None = None,
) -> DemoVideo:
    row = get_demo_video(db, demo_video_id)

    if data.module_key is not None:
        row.module_key = data.module_key.strip()
    if data.module_name is not None:
        row.module_name = data.module_name.strip()
    if data.title is not None:
        row.title = data.title.strip()
    if data.description is not None:
        row.description = data.description.strip() or None
    if data.video_url is not None:
        row.video_url = data.video_url.strip()
    if data.is_active is not None:
        row.is_active = data.is_active

    row.updated_by = updated_by
    row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def soft_delete_demo_video(db: Session, demo_video_id: int, deleted_by: int | None = None) -> None:
    row = get_demo_video(db, demo_video_id)
    row.is_deleted = True
    row.deleted_at = datetime.utcnow()
    row.deleted_by = deleted_by
    db.commit()
