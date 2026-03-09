"""Service layer for Theme Template CRUD."""

import json
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.core.exceptions import NotFoundException
from app.core.logging_config import get_logger
from app.models.theme_template import ThemeTemplate
from app.schemas.theme_template import (
    ThemeTemplateCreate,
    ThemeTemplateUpdate,
    ThemeTemplateResponse,
)

logger = get_logger(__name__)


def _row_to_response(row: ThemeTemplate) -> ThemeTemplateResponse:
    """Build response schema from ORM row; parse config JSON."""
    config = row.config
    if isinstance(config, str):
        try:
            config = json.loads(config) if config else {}
        except json.JSONDecodeError:
            config = {}
    return ThemeTemplateResponse(
        id=row.id,
        name=row.name,
        description=row.description,
        config=config,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def list_templates(
    db: Session,
    search: str | None = None,
    page: int = 1,
    page_size: int = 100,
) -> tuple[list[ThemeTemplateResponse], int]:
    """List theme templates with optional search and pagination."""
    query = db.query(ThemeTemplate)
    if search:
        query = query.filter(
            or_(
                ThemeTemplate.name.ilike(f"%{search}%"),
                and_(
                    ThemeTemplate.description.isnot(None),
                    ThemeTemplate.description.ilike(f"%{search}%"),
                ),
            )
        )
    total = query.count()
    rows = (
        query.order_by(ThemeTemplate.updated_at.desc(), ThemeTemplate.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return [_row_to_response(r) for r in rows], total


def get_template(db: Session, template_id: int) -> ThemeTemplateResponse:
    """Get a single theme template by ID."""
    row = db.query(ThemeTemplate).filter(ThemeTemplate.id == template_id).first()
    if not row:
        raise NotFoundException("Theme template", template_id)
    return _row_to_response(row)


def get_template_config(db: Session, template_id: int) -> dict | None:
    """Return parsed token-override config for a template, or None if not found."""
    row = db.query(ThemeTemplate).filter(ThemeTemplate.id == template_id).first()
    if not row:
        return None
    raw = row.config
    if isinstance(raw, str):
        try:
            return json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            return {}
    return raw if isinstance(raw, dict) else {}


def create_template(
    db: Session,
    data: ThemeTemplateCreate,
    created_by: int | None = None,
) -> ThemeTemplateResponse:
    """Create a new theme template."""
    config_json = json.dumps(data.config) if data.config else "{}"
    row = ThemeTemplate(
        name=data.name,
        description=data.description,
        config=config_json,
        created_by=created_by,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    logger.info(f"Theme template created: {row.name} (id={row.id})")
    return _row_to_response(row)


def update_template(
    db: Session,
    template_id: int,
    data: ThemeTemplateUpdate,
    updated_by: int | None = None,
) -> ThemeTemplateResponse:
    """Update an existing theme template."""
    row = db.query(ThemeTemplate).filter(ThemeTemplate.id == template_id).first()
    if not row:
        raise NotFoundException("Theme template", template_id)
    if data.name is not None:
        row.name = data.name
    if data.description is not None:
        row.description = data.description
    if data.config is not None:
        row.config = json.dumps(data.config)
    row.updated_at = datetime.utcnow()
    row.updated_by = updated_by
    db.commit()
    db.refresh(row)
    logger.info(f"Theme template updated: {row.name} (id={row.id})")
    return _row_to_response(row)


def delete_template(db: Session, template_id: int) -> None:
    """Delete a theme template."""
    row = db.query(ThemeTemplate).filter(ThemeTemplate.id == template_id).first()
    if not row:
        raise NotFoundException("Theme template", template_id)
    db.delete(row)
    db.commit()
    logger.info(f"Theme template deleted: id={template_id}")
