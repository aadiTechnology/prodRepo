from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.core.exceptions import NotFoundException
from app.schemas.holiday import (
    HolidayCreateRequest,
    HolidayListResponse,
    HolidayResponse,
    HolidayUpdateRequest,
)
from app.services import holiday_service

router = APIRouter(prefix="/api/holidays", tags=["Academic Management - Holidays"])

# Read-only namespace for configuration UI. Some environments register `/api/holidays/{id}` without GET
# (PUT/DELETE only), which yields HTTP 405 for GET; this prefix avoids that collision.
configuration_router = APIRouter(
    prefix="/api/configuration/holidays",
    tags=["Academic Management - Holidays"],
)


@configuration_router.get("/{holiday_id}", response_model=HolidayResponse)
def get_holiday_for_configuration_ui(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return holiday_service.get_holiday(db, tenant_id=current_user.tenant_id, holiday_id=holiday_id)


@router.get("", response_model=HolidayListResponse | HolidayResponse)
@router.get("/", response_model=HolidayListResponse | HolidayResponse)
def list_holidays(
    holiday_id: int | None = Query(None, ge=1, description="When set, return this holiday (avoids GET /{id} on broken proxies)."),
    academic_year_id: int | None = Query(None, ge=1),
    holiday_type: str | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    if holiday_id is not None:
        row = holiday_service.get_holiday(db, tenant_id=current_user.tenant_id, holiday_id=holiday_id)
        if academic_year_id is not None and row.academic_year_id != academic_year_id:
            raise NotFoundException("Holiday", holiday_id)
        return row
    if academic_year_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="academic_year_id is required when holiday_id is omitted",
        )
    return holiday_service.list_holidays(
        db,
        tenant_id=current_user.tenant_id,
        academic_year_id=academic_year_id,
        holiday_type=holiday_type,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get("/detail/{holiday_id}", response_model=HolidayResponse)
def get_holiday_by_detail_path(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Alternate URL for clients that used /detail/ (register before /{holiday_id})."""
    return holiday_service.get_holiday(db, tenant_id=current_user.tenant_id, holiday_id=holiday_id)


@router.get("/by-id/{holiday_id}", response_model=HolidayResponse)
def get_holiday_by_static_segment(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Stable fetch URL when legacy deployments only register PUT/DELETE on /{holiday_id}."""
    return holiday_service.get_holiday(db, tenant_id=current_user.tenant_id, holiday_id=holiday_id)


@router.get("/{holiday_id}", response_model=HolidayResponse)
def get_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return holiday_service.get_holiday(db, tenant_id=current_user.tenant_id, holiday_id=holiday_id)


@router.post("", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(
    payload: HolidayCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return holiday_service.create_holiday(
        db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        actor_user_id=current_user.id,
        actor_name=getattr(current_user, "full_name", None) or current_user.email,
    )


@router.put("/{holiday_id}", response_model=HolidayResponse)
def update_holiday(
    holiday_id: int,
    payload: HolidayUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return holiday_service.update_holiday(
        db,
        tenant_id=current_user.tenant_id,
        holiday_id=holiday_id,
        payload=payload,
        actor_user_id=current_user.id,
        actor_name=getattr(current_user, "full_name", None) or current_user.email,
    )


@router.delete("/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(
    holiday_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    holiday_service.delete_holiday(
        db,
        tenant_id=current_user.tenant_id,
        holiday_id=holiday_id,
        actor_user_id=current_user.id,
        actor_name=getattr(current_user, "full_name", None) or current_user.email,
    )
    return None
