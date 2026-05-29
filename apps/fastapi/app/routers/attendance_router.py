from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.attendance_service import AttendanceService
from app.services.attendance_access import (
    assert_teacher_class_division_access,
    is_admin_like,
    is_teacher_like,
)
from app.services import teacher_service
from app.schemas.attendance_schema import (
    MarkAttendanceRequest,
    AttendanceListResponse,
    AttendanceReportResponse,
    AttendanceReportSummary,
)
from app.models.student import Student

router = APIRouter(prefix="/attendance", tags=["Attendance"])

STUDENT_REPORT_MAX_LIMIT = 500


def _is_student_role(current_user, db: Session) -> bool:
    from app.core.dependencies import get_rbac_role_codes

    role_codes = get_rbac_role_codes(db, current_user.id)
    if "student" in role_codes:
        return True
    legacy_role = str(getattr(current_user, "role", "") or "").upper()
    return legacy_role == "STUDENT"


def _resolve_student_for_user(db: Session, current_user) -> Optional[Student]:
    email = (current_user.email or "").strip().lower()
    if not email:
        return None

    from sqlalchemy import func

    student = (
        db.query(Student)
        .filter(
            Student.tenant_id == current_user.tenant_id,
            Student.is_active == True,  # noqa: E712
            func.lower(func.coalesce(Student.email, "")) == email,
        )
        .first()
    )
    if student:
        return student

    if email.endswith("@student.local"):
        local_part = email.split("@", 1)[0]
        return (
            db.query(Student)
            .filter(
                Student.tenant_id == current_user.tenant_id,
                Student.is_active == True,  # noqa: E712
                or_(
                    Student.admission_no == local_part,
                    Student.student_code == local_part,
                ),
            )
            .first()
        )
    return None


def _apply_teacher_report_scope(
    db: Session,
    current_user,
    class_id: Optional[int],
    division_id: Optional[int],
    academic_year_id: Optional[int] = None,
) -> tuple[Optional[int], Optional[int]]:
    """Validate or default class/division for teacher report requests."""
    teacher = teacher_service.resolve_teacher_for_user(
        db,
        current_user.tenant_id,
        current_user.id,
        getattr(current_user, "email", None),
    )
    if not teacher:
        return class_id, division_id

    pairs = teacher_service.get_teacher_class_division_pairs(
        db,
        current_user.tenant_id,
        teacher.id,
        academic_year_id,
    )
    if not pairs:
        return None, None

    if class_id and division_id:
        if (class_id, division_id) not in pairs:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this class and division",
            )
        return class_id, division_id

    if len(pairs) == 1:
        return pairs[0][0], pairs[0][1]

    return class_id, division_id


@router.get("", response_model=AttendanceListResponse)
def get_attendance(
    attendance_date: date,
    class_id: int,
    division_id: int,
    academic_year_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        assert_teacher_class_division_access(
            db, current_user, class_id, division_id, academic_year_id
        )
        service = AttendanceService(db)
        return service.get_attendance_grid(
            attendance_date, class_id, division_id, current_user.tenant_id
        )
    except HTTPException:
        raise
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch attendance data")


@router.post("/mark")
def mark_attendance(
    req: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        assert_teacher_class_division_access(
            db,
            current_user,
            req.class_id,
            req.class_division_id,
            req.academic_year_id,
        )
        service = AttendanceService(db)
        return service.mark_attendance(req, current_user)
    except HTTPException:
        raise
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to save attendance records")


@router.get("/report", response_model=AttendanceReportResponse)
def get_attendance_report(
    from_date: date,
    to_date: date,
    class_id: Optional[int] = Query(None),
    division_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    academic_year_id: Optional[int] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        if _is_student_role(current_user, db):
            student = _resolve_student_for_user(db, current_user)
            if not student:
                raise HTTPException(
                    status_code=404,
                    detail="Student profile not found for this account",
                )
            student_id = student.id
            class_id = student.class_id
            division_id = student.class_division_id
            limit = min(max(limit, 1), STUDENT_REPORT_MAX_LIMIT)
            offset = 0
        elif is_teacher_like(current_user, db) and not is_admin_like(current_user, db):
            class_id, division_id = _apply_teacher_report_scope(
                db, current_user, class_id, division_id, academic_year_id
            )
            if not class_id or not division_id:
                return AttendanceReportResponse(
                    records=[],
                    summary=AttendanceReportSummary(
                        total_present=0,
                        total_absent=0,
                        total_half_day=0,
                        total_leave=0,
                    ),
                    total_count=0,
                )

        service = AttendanceService(db)
        return service.get_attendance_report(
            current_user.tenant_id,
            from_date,
            to_date,
            class_id,
            division_id,
            student_id,
            limit,
            offset,
        )
    except HTTPException:
        raise
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to generate attendance report")
