from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.models.user import User, UserRole
from app.schemas.ai import InterpretRequest, InterpretResponse, GenerateStoryAndTestsRequest
from app.services.intent_service import interpret
from app.services.ai_service import generate_story_and_tests

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/interpret", response_model=InterpretResponse)
async def ai_interpret(
    body: InterpretRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> InterpretResponse:
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        return InterpretResponse(
            menu_id=None,
            menu_name="",
            parent_menu_id=None,
            parent_menu_name="",
            route="/",
            action="NAVIGATE",
            method=None,
            endpoint=None,
            payload={},
            requires_confirmation=False,
            error_type="SAFE_ERROR",
            error_message="User not found.",
        )
    return interpret(db, user, body.user_text)


@router.post("/generate-story-and-tests")
async def ai_generate_story_and_tests(
    body: GenerateStoryAndTestsRequest,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Generate user stories and test cases from a requirement. Super Admin only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Super Admin can use this endpoint.",
        )
    return generate_story_and_tests(body.requirement)
