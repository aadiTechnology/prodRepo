"""Schemas for sprintwise performance comparison report API."""

from pydantic import BaseModel, Field


class SprintwiseSprintTotals(BaseModel):
    sprint_id: int = Field(..., description="PT_Sprints.SprintId")
    sprint_label: str
    billable_efforts: float = Field(..., description="Hours from tasks in Billable category")
    page_efforts: float = Field(..., description="Hours from PageDevelopment (productive) category")
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


class MemberSprintMetrics(BaseModel):
    owner_id: int
    owner_label: str
    billable_efforts: float
    productive_efforts: float
    total_efforts: float


class SprintMemberDetailBlock(BaseModel):
    sprint_id: int
    sprint_label: str
    members: list[MemberSprintMetrics]


class OverallMemberSummary(BaseModel):
    members: list[MemberSprintMetrics]


class SprintwisePerformanceReportResponse(BaseModel):
    slices: list[SprintwiseReportSlice]
    detail_by_sprint: list[SprintMemberDetailBlock] = Field(default_factory=list)
    overall_summary: OverallMemberSummary = Field(default_factory=lambda: OverallMemberSummary(members=[]))
