from datetime import datetime
from typing import Any, Literal
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


# Development task generation (from approved user stories)
class DevelopmentTask(BaseModel):
    """Single developer implementation task with architecture-aware location."""

    task_id: str = ""  # assigned by backend, e.g. FRONT-101, BACK-102
    title: str
    description: str
    related_scenario: str  # normalized scenario or acceptance criterion reference
    component: str  # e.g. "React component", "FastAPI controller", "SQL migration"
    priority: str  # e.g. "high", "medium", "low"
    estimated_effort: str  # e.g. "2h", "1d", "0.5d"


class DevelopmentTasksResponse(BaseModel):
    """Generated development tasks grouped by category. Max 3–5 per category."""

    frontend_tasks: list[DevelopmentTask] = []
    backend_tasks: list[DevelopmentTask] = []
    database_tasks: list[DevelopmentTask] = []
    testing_tasks: list[DevelopmentTask] = []


# API contract generation (from backend development tasks)
class APIContract(BaseModel):
    """Structured REST API contract for a backend development task."""

    endpoint: str = ""
    method: str = "GET"
    description: str = ""
    request_schema: dict[str, Any] = {}
    response_schema: dict[str, Any] = {}
    status_codes: dict[str, str] = {}


# Data model extraction from API contract (backend SQLAlchemy-style models)
class ExtractedDataModel(BaseModel):
    """Single backend data model derived from an API contract."""

    model_name: str = ""
    fields: dict[str, str] = {}  # field_name -> type string (e.g. "integer", "datetime", "string")
    relationships: dict[str, str] | None = None  # optional: relationship_name -> target_model or description


class DataModelExtractionResult(BaseModel):
    """Result of extracting backend data models from an API contract."""

    models: list[ExtractedDataModel] = []
