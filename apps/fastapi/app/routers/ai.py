from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import CurrentUser, require_admin
from app.schemas.ai import InterpretRequest, InterpretResponse
from app.services.intent_service import interpret

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/interpret", response_model=InterpretResponse)
async def ai_interpret(
    body: InterpretRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> InterpretResponse:
    return interpret(db, body.user_text)
