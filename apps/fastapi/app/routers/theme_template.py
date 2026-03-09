"""API router for Theme Templates (token override templates)."""

from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import require_system_admin, CurrentUser
from app.schemas.theme_template import (
    ThemeTemplateCreate,
    ThemeTemplateUpdate,
    ThemeTemplateResponse,
    ThemeTemplateListResponse,
)
from app.services import theme_template_service

router = APIRouter(prefix="/theme-templates", tags=["Theme Templates"])


@router.get("/", response_model=ThemeTemplateListResponse)
async def list_theme_templates(
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    search: Optional[str] = Query(None),
) -> ThemeTemplateListResponse:
    """List theme templates. Super Admin only."""
    items, total = theme_template_service.list_templates(
        db, search=search, page=page, page_size=page_size
    )
    return {"items": items, "total": total}


@router.get("/{template_id}", response_model=ThemeTemplateResponse)
async def get_theme_template(
    template_id: int,
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> ThemeTemplateResponse:
    """Get a single theme template by ID."""
    return theme_template_service.get_template(db, template_id)


@router.post("/", response_model=ThemeTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_theme_template(
    data: ThemeTemplateCreate,
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> ThemeTemplateResponse:
    """Create a new theme template from token overrides."""
    return theme_template_service.create_template(db, data, created_by=current_user.id)


@router.put("/{template_id}", response_model=ThemeTemplateResponse)
async def update_theme_template(
    template_id: int,
    data: ThemeTemplateUpdate,
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> ThemeTemplateResponse:
    """Update an existing theme template."""
    return theme_template_service.update_template(
        db, template_id, data, updated_by=current_user.id
    )


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_theme_template(
    template_id: int,
    db=Depends(get_db),
    current_user: CurrentUser = Depends(require_system_admin),
) -> None:
    """Delete a theme template."""
    theme_template_service.delete_template(db, template_id)
    return None
