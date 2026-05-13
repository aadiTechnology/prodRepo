from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_admin
from app.schemas.auth import CurrentUser
from app.schemas.teacher_assignment_schema import (
    AcademicYearOption,
    ClassOption,
    DivisionOption,
    TeacherOption,
    TeacherAssignmentAssignedMapResponse,
    TeacherAssignmentDetailResponse,
    TeacherAssignmentCheckResponse,
    TeacherAssignmentUpsertRequest,
    TeacherAssignmentUpsertResponse,
    TeacherAssignmentListResponse,
    TeacherAssignmentPagination,
)
from app.services import teacher_assignment_service


router = APIRouter(prefix="/api", tags=["Teacher Assignments"])


@router.get("/academic-years", response_model=list[AcademicYearOption])
def list_academic_years(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return teacher_assignment_service.get_academic_years(
        db=db,
        tenant_id=current_user.tenant_id,
    )


@router.get("/classes", response_model=list[ClassOption])
def list_classes(
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return teacher_assignment_service.get_classes(
        db=db,
        tenant_id=current_user.tenant_id,
        academic_year_id=academic_year_id,
    )


@router.get("/divisions", response_model=list[DivisionOption])
def list_divisions(
    class_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return teacher_assignment_service.get_divisions(
        db=db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
    )


@router.get("/teacher-assignment-teachers", response_model=list[TeacherOption])
def list_active_teachers(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    return teacher_assignment_service.get_teachers(
        db=db,
        tenant_id=current_user.tenant_id,
    )


@router.get("/teacher-assignments/assigned-map", response_model=TeacherAssignmentAssignedMapResponse)
def get_teacher_assignment_assigned_map(
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    result = teacher_assignment_service.get_assigned_map(
        db=db,
        tenant_id=current_user.tenant_id,
        academic_year_id=academic_year_id,
    )
    return TeacherAssignmentAssignedMapResponse(**result)


@router.get("/teacher-assignments", response_model=TeacherAssignmentListResponse)
def list_teacher_assignments(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    data, total = teacher_assignment_service.get_teacher_assignments(
        db=db,
        tenant_id=current_user.tenant_id,
        page=page,
        limit=limit,
        search=search,
    )

    return TeacherAssignmentListResponse(
        data=data,
        pagination=TeacherAssignmentPagination(
            page=page,
            limit=limit,
            total=total,
        ),
    )


@router.post("/teacher-assignments", response_model=TeacherAssignmentUpsertResponse)
def assign_teacher(
    payload: TeacherAssignmentUpsertRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    result = teacher_assignment_service.assign_teacher(
        db=db,
        tenant_id=current_user.tenant_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        class_division_id=(payload.class_division_id or (payload.class_division_ids or [None])[0]),
        teacher_id=payload.teacher_id,
        subject_id=payload.subject_id,
        class_division_ids=payload.class_division_ids,
    )
    if result["assignment_id"] is None:
        raise HTTPException(status_code=400, detail=result["message"])
    return TeacherAssignmentUpsertResponse(**result)


@router.put("/teacher-assignments/{assignment_id}", response_model=TeacherAssignmentUpsertResponse)
def update_teacher_assignment(
    assignment_id: int,
    payload: TeacherAssignmentUpsertRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    result = teacher_assignment_service.update_teacher_assignment(
        db=db,
        tenant_id=current_user.tenant_id,
        assignment_id=assignment_id,
        academic_year_id=payload.academic_year_id,
        class_id=payload.class_id,
        class_division_id=(payload.class_division_id or (payload.class_division_ids or [None])[0]),
        teacher_id=payload.teacher_id,
        subject_id=payload.subject_id,
        class_division_ids=payload.class_division_ids,
    )
    if result["assignment_id"] is None:
        raise HTTPException(status_code=400, detail=result["message"])
    return TeacherAssignmentUpsertResponse(**result)


@router.get("/teacher-assignments/check", response_model=TeacherAssignmentCheckResponse)
def check_teacher_assignment(
    class_id: int = Query(..., ge=1),
    division_id: int = Query(..., ge=1),
    academic_year_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    if current_user.tenant_id is None:
        return TeacherAssignmentCheckResponse(is_assigned=False, teacher_name=None)

    result = teacher_assignment_service.check_assignment(
        db=db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
        division_id=division_id,
        academic_year_id=academic_year_id,
    )
    return TeacherAssignmentCheckResponse(**result)


@router.get("/teacher-assignments/{assignment_id}", response_model=TeacherAssignmentDetailResponse)
def get_teacher_assignment_detail(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    result = teacher_assignment_service.get_teacher_assignment_by_id(
        db=db,
        tenant_id=current_user.tenant_id,
        assignment_id=assignment_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Teacher assignment not found")
    return TeacherAssignmentDetailResponse(**result)


@router.delete("/teacher-assignments/{assignment_id}")
def unassign_teacher(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    ok = teacher_assignment_service.unassign_teacher(
        db=db,
        tenant_id=current_user.tenant_id,
        assignment_id=assignment_id,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Unable to unassign teacher")
    return {"message": "Teacher assignment deleted successfully"}
