"""Refresh token persistence."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models.refresh_token import RefreshToken


def create_refresh_token_row(
    db: Session,
    *,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
    is_impersonation: bool = False,
    original_user_id: Optional[int] = None,
) -> RefreshToken:
    row = RefreshToken(
        user_id=user_id,
        token=token_hash,
        expires_at=expires_at,
        is_revoked=False,
        created_at=datetime.utcnow(),
        is_impersonation=is_impersonation,
        original_user_id=original_user_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_valid_refresh_token(db: Session, token_hash: str) -> Optional[RefreshToken]:
    row = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == token_hash,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
        .first()
    )
    if not row:
        return None
    if row.expires_at < datetime.utcnow():
        return None
    return row


def revoke_refresh_token_row(db: Session, row: RefreshToken) -> None:
    row.is_revoked = True
    db.add(row)
    db.commit()


def revoke_refresh_token_by_hash(db: Session, token_hash: str) -> bool:
    row = db.query(RefreshToken).filter(RefreshToken.token == token_hash).first()
    if not row:
        return False
    if not row.is_revoked:
        row.is_revoked = True
        db.add(row)
        db.commit()
    return True


def revoke_all_user_refresh_tokens(db: Session, user_id: int) -> int:
    rows = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,  # noqa: E712
        )
        .all()
    )
    for row in rows:
        row.is_revoked = True
        db.add(row)
    if rows:
        db.commit()
    return len(rows)
