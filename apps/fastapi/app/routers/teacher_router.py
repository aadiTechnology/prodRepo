from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser, require_admin
from app.schemas.teacher_schema import TeacherCreate, TeacherUpdate, TeacherResponse, TeacherListResponse
from app.services import teacher_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/teachers", tags=["Teachers"])

def map_db_model_to_response(teacher) -> TeacherResponse:
    return TeacherResponse(
        id=teacher.id,
        tenant_id=teacher.tenant_id,
        teacher_code=teacher.teacher_code,
        full_name=teacher.full_name,
        date_of_birth=teacher.date_of_birth,
        gender=teacher.gender,
        mobile_number=teacher.mobile_number,
        email=teacher.email,
        qualification=teacher.qualification,
        experience_years=teacher.experience_years,
        photo_url=teacher.photo_url,
        class_id=teacher.class_id,
        class_division_id=teacher.class_division_id,
        is_active=teacher.is_active,
        address=teacher.address,
        city=teacher.city,
        state=teacher.state,
        pincode=teacher.pincode,
        created_at=teacher.created_at,
        updated_at=teacher.updated_at,
        class_name=teacher.class_model.name if teacher.class_model else None,
        division_name=teacher.division.division_name if teacher.division else None
    )

@router.get("/", response_model=TeacherListResponse)
async def list_teachers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    status: Optional[str] = None,
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """List teachers with filtering and pagination."""
    logger.debug(f"User {current_user.email} loading teachers for tenant {current_user.tenant_id}")
    db_teachers, total = teacher_service.get_all_teachers(
        db, 
        tenant_id=current_user.tenant_id,
        search=search,
        status=status,
        class_id=class_id,
        class_division_id=class_division_id,
        skip=skip,
        limit=limit
    )
    
    return TeacherListResponse(
        items=[map_db_model_to_response(t) for t in db_teachers],
        total=total
    )

@router.get("/{teacher_id}", response_model=TeacherResponse)
async def get_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get a specific teacher by ID."""
    db_teacher = teacher_service.get_teacher_by_id(db, teacher_id, current_user.tenant_id)
    return map_db_model_to_response(db_teacher)

@router.post("/", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    """Create a new teacher."""
    logger.info(f"User {current_user.email} creating teacher {payload.full_name}")
    db_teacher = teacher_service.create_teacher(db, payload, current_user.id, current_user.tenant_id)
    return map_db_model_to_response(db_teacher)

@router.put("/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    """Update a teacher."""
    logger.info(f"User {current_user.email} updating teacher {teacher_id}")
    db_teacher = teacher_service.update_teacher(db, teacher_id, payload, current_user.id, current_user.tenant_id)
    return map_db_model_to_response(db_teacher)

@router.patch("/{teacher_id}/status", response_model=TeacherResponse)
async def toggle_teacher_status(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    """Toggle a teacher's status (active/inactive)."""
    db_teacher = teacher_service.toggle_teacher_status(db, teacher_id, current_user.id, current_user.tenant_id)
    return map_db_model_to_response(db_teacher)

@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    """Delete a teacher (soft delete)."""
    teacher_service.soft_delete_teacher(db, teacher_id, current_user.id, current_user.tenant_id)
    return None
