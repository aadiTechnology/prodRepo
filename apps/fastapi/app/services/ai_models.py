from datetime import datetime
from typing import Literal
from pydantic import BaseModel


class BaseMetadata(BaseModel):
    tenant_id: str | None
    created_by: str
    created_at: datetime
    is_super_admin_accessible: bool


class Requirement(BaseModel):
    title: str
    description: str
    metadata: BaseMetadata


class UserStory(BaseModel):
    title: str
    prerequisite: list[str]
    story: str
    acceptance_criteria: list[str]
    metadata: BaseMetadata


class TestCase(BaseModel):
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


class RegeneratedUserStory(BaseModel):
    title: str
    prerequisite: list[str]
    story: str
    acceptance_criteria: list[str]


class RegeneratedTestCase(BaseModel):
    test_case_id: str
    scenario: str
    pre_requisite: list[str]
    test_data: list[str] | None
    steps: list[str]
    expected_result: str


# Story quality improvement (structured output)
ImprovementAction = Literal["add_test_cases", "update_story", "update_story_and_add_tests", "no_change"]


class NewTestCaseForImprovement(BaseModel):
    """One new test case to append for a missing scenario."""

    test_case_id: str
    scenario: str
    pre_requisite: list[str] = []
    test_data: list[str] | None = None
    steps: list[str]
    expected_result: str


class StoryQualityImprovementResult(BaseModel):
    improvement_action: ImprovementAction
    updated_story: str | None = None  # Only when action is update_story or update_story_and_add_tests
    new_test_cases: list[NewTestCaseForImprovement] = []
    resolved_validation_issues: list[str] = []
