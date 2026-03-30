"""Schemas for sprint performance report API."""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class TimesheetEntryRow(BaseModel):
    owner_name: Optional[str] = None
    feature_name: Optional[str] = None
    page_name: Optional[str] = None
    task_type: Optional[str] = None
    subtask: Optional[str] = None
    description: Optional[str] = None
    spend_efforts: Optional[Decimal] = None
    created_on: Optional[datetime] = None
    sprint: Optional[int] = None


class SprintPerformanceAggregations(BaseModel):
    total_hours: float
    unique_page_names: int
    entries_count: int
    pages_per_hour: Optional[float] = None


class SprintPerformanceReportResponse(BaseModel):
    rows: list[TimesheetEntryRow]
    aggregations: SprintPerformanceAggregations


class ReportOption(BaseModel):
    id: int
    label: str


class SprintPerformanceFilterOptionsResponse(BaseModel):
    sprints: list[ReportOption]
    owners: list[ReportOption]
    features: list[ReportOption]
    tasks: list[ReportOption]
