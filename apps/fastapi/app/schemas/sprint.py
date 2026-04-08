from datetime import date, datetime
from pydantic import BaseModel, Field


class OptionItem(BaseModel):
    id: int
    label: str


class SprintAssignmentsWrite(BaseModel):
    feature_assignments: list["SprintFeatureAssignmentWrite"] = Field(default_factory=list)


class SprintAssignedUser(BaseModel):
    user_id: int
    user_name: str | None = None


class SprintPageAssignment(BaseModel):
    page_id: int
    page_name: str | None = None
    assigned_users: list[SprintAssignedUser] = Field(default_factory=list)


class SprintFeatureAssignment(BaseModel):
    feature_id: int
    feature_name: str | None = None
    pages: list[SprintPageAssignment] = Field(default_factory=list)


class SprintPageAssignmentWrite(BaseModel):
    page_id: int
    user_ids: list[int] = Field(default_factory=list)


class SprintFeatureAssignmentWrite(BaseModel):
    feature_id: int
    pages: list[SprintPageAssignmentWrite] = Field(default_factory=list)


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


class SprintAssignmentOptionsResponse(BaseModel):
    features: list[OptionItem]
    users: list[OptionItem]


class SprintAssignmentsResponse(BaseModel):
    sprint_id: int
    project_id: int
    feature_assignments: list[SprintFeatureAssignment] = Field(default_factory=list)

