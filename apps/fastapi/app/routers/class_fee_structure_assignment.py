from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, require_admin
from app.services.class_fee_structure_assignment_service import ClassFeeStructureAssignmentService
from app.schemas.class_fee_structure_assignment import (
    ClassFeeStructureAssignmentCreate,
    ClassFeeStructureAssignmentUpdate,
    ClassFeeStructureAssignmentResponse,
    ClassFeeStructureAssignmentListResponse,
    ClassFeeStructureAssignmentCreateResponse,
)
from app.core.exceptions import AppException
from app.models.user import User

router = APIRouter(prefix="/api/fees", tags=["Fees"])


# Direct endpoint for frontend expecting /api/fees/assign-fee-structure
from fastapi import Request

# --- Compatibility endpoints for /api/fees/assign-fee-structure ---
@router.get("/assign-fee-structure", response_model=ClassFeeStructureAssignmentListResponse)
def assign_fee_structure_list(
    academicYear: int = Query(None),
    class_: int = Query(None, alias="class"),
    search: str = Query(None),
    page: int = Query(1),
    limit: int = Query(20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    filters = {}
    if academicYear:
        filters["academicYear"] = academicYear
    if class_:
        filters["class"] = class_
    items, total = ClassFeeStructureAssignmentService.get_assignments(db, filters, page, limit)
    pagination = {"page": page, "limit": limit, "total": total}
    return {"success": True, "data": items, "pagination": pagination}

@router.post("/assign-fee-structure", response_model=ClassFeeStructureAssignmentCreateResponse)
def assign_fee_structure_create(
    payload: ClassFeeStructureAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.create_assignment(db, payload, current_user.id)
    return {"success": True, "message": "Fee structure assigned successfully", "data": assignment}

@router.get("/assign-fee-structure/{id}", response_model=ClassFeeStructureAssignmentResponse)
def assign_fee_structure_get_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.get_assignment_by_id(db, id)
    return assignment

@router.put("/assign-fee-structure/{id}", response_model=ClassFeeStructureAssignmentResponse)
def assign_fee_structure_update(
    id: int,
    payload: ClassFeeStructureAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.update_assignment(db, id, payload, current_user.id)
    return assignment

@router.patch("/assign-fee-structure/{id}/deactivate", response_model=ClassFeeStructureAssignmentResponse)
def assign_fee_structure_deactivate(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.deactivate_assignment(db, id, current_user.id)
    return assignment

@router.post("/class-fee-structure", response_model=ClassFeeStructureAssignmentCreateResponse)
def create_assignment(
    payload: ClassFeeStructureAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.create_assignment(db, payload, current_user.id)
    return {
        "success": True,
        "message": "Fee structure assigned successfully",
        "data": assignment,
    }

@router.get("/class-fee-structure", response_model=ClassFeeStructureAssignmentListResponse)
def get_assignments(
    academicYear: int = Query(None),
    class_: int = Query(None, alias="class"),
    search: str = Query(None),
    page: int = Query(1),
    limit: int = Query(20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    filters = {}
    if academicYear:
        filters["academicYear"] = academicYear
    if class_:
        filters["class"] = class_
    items, total = ClassFeeStructureAssignmentService.get_assignments(db, filters, page, limit)
    pagination = {"page": page, "limit": limit, "total": total}
    return {"success": True, "data": items, "pagination": pagination}

@router.put("/{id}", response_model=ClassFeeStructureAssignmentResponse)
def update_assignment(
    id: int,
    payload: ClassFeeStructureAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.update_assignment(db, id, payload, current_user.id)
    return assignment

@router.patch("/{id}/deactivate", response_model=ClassFeeStructureAssignmentResponse)
def deactivate_assignment(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    assignment = ClassFeeStructureAssignmentService.deactivate_assignment(db, id, current_user.id)
    return assignment
