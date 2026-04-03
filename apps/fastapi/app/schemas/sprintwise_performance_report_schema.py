"""Schemas for sprintwise performance comparison report API."""

from pydantic import BaseModel, Field


class SprintwiseSprintTotals(BaseModel):
    sprint_id: int = Field(..., description="PT_Sprints.SprintId")
    sprint_label: str
    billable_efforts: float = Field(..., description="Hours from tasks in Billable category")
    page_efforts: float = Field(..., description="Hours from tasks in PageDevelopment category")
    total_efforts: float = Field(
        ...,
        description="All logged hours in the sprint (no category filter on PT_Timesheets).",
    )


class SprintwiseReportSlice(BaseModel):
    slice_key: str = Field(
        ...,
        description='Stable id: "all", "total", or "member:{OwnerId}".',
    )
    label: str
    owner_id: int | None = Field(default=None, description="PT_Owners.OwnerId when member slice")
    sprints: list[SprintwiseSprintTotals]


class SprintwisePerformanceReportResponse(BaseModel):
    slices: list[SprintwiseReportSlice]
