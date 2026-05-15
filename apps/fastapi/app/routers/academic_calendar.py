from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser, get_current_user
from app.schemas.academic_calendar import AcademicCalendarResponse
from app.services import academic_calendar_service

router = APIRouter(
    prefix="/api/academic-calendar",
    tags=["Academic Management - Academic Calendar"],
)


@router.get("/export")
def export_academic_calendar(
    year: int = Query(..., ge=2000, le=2100),
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    filename, buf = academic_calendar_service.export_academic_calendar_csv(
        db,
        tenant_id=current_user.tenant_id,
        year=year,
        academic_year_id=academic_year_id,
    )
    content = buf.read()
    return Response(
        content=content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("", response_model=AcademicCalendarResponse)
@router.get("/", response_model=AcademicCalendarResponse)
def get_academic_calendar(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    academic_year_id: int = Query(..., ge=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(31, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    return academic_calendar_service.get_academic_calendar(
        db,
        tenant_id=current_user.tenant_id,
        year=year,
        month=month,
        academic_year_id=academic_year_id,
        page=page,
        page_size=page_size,
    )
