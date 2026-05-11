from fastapi import APIRouter, Depends, Query, Path
from sqlalchemy.orm import Session
from typing import Optional, Any
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.schemas.subject_schema import SubjectCreate, SubjectUpdate, SubjectResponse, SubjectListResponse
from app.services.subject_service import SubjectService
import math

router = APIRouter(
    prefix="/api/subjects",
    tags=["Subjects"],
    responses={404: {"description": "Not found"}},
)

@router.get("", response_model=SubjectListResponse)
def get_subjects(
    skip: int = Query(0, ge=0, description="Skip the first N items"),
    limit: int = Query(100, ge=1, le=1000, description="Limit the number of items returned"),
    search: Optional[str] = Query(None, description="Search by subject name or code"),
    class_id: Optional[int] = Query(None, description="Filter by class ID"),
    academic_year_id: Optional[int] = Query(None, description="Filter by academic year ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Get a paginated list of subjects.
    """
    subjects, total = SubjectService.get_subjects(
        db=db,
        tenant_id=current_user.tenant_id,
        skip=skip,
        limit=limit,
        search=search,
        class_id=class_id,
        academic_year_id=academic_year_id,
        is_active=is_active
    )
    
    pages = math.ceil(total / limit) if limit > 0 else 0
    
    # Convert ORM objects to Pydantic models
    subject_responses = [SubjectResponse.model_validate(subject, from_attributes=True) for subject in subjects]
    
    return SubjectListResponse(
        data=subject_responses,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
        pages=pages
    )

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(
    subject_id: int = Path(..., description="The ID of the subject to retrieve"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Get a specific subject by ID.
    """
    subject = SubjectService.get_subject(db=db, tenant_id=current_user.tenant_id, subject_id=subject_id)
    if not subject:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")
    return SubjectResponse.model_validate(subject, from_attributes=True)

@router.post("", response_model=SubjectResponse, status_code=201)
def create_subject(
    subject_in: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Create a new subject.
    """
    subject = SubjectService.create_subject(
        db=db, 
        tenant_id=current_user.tenant_id, 
        user_id=current_user.id, 
        subject=subject_in
    )
    return SubjectResponse.model_validate(subject, from_attributes=True)

@router.put("/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_in: SubjectUpdate,
    subject_id: int = Path(..., description="The ID of the subject to update"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Update a subject by ID.
    """
    subject = SubjectService.update_subject(
        db=db, 
        tenant_id=current_user.tenant_id, 
        user_id=current_user.id, 
        subject_id=subject_id, 
        update_data=subject_in
    )
    return SubjectResponse.model_validate(subject, from_attributes=True)

@router.delete("/{subject_id}", status_code=200)
def delete_subject(
    subject_id: int = Path(..., description="The ID of the subject to delete"),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Delete a subject by ID.
    """
    return SubjectService.delete_subject(
        db=db, 
        tenant_id=current_user.tenant_id, 
        user_id=current_user.id, 
        subject_id=subject_id
    )
