"""Dashboard router - Unified role-based landing stats endpoint."""
from datetime import datetime, date, timedelta
from typing import Any, Optional, List, cast as typing_cast
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text, func, and_, or_, case, extract, cast, Date
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_rbac_role_codes
from app.core.logging_config import get_logger
from app.schemas.auth import CurrentUser

from app.models.student import Student
from app.models.teacher import Teacher
from app.models.student_attendance import StudentAttendance
from app.models.student_invoice import StudentInvoice
from app.models.holiday import Holiday
from app.repositories import notice_repository
from app.services.notice_access import NoticeViewerContext
from app.services import notice_service
from app.models.homework import Homework
from app.repositories.homework_repository import _build_class_division_scope_filter
from app.services.homework_access import resolve_teacher_assignment_scopes
from app.models.lead import Lead, LeadStatus
from app.models.academic import SchoolClass, ClassDivision

from app.schemas.dashboard import (
    DashboardResponse,
    AdminDashboardResponse,
    TeacherDashboardResponse,
    StudentDashboardResponse,
    AttendanceOverview,
    LeadStatusCount,
    FeeCollectionSummary,
    ClassStudentCount,
    StudentSnapshot,
    RecentNoticeItem,
    AssignedClassInfo,
    AbsenteeDetail,
    WeeklyTrendPoint,
    StudentProfileInfo,
    StudentAttendanceSummary,
    StudentFeeStatus,
    StudentHomeworkSummary,
    TeacherHomeworkItem,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


# ─── Helper: fetch recent published notices + upcoming holidays ───────────────
def _fetch_recent_notices(
    db: Session,
    tenant_id: int,
    limit: int = 10,
    viewer_context: NoticeViewerContext | None = None,
) -> List[RecentNoticeItem]:
    """Fetch the most recent published notices AND upcoming/recent holidays for a tenant."""

    def _priority(notice_type: str) -> str:
        nt = (notice_type or "").upper()
        if any(k in nt for k in ("URGENT", "EMERGENCY", "ALERT")):
            return "High"
        if any(k in nt for k in ("ACADEMIC", "EXAM", "TEST")):
            return "Medium"
        return "Normal"

    result: List[RecentNoticeItem] = []

    # ── Notices ──────────────────────────────────────────────────────────────
    try:
        records = notice_repository.list_recent_published_notices(
            db,
            tenant_id=tenant_id,
            limit=limit,
            viewer_context=viewer_context,
        )
        for row in records:
            published_at = row.get("published_at")
            result.append(RecentNoticeItem(
                id=int(row["id"]),
                title=str(row["title"]),
                notice_type=str(row["notice_type"]),
                item_type="notice",
                published_at=(
                    published_at.strftime("%d %b %Y")
                    if published_at is not None and hasattr(published_at, "strftime")
                    else None
                ),
                priority=_priority(str(row.get("notice_type") or "")),
            ))
    except Exception as e:
        logger.warning(f"Could not fetch recent notices: {e}")

    # ── Holidays (recent 30 days + upcoming 60 days) ──────────────────────────
    try:
        today = date.today()
        window_start = today - timedelta(days=30)
        window_end = today + timedelta(days=60)
        holidays = (
            db.query(Holiday)
            .filter(Holiday.tenant_id == tenant_id)
            .filter(Holiday.is_active == True)
            .filter(Holiday.start_date >= window_start)
            .filter(Holiday.start_date <= window_end)
            .order_by(Holiday.start_date.desc())
            .limit(limit)
            .all()
        )
        for h in holidays:
            result.append(RecentNoticeItem(
                id=h.id,  # type: ignore[arg-type]
                title=h.holiday_name,  # type: ignore[arg-type]
                notice_type="HOLIDAY",
                item_type="holiday",
                published_at=(
                    h.start_date.strftime("%d %b %Y") if h.start_date is not None else None
                ),
                priority="Normal",
            ))
    except Exception as e:
        logger.warning(f"Could not fetch holidays for dashboard: {e}")

    # ── Merge: sort by date desc, most recent first ───────────────────────────
    def _sort_key(item: RecentNoticeItem) -> date:
        if item.published_at:
            try:
                return datetime.strptime(item.published_at, "%d %b %Y").date()
            except Exception:
                pass
        return date.min

    result.sort(key=_sort_key, reverse=True)
    return result[:limit]


# ─── Per-class gender + new-enrollment counts ─────────────────────────────────
def _class_gender_counts(db: Session, tenant_id: int, class_id: int, division_id: int, today: date):
    base = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.class_id == class_id)
        .filter(Student.class_division_id == division_id)
        .filter(Student.is_active == True)
    )
    boys = base.filter(func.lower(Student.gender).in_(["male", "boy", "m"])).count()
    girls = base.filter(func.lower(Student.gender).in_(["female", "girl", "f"])).count()
    new_this_month = (
        base
        .filter(extract("month", Student.created_at) == today.month)
        .filter(extract("year", Student.created_at) == today.year)
        .count()
    )
    return boys, girls, new_this_month


# ─── Endpoint ─────────────────────────────────────────────────────────────────
@router.get("/me", response_model=DashboardResponse)
def get_my_dashboard(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    # Per-section date overrides — take precedence over global start_date/end_date
    att_start_date: Optional[date] = None,
    att_end_date: Optional[date] = None,
    fee_start_date: Optional[date] = None,
    fee_end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    import time
    from sqlalchemy.exc import DBAPIError, OperationalError

    max_retries = 3
    retry_delay = 1.5

    for attempt in range(1, max_retries + 1):
        try:
            return _get_my_dashboard_impl(
                db, current_user, start_date, end_date,
                att_start_date=att_start_date, att_end_date=att_end_date,
                fee_start_date=fee_start_date, fee_end_date=fee_end_date,
            )
        except (OperationalError, DBAPIError) as e:
            logger.warning(f"Database transient error (attempt {attempt}/{max_retries}): {e}")
            if attempt == max_retries:
                logger.error("Max retries reached on dashboard fetch", exc_info=True)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Database connection timeout. Please try again.",
                )
            try:
                db.rollback()
            except Exception as rb_err:
                logger.warning(f"Failed to rollback: {rb_err}")
            time.sleep(retry_delay)



# ─── Fast card-specific endpoints ────────────────────────────────────────────

@router.get("/attendance", response_model=AttendanceOverview)
def get_attendance_card(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    class_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return only the attendance overview for the authenticated user's tenant.
    Used by the Attendance Overview card filter — no full dashboard reload needed."""
    tenant_id = current_user.tenant_id or 1
    rbac_role_codes = get_rbac_role_codes(db, current_user.id)

    is_teacher = any("teacher" in r for r in rbac_role_codes)

    try:
        overview = AttendanceOverview()
        clauses = []

        if is_teacher:
            # Teacher: query their assigned classes only
            teacher = (
                db.query(Teacher)
                .filter(Teacher.tenant_id == tenant_id)
                .filter((Teacher.user_id == current_user.id) | (Teacher.email == current_user.email))
                .filter(Teacher.is_deleted == False)
                .first()
            )
            if not teacher:
                return overview

            assignment_rows = _fetch_teacher_assignment_rows(
                db, tenant_id, int(teacher.id)  # type: ignore[arg-type]
            )
            if (
                not assignment_rows
                and teacher.class_id is not None
                and teacher.class_division_id is not None
            ):
                assignment_rows.append(_legacy_teacher_assignment_row(teacher))

            class_teacher_pairs: set[tuple[int, int]] = set()
            all_division_pairs: set[tuple[int, int]] = set()
            for row in assignment_rows:
                cid = int(row["class_id"])
                did = int(row["class_division_id"])
                all_division_pairs.add((cid, did))
                if row.get("subject_id") is None:
                    class_teacher_pairs.add((cid, did))

            assigned_pairs = list(class_teacher_pairs) if class_teacher_pairs else list(all_division_pairs)
            if not assigned_pairs:
                return overview

            if class_id:
                assigned_pairs = [pair for pair in assigned_pairs if pair[0] == class_id]
                if not assigned_pairs:
                    return overview

            clauses = [
                and_(StudentAttendance.class_id == cid, StudentAttendance.class_division_id == did)
                for cid, did in assigned_pairs
            ]
            base_q = (
                db.query(StudentAttendance.status, func.count(StudentAttendance.id))
                .filter(StudentAttendance.tenant_id == tenant_id)
                .filter(StudentAttendance.is_deleted == False)
                .filter(or_(*clauses))
            )
        else:
            # Admin: all students in tenant
            base_q = (
                db.query(StudentAttendance.status, func.count(StudentAttendance.id))
                .filter(StudentAttendance.tenant_id == tenant_id)
                .filter(StudentAttendance.is_deleted == False)
            )
            if class_id:
                base_q = base_q.filter(StudentAttendance.class_id == class_id)

        if start_date and end_date:
            att_counts = (
                base_q.filter(StudentAttendance.attendance_date.between(start_date, end_date))
                .group_by(StudentAttendance.status).all()
            )
        else:
            # Default: latest available date for this scope
            latest_q = (
                db.query(StudentAttendance.attendance_date)
                .filter(StudentAttendance.tenant_id == tenant_id)
                .filter(StudentAttendance.is_deleted == False)
            )
            if class_id:
                latest_q = latest_q.filter(StudentAttendance.class_id == class_id)
            elif is_teacher and clauses:
                latest_q = latest_q.filter(or_(*clauses))

            latest = latest_q.order_by(StudentAttendance.attendance_date.desc()).first()
            if latest:
                att_counts = (
                    base_q.filter(StudentAttendance.attendance_date == latest[0])
                    .group_by(StudentAttendance.status).all()
                )
            else:
                att_counts = []

        for sv, cnt in att_counts:
            sl = sv.lower()
            if "present" in sl:
                overview.present = cnt
            elif "absent" in sl:
                overview.absent = cnt
            elif "half" in sl:
                overview.half_day = cnt
            elif "leave" in sl:
                overview.leave = cnt

        return overview

    except Exception as e:
        logger.error(f"Attendance card error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load attendance data.",
        )


@router.get("/fees", response_model=FeeCollectionSummary)
def get_fees_card(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return only the fee collection summary for the authenticated user's tenant.
    Used by the Fee Collection Progress card filter — no full dashboard reload needed."""
    tenant_id = current_user.tenant_id or 1
    try:
        fee_q = (
            db.query(
                func.sum(StudentInvoice.total_amount),
                func.sum(StudentInvoice.paid_amount),
                func.sum(StudentInvoice.due_amount),
            )
            .filter(StudentInvoice.tenant_id == tenant_id)
        )
        if start_date and end_date:
            fee_q = fee_q.filter(cast(StudentInvoice.created_at, Date).between(start_date, end_date))
        fee_row = fee_q.first()
        return FeeCollectionSummary(
            total_fee=float(fee_row[0] or 0.0) if fee_row else 0.0,
            total_paid=float(fee_row[1] or 0.0) if fee_row else 0.0,
            total_balance=float(fee_row[2] or 0.0) if fee_row else 0.0,
        )
    except Exception as e:
        logger.error(f"Fees card error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load fee data.",
        )


def _build_admin_dashboard(
    db: Session,
    tenant_id: int,
    role_str: str,
    eff_att_start: Optional[date],
    eff_att_end: Optional[date],
    eff_fee_start: Optional[date],
    eff_fee_end: Optional[date],
) -> DashboardResponse:

    # 1. Attendance Overview — section-specific date range
    att_q = (
        db.query(StudentAttendance.status, func.count(StudentAttendance.id))
        .filter(StudentAttendance.tenant_id == tenant_id)
        .filter(StudentAttendance.is_deleted == False)
    )
    if eff_att_start and eff_att_end:
        att_counts = (
            att_q.filter(StudentAttendance.attendance_date.between(eff_att_start, eff_att_end))
            .group_by(StudentAttendance.status).all()
        )
    else:
        latest = (
            db.query(StudentAttendance.attendance_date)
            .filter(StudentAttendance.tenant_id == tenant_id)
            .filter(StudentAttendance.is_deleted == False)
            .order_by(StudentAttendance.attendance_date.desc()).first()
        )
        if latest:
            att_counts = (
                att_q.filter(StudentAttendance.attendance_date == latest[0])
                .group_by(StudentAttendance.status).all()
            )
        else:
            att_counts = []

    overview = AttendanceOverview()
    for sv, cnt in att_counts:
        sl = sv.lower()
        if "present" in sl:
            overview.present = cnt
        elif "absent" in sl:
            overview.absent = cnt
        elif "half" in sl:
            overview.half_day = cnt
        elif "leave" in sl:
            overview.leave = cnt

    # 2. Lead Pipeline
    lead_q = db.query(
        LeadStatus.name, LeadStatus.color_code, func.count(Lead.id)
    ).select_from(LeadStatus)

    lead_cond = [
        Lead.lead_status_id == LeadStatus.id,
        Lead.is_deleted == False,
        Lead.tenant_id == tenant_id,
    ]
    lead_counts = (
        lead_q.outerjoin(Lead, and_(*lead_cond))
        .filter(or_(LeadStatus.tenant_id == tenant_id, LeadStatus.tenant_id.is_(None)))
        .filter(LeadStatus.is_active == True)
        .group_by(LeadStatus.id, LeadStatus.name, LeadStatus.color_code, LeadStatus.sequence_order)
        .order_by(LeadStatus.sequence_order).all()
    )
    pipeline = [LeadStatusCount(status=n, color_code=c, count=cnt) for n, c, cnt in lead_counts]
    if not pipeline:
        pipeline = [
            LeadStatusCount(status="New", color_code="#2196F3", count=0),
            LeadStatusCount(status="Contacted", color_code="#FF9800", count=0),
            LeadStatusCount(status="Converted", color_code="#4CAF50", count=0),
            LeadStatusCount(status="Lost", color_code="#F44336", count=0),
        ]

    # 3. Fee Collection — section-specific date range
    fee_q = (
        db.query(
            func.sum(StudentInvoice.total_amount),
            func.sum(StudentInvoice.paid_amount),
            func.sum(StudentInvoice.due_amount),
        )
        .filter(StudentInvoice.tenant_id == tenant_id)
    )
    if eff_fee_start and eff_fee_end:
        fee_q = fee_q.filter(cast(StudentInvoice.created_at, Date).between(eff_fee_start, eff_fee_end))
    fee_row = fee_q.first()
    fee_col = FeeCollectionSummary(
        total_fee=float(fee_row[0] or 0.0) if fee_row else 0.0,
        total_paid=float(fee_row[1] or 0.0) if fee_row else 0.0,
        total_balance=float(fee_row[2] or 0.0) if fee_row else 0.0,
    )

    # 4. Student Snapshot — enrollment counts + gender breakdown + class breakdown
    active_students = (
        db.query(func.count(Student.id))
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.is_active == True)
        .scalar() or 0
    )
    total_classes = (
        db.query(func.count(SchoolClass.id))
        .filter(SchoolClass.tenant_id == tenant_id)
        .filter(SchoolClass.is_active == True)
        .filter(SchoolClass.is_deleted == False)
        .scalar() or 0
    )
    boys_count = (
        db.query(func.count(Student.id))
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.is_active == True)
        .filter(func.lower(Student.gender).in_(["male", "boy", "m"]))
        .scalar() or 0
    )
    girls_count = (
        db.query(func.count(Student.id))
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.is_active == True)
        .filter(func.lower(Student.gender).in_(["female", "girl", "f"]))
        .scalar() or 0
    )
    class_rows = (
        db.query(SchoolClass.name, func.count(Student.id))
        .join(Student, Student.class_id == SchoolClass.id)
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.is_active == True)
        .filter(SchoolClass.is_active == True)
        .group_by(SchoolClass.id, SchoolClass.name)
        .order_by(SchoolClass.name)
        .limit(12).all()
    )
    snapshot = StudentSnapshot(
        active_students=active_students,
        total_classes=total_classes,
        boys_count=boys_count,
        girls_count=girls_count,
        class_breakdown=[ClassStudentCount(class_name=n, count=c) for n, c in class_rows],
    )

    # 5. Recent Notices
    recent_notices = _fetch_recent_notices(db, tenant_id, limit=5)

    admin_data = AdminDashboardResponse(
        attendance_overview=overview,
        lead_pipeline=pipeline,
        fee_collection=fee_col,
        student_snapshot=snapshot,
        recent_notices=recent_notices,
    )
    return DashboardResponse(role=role_str, data=admin_data)

def _legacy_teacher_assignment_row(teacher: Teacher) -> dict[str, Any]:
    return {
        "class_id": int(teacher.class_id),  # type: ignore[arg-type]
        "class_division_id": int(teacher.class_division_id),  # type: ignore[arg-type]
        "subject_id": None,
        "subject_name": None,
    }


def _fetch_teacher_assignment_rows(
    db: Session,
    tenant_id: int,
    teacher_id: int,
) -> list[dict[str, Any]]:
    from app.services.teacher_assignment_service import _ensure_teacher_assignments_table

    rows: list[dict[str, Any]] = []
    try:
        _ensure_teacher_assignments_table(db)
        db_rows = db.execute(
            text(
                """
                SELECT
                    ta.class_id,
                    ta.class_division_id,
                    ta.subject_id,
                    s.name AS subject_name
                FROM teacher_assignments ta
                LEFT JOIN subjects s ON s.id = ta.subject_id AND s.is_deleted = 0
                WHERE ta.teacher_id = :tid
                  AND ta.tenant_id = :ten
                  AND ta.is_active = 1
                  AND ta.class_id IS NOT NULL
                  AND ta.class_division_id IS NOT NULL
                ORDER BY ta.class_id, ta.class_division_id, ta.subject_id
                """
            ),
            {"tid": teacher_id, "ten": tenant_id},
        ).mappings().all()
        rows = [dict(row) for row in db_rows]
    except Exception as e:
        logger.warning(f"Dynamic assignments error: {e}")
    return rows


def _build_teacher_assigned_infos(
    db: Session,
    tenant_id: int,
    today: date,
    assignment_rows: list[dict[str, Any]],
) -> list[AssignedClassInfo]:
    assigned_infos: list[AssignedClassInfo] = []
    seen_keys: set[tuple] = set()

    for row in assignment_rows:
        cid = int(row["class_id"])
        did = int(row["class_division_id"])
        subject_raw = row.get("subject_id")
        subject_id = int(subject_raw) if subject_raw is not None else None
        slot_key = (cid, did, subject_id)
        if slot_key in seen_keys:
            continue
        seen_keys.add(slot_key)

        cls = db.query(SchoolClass).filter(SchoolClass.id == cid).first()
        div = db.query(ClassDivision).filter(ClassDivision.id == did).first()
        if not (cls and div):
            continue

        stu_count = (
            db.query(func.count(Student.id))
            .filter(Student.tenant_id == tenant_id)
            .filter(Student.class_id == cid)
            .filter(Student.class_division_id == did)
            .filter(Student.is_active == True)
            .scalar()
            or 0
        )
        boys, girls, new_month = _class_gender_counts(db, tenant_id, cid, did, today)
        designation = "Class Teacher" if subject_id is None else "Subject Teacher"
        subject_name = row.get("subject_name")
        if subject_id is not None and subject_name is not None:
            subject_name = str(subject_name)

        assigned_infos.append(
            AssignedClassInfo(
                class_id=cid,
                class_name=str(cls.name) if cls.name is not None else "Unknown",
                division_id=did,
                division_name=str(div.division_name) if div.division_name is not None else "Unknown",
                student_count=stu_count,
                boys_count=boys,
                girls_count=girls,
                new_this_month=new_month,
                designation=designation,
                subject_id=subject_id,
                subject_name=subject_name if subject_id is not None else None,
            )
        )
    return assigned_infos


def _resolve_notice_viewer_context(
    db: Session,
    tenant_id: int,
    current_user: CurrentUser,
) -> NoticeViewerContext | None:
    try:
        return notice_service.get_viewer_context(
            db,
            tenant_id=tenant_id,
            user_id=current_user.id,
            email=current_user.email or "",
            legacy_role=current_user.role,
        )
    except Exception as e:
        logger.warning(f"Could not resolve notice viewer context: {e}")
        return None


def _build_teacher_dashboard(
    db: Session,
    tenant_id: int,
    today: date,
    current_user: CurrentUser,
    role_str: str,
    eff_att_start: Optional[date],
    eff_att_end: Optional[date],
) -> DashboardResponse:
    notice_viewer_context = _resolve_notice_viewer_context(db, tenant_id, current_user)
    teacher = (
        db.query(Teacher)
        .filter(Teacher.tenant_id == tenant_id)
        .filter((Teacher.user_id == current_user.id) | (Teacher.email == current_user.email))
        .filter(Teacher.is_deleted == False)
        .first()
    )
    if not teacher:
        return DashboardResponse(
            role=role_str,
            data=TeacherDashboardResponse(
                assigned_classes=[],
                today_attendance=AttendanceOverview(),
                absentees_list=[],
                weekly_trend=[WeeklyTrendPoint(date="Mon", present_rate=100.0)],
                recent_notices=_fetch_recent_notices(
                    db, tenant_id, viewer_context=notice_viewer_context
                ),
                dashboard_mode="subject_focused",
                can_mark_attendance=False,
            ),
        )

    teacher_id = int(teacher.id)  # type: ignore[arg-type]
    assignment_rows = list(_fetch_teacher_assignment_rows(db, tenant_id, teacher_id))

    # Legacy fallback when no rows in teacher_assignments
    if not assignment_rows and teacher.class_id is not None and teacher.class_division_id is not None:
        assignment_rows.append(_legacy_teacher_assignment_row(teacher))

    class_teacher_pairs: set[tuple[int, int]] = set()
    all_division_pairs: set[tuple[int, int]] = set()
    for row in assignment_rows:
        cid = int(row["class_id"])
        did = int(row["class_division_id"])
        all_division_pairs.add((cid, did))
        if row.get("subject_id") is None:
            class_teacher_pairs.add((cid, did))

    has_class_teacher_role = len(class_teacher_pairs) > 0
    dashboard_mode = "full" if has_class_teacher_role else "subject_focused"
    can_mark_attendance = has_class_teacher_role

    assigned_infos = _build_teacher_assigned_infos(db, tenant_id, today, assignment_rows)
    class_teacher_slot_count = sum(1 for i in assigned_infos if i.designation == "Class Teacher")
    subject_teacher_slot_count = sum(1 for i in assigned_infos if i.designation == "Subject Teacher")

    # Attendance: class teachers use homeroom divisions; subject-only teachers see their divisions (read-only)
    attendance_pairs = list(class_teacher_pairs) if class_teacher_pairs else list(all_division_pairs)

    # Attendance for assigned classes — section-specific date range
    att_counts = []
    absentees = []
    if attendance_pairs:
        clauses = [
            and_(StudentAttendance.class_id == cid, StudentAttendance.class_division_id == did)
            for cid, did in attendance_pairs
        ]
        base_att = (
            db.query(StudentAttendance.status, func.count(StudentAttendance.id))
            .filter(StudentAttendance.tenant_id == tenant_id)
            .filter(StudentAttendance.is_deleted == False)
            .filter(or_(*clauses))
        )
        absent_q = (
            db.query(StudentAttendance)
            .join(Student, Student.id == StudentAttendance.student_id)
            .filter(StudentAttendance.tenant_id == tenant_id)
            .filter(StudentAttendance.status == "Absent")
            .filter(StudentAttendance.is_deleted == False)
            .filter(or_(*clauses))
        )

        if eff_att_start and eff_att_end:
            att_counts = (
                base_att.filter(StudentAttendance.attendance_date.between(eff_att_start, eff_att_end))
                .group_by(StudentAttendance.status).all()
            )
            absent_records = absent_q.filter(
                StudentAttendance.attendance_date.between(eff_att_start, eff_att_end)
            ).all()
        else:
            latest = (
                db.query(StudentAttendance.attendance_date)
                .filter(StudentAttendance.tenant_id == tenant_id)
                .filter(StudentAttendance.is_deleted == False)
                .order_by(StudentAttendance.attendance_date.desc()).first()
            )
            if latest:
                target = latest[0]
                att_counts = (
                    base_att.filter(StudentAttendance.attendance_date == target)
                    .group_by(StudentAttendance.status).all()
                )
                absent_records = absent_q.filter(StudentAttendance.attendance_date == target).all()
            else:
                att_counts = []
                absent_records = []

        for rec in absent_records:
            c_m = db.query(SchoolClass).filter(SchoolClass.id == rec.class_id).first()
            d_m = db.query(ClassDivision).filter(ClassDivision.id == rec.class_division_id).first()
            absentees.append(AbsenteeDetail(
                student_id=rec.student_id,  # type: ignore[arg-type]
                student_name=str(rec.student.student_name) if rec.student and rec.student.student_name is not None else "Unknown",
                class_name=str(c_m.name) if c_m and c_m.name is not None else "Unknown",
                division_name=str(d_m.division_name) if d_m and d_m.division_name is not None else "Unknown",
                remarks=str(rec.remarks) if rec.remarks is not None else None,
            ))

    overview = AttendanceOverview()
    for sv, cnt in att_counts:
        sl = sv.lower()
        if "present" in sl:
            overview.present = cnt
        elif "absent" in sl:
            overview.absent = cnt
        elif "half" in sl:
            overview.half_day = cnt
        elif "leave" in sl:
            overview.leave = cnt

    # Weekly trend (last 5 days)
    weekly_points = []
    for i in range(4, -1, -1):
        day = today - timedelta(days=i)
        if attendance_pairs:
            clauses = [
                and_(StudentAttendance.class_id == cid, StudentAttendance.class_division_id == did)
                for cid, did in attendance_pairs
            ]
            row = (
                db.query(
                    func.sum(case(
                        (or_(StudentAttendance.status == "Present", StudentAttendance.status == "Half Day"), 1),
                        else_=0,
                    )),
                    func.count(StudentAttendance.id),
                )
                .filter(StudentAttendance.tenant_id == tenant_id)
                .filter(StudentAttendance.attendance_date == day)
                .filter(StudentAttendance.is_deleted == False)
                .filter(or_(*clauses))
                .first()
            )
            pres, tot = (row[0] or 0 if row else 0), (row[1] or 0 if row else 0)
            rate = (pres / tot * 100.0) if tot > 0 else 0.0
        else:
            rate = 0.0
        weekly_points.append(WeeklyTrendPoint(date=day.strftime("%a"), present_rate=round(rate, 1)))

    # Homework visible to teacher (class teacher = all subjects; subject teacher = their subjects)
    hw_items: list[TeacherHomeworkItem] = []
    try:
        hw_scopes = resolve_teacher_assignment_scopes(
            db, tenant_id=tenant_id, teacher_id=teacher_id
        )
        hw_query = (
            db.query(Homework)
            .filter(Homework.tenant_id == tenant_id)
            .filter(Homework.is_deleted == False)
        )
        if hw_scopes:
            hw_query = hw_query.filter(_build_class_division_scope_filter(hw_scopes))
        else:
            hw_query = hw_query.filter(Homework.teacher_id == teacher_id)

        hw_rows = hw_query.order_by(Homework.assigned_date.desc()).limit(8).all()
        for hw in hw_rows:
            hw_id = typing_cast(int, hw.id)
            hw_title = typing_cast(str, hw.title)
            hw_status = typing_cast(Optional[str], hw.status) or "Published"
            hw_assigned = typing_cast(Optional[date], hw.assigned_date)
            hw_submission = typing_cast(Optional[date], hw.submission_date)
            hw_items.append(TeacherHomeworkItem(
                id=hw_id,
                title=hw_title,
                subject_name=hw.subject.name if hw.subject else None,
                class_name=hw.class_model.name if hw.class_model else None,
                division_name=hw.division.division_name if hw.division else None,
                assigned_date=hw_assigned.strftime("%d %b %Y") if hw_assigned else None,
                submission_date=hw_submission.strftime("%d %b %Y") if hw_submission else None,
                status=hw_status,
            ))
    except Exception as e:
        logger.warning(f"Homework fetch error: {e}")

    teacher_data = TeacherDashboardResponse(
        assigned_classes=assigned_infos,
        today_attendance=overview,
        absentees_list=absentees,
        weekly_trend=weekly_points,
        recent_notices=_fetch_recent_notices(
            db, tenant_id, limit=5, viewer_context=notice_viewer_context
        ),
        recent_homework=hw_items,
        dashboard_mode=dashboard_mode,
        class_teacher_slot_count=class_teacher_slot_count,
        subject_teacher_slot_count=subject_teacher_slot_count,
        can_mark_attendance=can_mark_attendance,
    )
    return DashboardResponse(role=role_str, data=teacher_data)

def _build_student_dashboard(
    db: Session,
    tenant_id: int,
    today: date,
    current_user: CurrentUser,
    role_str: str,
) -> DashboardResponse:
    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id)
        .filter(Student.email == current_user.email)
        .filter(Student.is_active == True)
        .first()
    )
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active student profile not found for this account.",
        )

    # Resolve class / division names
    c_name = student.class_model.name if student.class_model else None
    d_name = None
    if student.class_division_id is not None:
        div_rec = db.query(ClassDivision).filter(ClassDivision.id == student.class_division_id).first()
        d_name = div_rec.division_name if div_rec else None

    # Parent phone — prefer LeadParent relationship, fall back to student's mobile
    parent_phone: Optional[str] = None
    try:
        if student.parent:
            parent_phone = getattr(student.parent, "mobile_number", None) or getattr(student.parent, "phone", None)
    except Exception:
        pass
    if not parent_phone:
        parent_phone = str(student.mobile_number) if student.mobile_number is not None else None

    # Admission date formatted string
    admission_date_str: Optional[str] = None
    if student.admission_date is not None:
        try:
            admission_date_str = student.admission_date.strftime("%d %b %Y")
        except Exception:
            admission_date_str = str(student.admission_date)

    profile_info = StudentProfileInfo(
        student_id=student.id,  # type: ignore[arg-type]
        student_name=str(student.student_name) if student.student_name is not None else "Unknown",
        roll_no=str(student.roll_no) if student.roll_no is not None else None,
        admission_no=str(student.admission_no) if student.admission_no is not None else None,
        class_name=str(c_name) if c_name is not None else None,
        division_name=str(d_name) if d_name is not None else None,
        photo_url=str(student.photo_url) if student.photo_url is not None else None,
        parent_name=str(student.parent_name) if student.parent_name is not None else None,
        parent_phone=parent_phone,
        admission_date=admission_date_str,
    )

    # Attendance summary (lifetime)
    att_counts = (
        db.query(StudentAttendance.status, func.count(StudentAttendance.id))
        .filter(StudentAttendance.tenant_id == tenant_id)
        .filter(StudentAttendance.student_id == student.id)
        .filter(StudentAttendance.is_deleted == False)
        .group_by(StudentAttendance.status).all()
    )
    pres, abs_v, half, lve = 0, 0, 0, 0
    for sv, cnt in att_counts:
        sl = sv.lower()
        if "present" in sl:
            pres = cnt
        elif "absent" in sl:
            abs_v = cnt
        elif "half" in sl:
            half = cnt
        elif "leave" in sl:
            lve = cnt
    total_att = pres + abs_v + half + lve
    pct = ((pres + half * 0.5) / total_att * 100.0) if total_att > 0 else 100.0
    att_summary = StudentAttendanceSummary(
        present=pres,
        absent=abs_v,
        half_day=half,
        leave=lve,
        percentage=round(pct, 1),
    )

    # Fee status
    fee_row = (
        db.query(
            func.sum(StudentInvoice.total_amount),
            func.sum(StudentInvoice.paid_amount),
            func.sum(StudentInvoice.due_amount),
        )
        .filter(StudentInvoice.tenant_id == tenant_id)
        .filter(StudentInvoice.student_id == student.id)
        .first()
    )
    total_fee = float(fee_row[0] or 0.0) if fee_row else 0.0
    total_paid = float(fee_row[1] or 0.0) if fee_row else 0.0
    total_balance = float(fee_row[2] or 0.0) if fee_row else 0.0

    # Next due date from unpaid invoices
    next_due_str: Optional[str] = None
    try:
        next_inv = (
            db.query(StudentInvoice)
            .filter(StudentInvoice.tenant_id == tenant_id)
            .filter(StudentInvoice.student_id == student.id)
            .filter(StudentInvoice.status != "Paid")
            .filter(StudentInvoice.due_amount > 0)
            .order_by(StudentInvoice.due_date.asc())
            .first()
        )
        if next_inv is not None and next_inv.due_date is not None:
            next_due_str = next_inv.due_date.strftime("%d %b %Y")
    except Exception as e:
        logger.warning(f"Could not fetch next due date: {e}")

    fee_status = StudentFeeStatus(
        total_fee=total_fee,
        total_paid=total_paid,
        total_balance=total_balance,
        is_overdue=total_balance > 0.0,
        next_due_date=next_due_str,
    )

    # Homework pending count (Published assignments not yet past submission date)
    homework_summary = StudentHomeworkSummary()
    if student.class_id is not None:
        try:
            hw_q = (
                db.query(func.count(Homework.id))
                .filter(Homework.tenant_id == tenant_id)
                .filter(Homework.class_id == student.class_id)
                .filter(Homework.status == "Published")
                .filter(Homework.is_deleted == False)
                .filter(Homework.submission_date >= today)
            )
            if student.class_division_id is not None:
                hw_q = hw_q.filter(
                    or_(
                        Homework.class_division_id == student.class_division_id,
                        Homework.class_division_id.is_(None),
                    )
                )
            hw_total = hw_q.scalar() or 0
            homework_summary = StudentHomeworkSummary(pending_count=hw_total, total_count=hw_total)
        except Exception as e:
            logger.warning(f"Could not fetch homework count: {e}")

    # Resolve class teacher
    class_teacher: Optional[str] = None
    if student.class_id is not None and student.class_division_id is not None:
        from app.services.teacher_assignment_service import _ensure_teacher_assignments_table
        try:
            _ensure_teacher_assignments_table(db)
            t_row = db.execute(
                text("""
                    SELECT t.full_name
                    FROM teacher_assignments ta
                    JOIN teachers t ON t.id = ta.teacher_id
                    WHERE ta.class_id = :cid AND ta.class_division_id = :did
                      AND ta.tenant_id = :ten AND ta.is_active = 1 AND t.is_deleted = 0
                """),
                {"cid": student.class_id, "did": student.class_division_id, "ten": tenant_id},
            ).first()
            if t_row:
                class_teacher = str(t_row[0]) if t_row[0] is not None else None
            else:
                legacy = (
                    db.query(Teacher)
                    .filter(Teacher.tenant_id == tenant_id)
                    .filter(Teacher.class_id == student.class_id)
                    .filter(Teacher.class_division_id == student.class_division_id)
                    .filter(Teacher.is_deleted == False)
                    .first()
                )
                class_teacher = str(legacy.full_name) if legacy and legacy.full_name is not None else None
        except Exception as e:
            logger.warning(f"Could not resolve class teacher: {e}")

    notice_viewer_context = _resolve_notice_viewer_context(db, tenant_id, current_user)

    student_data = StudentDashboardResponse(
        profile=profile_info,
        attendance=att_summary,
        fee_status=fee_status,
        class_teacher=class_teacher,
        homework=homework_summary,
        recent_notices=_fetch_recent_notices(
            db, tenant_id, limit=5, viewer_context=notice_viewer_context
        ),
    )
    return DashboardResponse(role=role_str, data=student_data)

def _get_my_dashboard_impl(
    db: Session,
    current_user: CurrentUser,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    att_start_date: Optional[date] = None,
    att_end_date: Optional[date] = None,
    fee_start_date: Optional[date] = None,
    fee_end_date: Optional[date] = None,
):
    """
    Get dynamic, tenant-scoped dashboard statistics based on the authenticated user's active role.
    """
    tenant_id = current_user.tenant_id or 1
    today = datetime.utcnow().date()

    # Resolve effective date ranges per section (section-specific > global fallback)
    eff_att_start: Optional[date] = att_start_date or start_date
    eff_att_end: Optional[date] = att_end_date or end_date
    eff_fee_start: Optional[date] = fee_start_date or start_date
    eff_fee_end: Optional[date] = fee_end_date or end_date

    # Determine active role via RBAC
    rbac_role_codes = get_rbac_role_codes(db, current_user.id)
    role_str = "STUDENT"

    is_system_admin = any("system_admin" in r or "super_admin" in r for r in rbac_role_codes)
    is_tenant_admin = any("tenant_admin" in r or "admin" in r for r in rbac_role_codes)
    is_teacher = any("teacher" in r for r in rbac_role_codes)
    is_student = any("student" in r for r in rbac_role_codes)

    if is_system_admin:
        role_str = "SYSTEM_ADMIN"
    elif is_tenant_admin:
        role_str = "TENANT_ADMIN"
    elif is_teacher:
        role_str = "TEACHER"
    elif is_student:
        role_str = "STUDENT"
    else:
        from app.models.user import UserRole
        if current_user.role == UserRole.SUPER_ADMIN:
            role_str = "SYSTEM_ADMIN"
        elif current_user.role in (UserRole.ADMIN, UserRole.TENANT_ADMIN):
            role_str = "TENANT_ADMIN"
        elif "teacher" in current_user.email.lower():
            role_str = "TEACHER"
        else:
            role_str = "STUDENT"

    logger.info(f"Dashboard for {current_user.email} → {role_str} (tenant {tenant_id})")

    try:
        if role_str in ("SYSTEM_ADMIN", "TENANT_ADMIN"):
            return _build_admin_dashboard(
                db, tenant_id, role_str,
                eff_att_start, eff_att_end, eff_fee_start, eff_fee_end,
            )
        if role_str == "TEACHER":
            return _build_teacher_dashboard(
                db, tenant_id, today, current_user, role_str,
                eff_att_start, eff_att_end,
            )
        return _build_student_dashboard(
            db, tenant_id, today, current_user, role_str,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dashboard compilation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while compiling your dashboard statistics.",
        )

