from typing import Literal, Any
from pydantic import BaseModel, Field


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
