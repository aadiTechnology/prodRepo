from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator

GalleryType = Literal["Photo", "Video"]
MediaType = Literal["Photo", "Video"]


class ActivityGalleryClassTarget(BaseModel):
    class_id: int = Field(..., ge=1)
    division_id: int = Field(..., ge=1)


class ActivityGalleryCreate(BaseModel):
    gallery_name: str = Field(..., min_length=1, max_length=255)
    gallery_type: GalleryType
    activity_date: date
    description: str | None = None
    targets: list[ActivityGalleryClassTarget] | None = None
    class_id: int | None = Field(None, ge=1)
    division_id: int | None = Field(None, ge=1)

    @model_validator(mode="after")
    def resolve_targets(self) -> "ActivityGalleryCreate":
        if self.targets:
            return self
        if self.class_id is not None and self.division_id is not None:
            self.targets = [
                ActivityGalleryClassTarget(class_id=self.class_id, division_id=self.division_id)
            ]
            return self
        raise ValueError("Please select class and division")


class ActivityGalleryUpdate(BaseModel):
    gallery_name: str | None = Field(None, min_length=1, max_length=255)
    activity_date: date | None = None
    description: str | None = None
    targets: list[ActivityGalleryClassTarget] | None = None
    class_id: int | None = Field(None, ge=1)
    division_id: int | None = Field(None, ge=1)

    @model_validator(mode="after")
    def resolve_targets(self) -> "ActivityGalleryUpdate":
        if self.targets is not None:
            return self
        if self.class_id is not None and self.division_id is not None:
            self.targets = [
                ActivityGalleryClassTarget(class_id=self.class_id, division_id=self.division_id)
            ]
        return self


class ActivityGalleryMediaResponse(BaseModel):
    id: int
    gallery_id: int
    media_type: MediaType
    file_name: str
    original_file_name: str | None = None
    file_path: str
    file_size: int | None = None
    display_order: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class ActivityGalleryClassMappingResponse(BaseModel):
    id: int
    gallery_id: int
    class_id: int
    division_id: int
    class_name: str | None = None
    division_name: str | None = None
    created_at: datetime | None = None


class ActivityGalleryResponse(BaseModel):
    id: int
    tenant_id: int
    gallery_name: str
    gallery_type: GalleryType
    description: str | None = None
    activity_date: date
    created_by: int
    is_published: bool
    status: int
    created_at: datetime
    updated_at: datetime
    class_id: int | None = None
    class_name: str | None = None
    division_id: int | None = None
    division_name: str | None = None
    photo_count: int = 0
    video_count: int = 0
    media_count: int = 0
    class_mappings: list[ActivityGalleryClassMappingResponse] = Field(default_factory=list)
    media_items: list[ActivityGalleryMediaResponse] = Field(default_factory=list)


class ActivityGalleryListItem(BaseModel):
    id: int
    tenant_id: int
    gallery_name: str
    gallery_type: GalleryType
    activity_date: date
    description: str | None = None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    class_id: int | None = None
    class_name: str | None = None
    division_id: int | None = None
    division_name: str | None = None
    photo_count: int = 0
    video_count: int = 0
    media_count: int = 0


class ActivityGalleryListResponse(BaseModel):
    data: list[ActivityGalleryListItem]
    total: int
    page: int
    size: int
    pages: int


class ActivityGalleryPublishResponse(BaseModel):
    message: str
    gallery: ActivityGalleryResponse


class ActivityGalleryDeleteResponse(BaseModel):
    message: str


class ActivityGalleryYoutubeCreate(BaseModel):
    youtube_url: str = Field(..., min_length=1, max_length=500)


class ClassOption(BaseModel):
    id: int
    name: str


class DivisionOption(BaseModel):
    id: int
    division_name: str


class TeacherGalleryClassDivision(BaseModel):
    id: int
    division_name: str


class TeacherGalleryClassOption(BaseModel):
    id: int
    name: str
    divisions: list[TeacherGalleryClassDivision] = Field(default_factory=list)


class TeacherGalleryScopeResponse(BaseModel):
    is_teacher: bool
    default_targets: list[ActivityGalleryClassTarget] = Field(default_factory=list)
    classes: list[TeacherGalleryClassOption] = Field(default_factory=list)


class GalleryAccessPermissionsResponse(BaseModel):
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool
    can_download: bool
