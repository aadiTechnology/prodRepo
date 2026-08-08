from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Set, Tuple

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.dependencies import get_rbac_role_codes
from app.models.homework import Homework
from app.models.lead import LeadParent
from app.models.student import Student
from app.models.user import User, UserRole
from app.utils.homework_status import is_live_homework_status

STUDENT_ROLE_TOKENS = frozenset({"student", "students"})
PARENT_ROLE_TOKENS = frozenset({"parent", "parents", "guardian"})
ADMIN_ROLE_TOKENS = frozenset({
    "admin",
    "tenant_admin",
    "super_admin",
    "system_admin",
})


@dataclass(frozen=True)
class ClassDivisionScope:
    class_id: int
    class_division_id: Optional[int]
    # None = all subjects (class teacher or student/parent). Non-empty = subject teacher only.
    allowed_subject_ids: Optional[frozenset[int]] = None


@dataclass(frozen=True)
class HomeworkViewerContext:
    kind: str  # admin | teacher | student | parent
    scopes: Tuple[ClassDivisionScope, ...]
    published_only: bool


def _normalize_role(value: object | None) -> str:
    if value is None:
        return ""
    if hasattr(value, "value"):
        return str(value.value).strip().lower()  # type: ignore[union-attr]
    return str(value).strip().lower()


def _role_tokens(db: Session, user_id: int, legacy_role: object) -> Set[str]:
    tokens = {_normalize_role(legacy_role)}
    tokens.update(_normalize_role(code) for code in get_rbac_role_codes(db, user_id))
    return {t for t in tokens if t}


def is_student_user(db: Session, user_id: int, legacy_role: object) -> bool:
    return bool(_role_tokens(db, user_id, legacy_role) & STUDENT_ROLE_TOKENS)


def is_parent_user(db: Session, user_id: int, legacy_role: object) -> bool:
    return bool(_role_tokens(db, user_id, legacy_role) & PARENT_ROLE_TOKENS)


def is_admin_like(db: Session, user_id: int, legacy_role: object, tenant_id: int | None) -> bool:
    if legacy_role in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TENANT_ADMIN):
        return True
    if tenant_id is None:
        return True
    return bool(_role_tokens(db, user_id, legacy_role) & ADMIN_ROLE_TOKENS)


def resolve_teacher_assignment_scopes(
    db: Session,
    *,
    tenant_id: int,
    teacher_id: int,
) -> Tuple[ClassDivisionScope, ...]:
    sql = text(
        """
        SELECT ta.class_id, ta.class_division_id, ta.subject_id
        FROM teacher_assignments ta
        WHERE ta.tenant_id = :tenant_id
          AND ta.teacher_id = :teacher_id
          AND ta.is_active = 1
          AND ta.class_id IS NOT NULL
        """
    )
    rows = db.execute(
        sql, {"tenant_id": tenant_id, "teacher_id": teacher_id}
    ).mappings().all()

    # Legacy teachers.class_id / class_division_id when assignments table has no rows.
    if not rows:
        legacy = db.execute(
            text(
                """
                SELECT class_id, class_division_id
                FROM teachers
                WHERE id = :teacher_id
                  AND tenant_id = :tenant_id
                  AND is_deleted = 0
                  AND is_active = 1
                  AND class_id IS NOT NULL
                """
            ),
            {"tenant_id": tenant_id, "teacher_id": teacher_id},
        ).mappings().first()
        if legacy:
            div_raw = legacy["class_division_id"]
            return (
                ClassDivisionScope(
                    class_id=int(legacy["class_id"]),
                    class_division_id=int(div_raw) if div_raw is not None else None,
                    allowed_subject_ids=None,
                ),
            )
        return ()

    # Group by class + division. Class teacher row (subject_id NULL) => see all subjects.
    grouped: dict[tuple[int, int | None], set[int]] = {}
    class_teacher_keys: set[tuple[int, int | None]] = set()

    for row in rows:
        class_id = int(row["class_id"])
        div_raw = row["class_division_id"]
        div_id = int(div_raw) if div_raw is not None else None
        key = (class_id, div_id)
        subject_raw = row.get("subject_id")
        if subject_raw is None:
            class_teacher_keys.add(key)
            grouped[key] = set()
        else:
            grouped.setdefault(key, set()).add(int(subject_raw))

    scopes: list[ClassDivisionScope] = []
    for key in sorted(grouped.keys() | class_teacher_keys):
        class_id, div_id = key
        if key in class_teacher_keys:
            scopes.append(
                ClassDivisionScope(
                    class_id=class_id,
                    class_division_id=div_id,
                    allowed_subject_ids=None,
                )
            )
        else:
            subject_ids = grouped.get(key) or set()
            if not subject_ids:
                continue
            scopes.append(
                ClassDivisionScope(
                    class_id=class_id,
                    class_division_id=div_id,
                    allowed_subject_ids=frozenset(subject_ids),
                )
            )
    return tuple(scopes)


def resolve_user_for_student(db: Session, student: Student) -> User | None:
    """Resolve the login user linked to a student row (email / admission alias / name)."""
    if not student.tenant_id:
        return None

    tenant_id = student.tenant_id
    admission_key = (student.admission_no or student.student_code or str(student.id)).strip()
    candidates: list[str] = []

    if student.email:
        candidates.append(student.email.strip().lower())

    candidates.append(f"{admission_key.lower()}@student.local")

    if student.email and "@" in student.email:
        local, domain = student.email.rsplit("@", 1)
        tag = admission_key.lower().replace("+", "").replace("@", "")
        candidates.append(f"{local}+{tag}@{domain}".lower())

    for email in candidates:
        user = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
                User.is_active == True,  # noqa: E712
                User.email.ilike(email),
            )
            .first()
        )
        if user:
            return user

    if student.student_name:
        matches = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
                User.is_active == True,  # noqa: E712
                User.full_name.ilike(student.student_name.strip()),
            )
            .all()
        )
        if len(matches) == 1:
            return matches[0]

    return None


def resolve_user_id_for_student(db: Session, student: Student) -> int | None:
    user = resolve_user_for_student(db, student)
    return int(user.id) if user else None


def resolve_student_user_ids_for_notice_targets(
    db: Session,
    *,
    tenant_id: int,
    targets: list[dict],
) -> list[int]:
    """Map notice class/division targets to linked student login user ids."""
    if not targets:
        return []

    user_ids: set[int] = set()
    for target in targets:
        class_id = target.get("class_id")
        if class_id is None:
            continue
        query = db.query(Student).filter(
            Student.tenant_id == tenant_id,
            Student.is_active == True,  # noqa: E712
            Student.class_id == int(class_id),
        )
        division_id = target.get("division_id")
        if division_id is not None:
            query = query.filter(Student.class_division_id == int(division_id))
        for student in query.all():
            uid = resolve_user_id_for_student(db, student)
            if uid is not None:
                user_ids.add(uid)
    return sorted(user_ids)


def _resolve_student_record(db: Session, *, tenant_id: int, user_id: int, email: str) -> Student | None:
    from sqlalchemy import or_

    email_norm = email.strip().lower()
    student = (
        db.query(Student)
        .filter(
            Student.tenant_id == tenant_id,
            Student.is_active == True,  # noqa: E712
            Student.email.isnot(None),
        )
        .filter(Student.email.ilike(email_norm))
        .first()
    )
    if student:
        return student

    user = db.query(User).filter(User.id == user_id).first()
    if user and user.phone_number:
        phone = str(user.phone_number).strip()
        if phone:
            by_phone = (
                db.query(Student)
                .filter(
                    Student.tenant_id == tenant_id,
                    Student.is_active == True,  # noqa: E712
                    Student.mobile_number == phone,
                )
                .first()
            )
            if by_phone:
                return by_phone

    if "@" in email_norm and "+" in email_norm.split("@", 1)[0]:
        local_part, _domain = email_norm.rsplit("@", 1)
        admission_tag = local_part.split("+", 1)[1]
        if admission_tag:
            tagged_student = (
                db.query(Student)
                .filter(
                    Student.tenant_id == tenant_id,
                    Student.is_active == True,  # noqa: E712
                    or_(
                        Student.admission_no.ilike(admission_tag),
                        Student.student_code.ilike(admission_tag),
                    ),
                )
                .first()
            )
            if tagged_student:
                return tagged_student

    if not email_norm.endswith("@student.local"):
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.full_name:
            name_match = (
                db.query(Student)
                .filter(
                    Student.tenant_id == tenant_id,
                    Student.is_active == True,  # noqa: E712
                    Student.student_name.ilike(user.full_name.strip())
                )
                .first()
            )
            if name_match:
                return name_match
        return None

    local_part = email_norm.split("@", 1)[0]
    if not local_part:
        return None

    return (
        db.query(Student)
        .filter(
            Student.tenant_id == tenant_id,
            Student.is_active == True,  # noqa: E712
            or_(
                Student.student_code.ilike(local_part),
                Student.admission_no.ilike(local_part),
            ),
        )
        .first()
    )


def _resolve_parent_students(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
) -> List[Student]:
    from sqlalchemy import or_

    user = db.query(User).filter(User.id == user_id).first()
    phone = (user.phone_number if user else None) or None
    full_name = (user.full_name if user else None) or None

    identity_filters = [LeadParent.email.ilike(email.strip())]
    if phone:
        identity_filters.append(LeadParent.mobile_number == phone)
        identity_filters.append(LeadParent.alternate_mobile == phone)
    if full_name:
        identity_filters.append(LeadParent.parent_name.ilike(full_name.strip()))

    parent = (
        db.query(LeadParent)
        .filter(
            LeadParent.tenant_id == tenant_id,
            LeadParent.is_deleted == False,  # noqa: E712
            or_(*identity_filters),
        )
        .first()
    )
    if not parent:
        return []

    return (
        db.query(Student)
        .filter(
            Student.tenant_id == tenant_id,
            Student.parent_id == parent.id,
            Student.is_active == True,  # noqa: E712
        )
        .all()
    )


def _scopes_from_students(students: List[Student]) -> Tuple[ClassDivisionScope, ...]:
    seen: set[tuple[int, int | None]] = set()
    scopes: list[ClassDivisionScope] = []
    for student in students:
        if student.class_id is None:
            continue
        div_id = int(student.class_division_id) if student.class_division_id else None
        key = (int(student.class_id), div_id)
        if key in seen:
            continue
        seen.add(key)
        scopes.append(ClassDivisionScope(class_id=key[0], class_division_id=div_id))
    return tuple(scopes)


def resolve_homework_viewer_context(
    db: Session,
    *,
    tenant_id: int,
    user_id: int,
    email: str,
    legacy_role: object,
    teacher_id: Optional[int],
) -> HomeworkViewerContext:
    # Admin-like first (incl. TENANT_ADMIN), even if also linked as a teacher —
    # otherwise draft + published tenant-wide list is narrowed to teacher scope.
    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return HomeworkViewerContext(kind="admin", scopes=(), published_only=False)

    if teacher_id is not None:
        scopes = resolve_teacher_assignment_scopes(
            db, tenant_id=tenant_id, teacher_id=teacher_id
        )
        return HomeworkViewerContext(kind="teacher", scopes=scopes, published_only=False)

    if is_student_user(db, user_id, legacy_role):
        student = _resolve_student_record(db, tenant_id=tenant_id, user_id=user_id, email=email)
        scopes = _scopes_from_students([student]) if student else ()
        return HomeworkViewerContext(kind="student", scopes=scopes, published_only=True)

    if is_parent_user(db, user_id, legacy_role):
        children = _resolve_parent_students(
            db, tenant_id=tenant_id, user_id=user_id, email=email
        )
        return HomeworkViewerContext(
            kind="parent",
            scopes=_scopes_from_students(children),
            published_only=True,
        )

    return HomeworkViewerContext(kind="admin", scopes=(), published_only=False)


def _homework_matches_scope(hw: Homework, scope: ClassDivisionScope) -> bool:
    if hw.class_id != scope.class_id:
        return False
    if scope.class_division_id is None:
        if hw.class_division_id is not None:
            return False
    elif hw.class_division_id is None or hw.class_division_id != scope.class_division_id:
        return False
    if scope.allowed_subject_ids is None:
        return True
    if hw.subject_id is None:
        return False
    return int(hw.subject_id) in scope.allowed_subject_ids


def homework_visible_to_viewer(hw: Homework, ctx: HomeworkViewerContext) -> bool:
    if ctx.kind == "admin":
        return True
    if ctx.published_only and not is_live_homework_status(hw.status):
        return False
    if not ctx.scopes:
        return False
    return any(_homework_matches_scope(hw, scope) for scope in ctx.scopes)
