"""Schemas for sprintwise performance comparison report API."""

from pydantic import BaseModel, Field


class SprintwiseSprintTotals(BaseModel):
    sprint_id: int = Field(..., description="PT_Sprints.SprintId")
    sprint_label: str
    billable_efforts: float = Field(..., description="Hours from tasks in Billable category")
    page_efforts: float = Field(..., description="Hours from tasks in PageDevelopment category")


class SprintwisePerformanceReportResponse(BaseModel):
    sprints: list[SprintwiseSprintTotals]
