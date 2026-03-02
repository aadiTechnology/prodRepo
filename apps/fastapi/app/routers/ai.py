from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.models.user import User
from app.schemas.ai import InterpretRequest, InterpretResponse
from app.services.intent_service import interpret

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
