from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_role, require_system_admin
from app.models.user import UserRole
from app.schemas.demo_video import DemoVideoCreate, DemoVideoResponse, DemoVideoUpdate
from app.services import demo_video_service


router = APIRouter(prefix="/demo-videos", tags=["Demo Videos"])


@router.get("/", response_model=List[DemoVideoResponse])
async def list_demo_videos(
    module_key: str | None = Query(default=None),
    active_only: bool | None = Query(default=None),
    db: Session = Depends(get_db),
) -> List[DemoVideoResponse]:
    """List demo videos - publicly accessible."""
    return demo_video_service.list_demo_videos(db, module_key=module_key, active_only=active_only)


@router.get("/{demo_video_id}", response_model=DemoVideoResponse)
async def get_demo_video(
    demo_video_id: int,
    db: Session = Depends(get_db),
) -> DemoVideoResponse:
    """Get a single demo video - publicly accessible."""
    return demo_video_service.get_demo_video(db, demo_video_id)


@router.post("/", response_model=DemoVideoResponse, status_code=status.HTTP_201_CREATED)
async def create_demo_video(
    data: DemoVideoCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> DemoVideoResponse:
    return demo_video_service.create_demo_video(db, data, created_by=current_user.id)


@router.put("/{demo_video_id}", response_model=DemoVideoResponse)
async def update_demo_video(
    demo_video_id: int,
    data: DemoVideoUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> DemoVideoResponse:
    return demo_video_service.update_demo_video(db, demo_video_id, data, updated_by=current_user.id)


@router.delete("/{demo_video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_demo_video(
    demo_video_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> None:
    demo_video_service.soft_delete_demo_video(db, demo_video_id, deleted_by=current_user.id)
    return None
