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


class SprintAssignedUserDetail(BaseModel):
    user_id: int
    user_name: str | None = None
    is_primary: bool = False


class SprintPageAssignment(BaseModel):
    page_id: int
    page_name: str | None = None
    assigned_users: list[SprintAssignedUser] = Field(default_factory=list)
    developers: list[SprintAssignedUserDetail] = Field(default_factory=list)
    testers: list[SprintAssignedUserDetail] = Field(default_factory=list)
    primary_developer_id: int | None = None
    primary_tester_id: int | None = None


class SprintFeatureAssignment(BaseModel):
    feature_id: int
    feature_name: str | None = None
    pages: list[SprintPageAssignment] = Field(default_factory=list)


class SprintPageAssignmentWrite(BaseModel):
    page_id: int
    user_ids: list[int] = Field(default_factory=list)
    developer_user_ids: list[int] | None = None
    tester_user_ids: list[int] | None = None


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


class SprintAssignmentGridPage(BaseModel):
    page_id: int
    page_name: str | None = None
    developers: list[SprintAssignedUserDetail] = Field(default_factory=list)
    testers: list[SprintAssignedUserDetail] = Field(default_factory=list)
    assigned_users: list[SprintAssignedUser] = Field(default_factory=list)
    primary_developer_id: int | None = None
    primary_tester_id: int | None = None
    last_updated_on: datetime | None = None
    last_updated_by_user_id: int | None = None
    last_updated_by_name: str | None = None
    status: str = "unassigned"


class SprintAssignmentGridFeature(BaseModel):
    feature_id: int
    feature_name: str | None = None
    pages: list[SprintAssignmentGridPage] = Field(default_factory=list)


class SprintAssignmentGridStats(BaseModel):
    total_pages: int = 0
    assigned_pages: int = 0
    unassigned_pages: int = 0


class SprintAssignmentManagementGridResponse(BaseModel):
    sprint_id: int
    project_id: int
    sprint_name: str | None = None
    features: list[SprintAssignmentGridFeature] = Field(default_factory=list)
    stats: SprintAssignmentGridStats = Field(default_factory=SprintAssignmentGridStats)


class SprintAssignmentManagementFeatureGridResponse(BaseModel):
    sprint_id: int
    project_id: int
    sprint_name: str | None = None
    feature: SprintAssignmentGridFeature
    stats: SprintAssignmentGridStats = Field(default_factory=SprintAssignmentGridStats)

