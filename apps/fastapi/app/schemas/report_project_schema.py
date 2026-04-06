"""DTOs for report project picker (tenant implied from auth)."""

from pydantic import BaseModel, Field


class ReportProjectOptionResponse(BaseModel):
    id: int = Field(description="PT_Project.Id")
    label: str
