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

    # Fallback to matching by user full_name
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

    if not email_norm.endswith("@student.local"):
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
                Student.student_code == local_part,
                Student.admission_no == local_part,
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
    if teacher_id is not None:
        scopes = resolve_teacher_assignment_scopes(
            db, tenant_id=tenant_id, teacher_id=teacher_id
        )
        return HomeworkViewerContext(kind="teacher", scopes=scopes, published_only=False)

    if is_admin_like(db, user_id, legacy_role, tenant_id):
        return HomeworkViewerContext(kind="admin", scopes=(), published_only=False)

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
    if ctx.published_only and hw.status != "Published":
        return False
    if not ctx.scopes:
        return False
    return any(_homework_matches_scope(hw, scope) for scope in ctx.scopes)
