from typing import Literal, Any
from pydantic import BaseModel, Field


class InterpretRequest(BaseModel):
    user_text: str = Field(..., min_length=1, max_length=2000)


class InterpretResponse(BaseModel):
    intent: Literal["ADD_ROLE", "UPDATE_ROLE", "DELETE_ROLE", "VIEW_ROLES"]
    action: Literal["CALL_API", "NAVIGATE"]
    method: Literal["POST", "PUT", "DELETE", "GET"] | None
    endpoint: str
    payload: dict[str, Any] = Field(default_factory=dict)
