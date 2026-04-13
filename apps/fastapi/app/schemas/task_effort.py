from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


class TaskStatusItem(BaseModel):
    status_id: int
    status_name: str
    sort_order: int = 0


class TaskEffortRow(BaseModel):
    timesheet_id: int
    task_name: str
    subtask_name: str
    status_id: int
    status_label: str
    total_effort: float | None = None
    task_start_date: date | None = None
    task_end_date: date | None = None
    last_updated: datetime | None = None
    is_closed: bool = False


class TaskEffortListResponse(BaseModel):
    tasks: list[TaskEffortRow]


class EffortSaveRequest(BaseModel):
    project_id: int = Field(..., description="PT_Project.Id")
    timesheet_id: int
    working_date: date
    effort_hours: Decimal

    @field_validator("effort_hours")
    @classmethod
    def effort_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("effort_hours must be greater than zero")
        return v


class TaskCloseRequest(BaseModel):
    project_id: int = Field(..., description="PT_Project.Id")
    timesheet_id: int
    working_date: date


class ActiveSprintResponse(BaseModel):
    sprint_id: int | None = None


class LastEffortDefaultsResponse(BaseModel):
    project_id: int | None = None
    sprint_id: int | None = None
    feature_id: int | None = None
    page_id: int | None = None
    effort_logged_on: datetime | None = None


class EffortMutationResponse(BaseModel):
    ok: bool = True
    task: TaskEffortRow | None = None
