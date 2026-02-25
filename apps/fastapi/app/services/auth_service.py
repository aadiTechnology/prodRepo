from datetime import datetime
from sqlalchemy.orm import Session
from app.models.revoked_token import RevokedToken
from app.core.logging_config import get_logger

logger = get_logger(__name__)

def revoke_token(db: Session, token: str, user_id: int) -> None:
    """Add token to revoked_tokens table."""
    db.add(RevokedToken(token=token, user_id=user_id, revoked_at=datetime.utcnow()))
    db.commit()
    logger.info(f"Token revoked for user_id={user_id}: {token[:20]}...")