from datetime import datetime
from pydantic import BaseModel


class BaseMetadata(BaseModel):
    tenant_id: str | None
    created_by: str
    created_at: datetime
    is_super_admin_accessible: bool


class Requirement(BaseModel):
    id: str
    title: str
    description: str
    metadata: BaseMetadata


class UserStory(BaseModel):
    id: str
    requirement_id: str
    title: str
    prerequisite: list[str]
    story: str
    acceptance_criteria: list[str]
    metadata: BaseMetadata


class TestCase(BaseModel):
    id: str
    user_story_id: str
    test_case_id: str
    scenario: str
    pre_requisite: list[str]
    test_data: list[str] | None
    steps: list[str]
    expected_result: str
    metadata: BaseMetadata


class AIResponse(BaseModel):
    tenant_id: str | None
    requirement: Requirement
    user_stories: list[UserStory]
    test_cases: list[TestCase]
