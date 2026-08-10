"""Persistent refresh tokens for long-lived mobile/web sessions."""
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from app.core.database import Base


class RefreshToken(Base):
    """
    Refresh token row. `token` stores SHA-256 hex of the opaque client secret
    (never store the raw token). Matches dbo.refresh_tokens layout used in the DB dump
    plus optional impersonation metadata for session continuity.
    """

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(512), nullable=False, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_revoked = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    is_impersonation = Column(Boolean, nullable=False, default=False)
    original_user_id = Column(Integer, nullable=True)
