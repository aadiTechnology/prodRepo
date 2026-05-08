from pydantic import BaseModel, Field, constr, ConfigDict
from typing import Optional, List
from datetime import datetime

class SubjectBase(BaseModel):
    name: str = Field(..., max_length=100, description="Subject Name")
    code: str = Field(..., max_length=20, description="Unique Subject Code")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")
    subject_type: str = Field(..., max_length=50, description="Type of the subject (e.g., Theory, Practical, Activity)")
    is_active: bool = Field(True, description="Active status of the subject")

class SubjectCreate(SubjectBase):
    class_ids: List[int] = Field(default_factory=list, description="List of applicable class IDs")

class SubjectUpdate(SubjectBase):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    subject_type: Optional[str] = Field(None, max_length=50)
    class_ids: Optional[List[int]] = Field(None, description="Updated list of applicable class IDs")

class SubjectClassResponse(BaseModel):
    class_id: int
    class_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class SubjectResponse(SubjectBase):
    id: int
    tenant_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    classes: List[SubjectClassResponse] = Field(default_factory=list, description="List of mapped classes")

    model_config = ConfigDict(from_attributes=True)

class SubjectListResponse(BaseModel):
    data: List[SubjectResponse]
    total: int
    page: int
    size: int
    pages: int
