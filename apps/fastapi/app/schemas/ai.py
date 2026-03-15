from typing import Literal, Any
from pydantic import BaseModel, Field


class ApiContractPayload(BaseModel):
    """API contract payload for data model extraction."""

    endpoint: str = ""
    method: str = "GET"
    request_schema: dict[str, Any] = Field(default_factory=dict)
    response_schema: dict[str, Any] = Field(default_factory=dict)


class DataModelExtractionRequest(BaseModel):
    """Request body for extracting data models from an API contract."""

    api_contract: ApiContractPayload = Field(..., description="API contract with endpoint, method, request_schema, response_schema")


class SchemaGenerationModelInput(BaseModel):
    """Single model input for schema generation."""

    model_name: str = Field(..., min_length=1)
    fields: dict[str, str] = Field(default_factory=dict)


class SchemaGenerationRequest(BaseModel):
    """Request body for generating ORM and migrations from data models."""

    task_id: str = Field(..., description="Task identifier")
    models: list[SchemaGenerationModelInput] = Field(..., min_length=1)


class FileMappingModelInput(BaseModel):
    """Single model reference for file mapping (model_name only)."""

    model_name: str = Field(..., min_length=1)


class FileMappingRequest(BaseModel):
    """Request body for generating file mapping for a development task."""

    task_id: str = Field(..., description="Task identifier")
    task_title: str = Field("", description="Task title (e.g. Create attendance API)")
    api_contract: dict[str, Any] = Field(default_factory=dict, description="endpoint, method, request_schema, response_schema")
    models: list[FileMappingModelInput] = Field(default_factory=list, description="Data models (model_name) for entity detection")


class GenerateStoryAndTestsRequest(BaseModel):
    requirement: str = Field(..., min_length=1, max_length=50000)


class InterpretRequest(BaseModel):
    user_text: str = Field(..., min_length=1, max_length=2000)


class InterpretResponse(BaseModel):
    menu_id: int | None = None
    menu_name: str = ""
    parent_menu_id: int | None = None
    parent_menu_name: str = ""
    route: str = ""
    action: Literal["NAVIGATE", "CALL_API"] = "NAVIGATE"
    method: Literal["POST", "PUT", "DELETE", "GET"] | None = None
    endpoint: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    requires_confirmation: bool = False
    error_type: Literal["SAFE_ERROR", "NEED_CLARIFICATION"] | None = None
    error_message: str | None = None


class RejectArtifactRequest(BaseModel):
    reason: str = Field(..., min_length=1, max_length=5000)


class UpdateUserStoryRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    prerequisite: list[str] = Field(default_factory=list)
    story: str = Field(..., min_length=1, max_length=50000)
    acceptance_criteria: list[str] = Field(default_factory=list)


class UpdateTestCaseRequest(BaseModel):
    test_case_id: str = Field(..., min_length=1, max_length=100)
    scenario: str = Field(..., min_length=1, max_length=1000)
    pre_requisite: list[str] = Field(default_factory=list)
    test_data: list[str] | None = None
    steps: list[str] = Field(default_factory=list)
    expected_result: str = Field(..., min_length=1, max_length=50000)


class RegenerateArtifactRequest(BaseModel):
    feedback: str = Field(..., min_length=1, max_length=5000)
