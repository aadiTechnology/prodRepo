from datetime import date, datetime
from pydantic import BaseModel, Field


class SprintBase(BaseModel):
    sprint_name: str = Field(..., min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
    is_completed: bool | None = None


class SprintCreate(SprintBase):
    pass


class SprintUpdate(BaseModel):
    sprint_name: str | None = Field(default=None, min_length=1, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
    is_completed: bool | None = None


class SprintResponse(BaseModel):
    sprint_id: int
    sprint_name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None
    is_completed: bool = False
    created_on: datetime | None = None
    project_id: int | None = None

    class Config:
        from_attributes = True


class SprintListResponse(BaseModel):
    items: list[SprintResponse]
    total: int

