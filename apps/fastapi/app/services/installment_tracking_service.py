from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException
from app.models.student import Student
from app.schemas.installment_tracking import StudentSearchItem


def search_students(
    *,
    db: Session,
    tenant_id: int,
    search: str = "",
    class_id: int | None = None,
    limit: int = 10,
) -> list[StudentSearchItem]:
    """
    Search for students by tenant, class, and search query.
    Returns active students ordered by name.
    """
    q = db.query(Student).filter(Student.tenant_id == tenant_id)
    
    if class_id:
        q = q.filter(Student.class_id == class_id)
    
    if search:
        s = f"%{search.strip()}%"
        q = q.filter(
            (Student.student_name.ilike(s))
            | (Student.student_code.ilike(s))
            | (Student.admission_no.ilike(s))
            | (Student.roll_no.ilike(s))
        )

    q = q.order_by(Student.student_name.asc()).limit(limit)
    
    out: list[StudentSearchItem] = []
    for st in q.all():
        # `Student` uses `class_` relationship (avoid legacy `class_model` name).
        cls = getattr(st, "class_", None) or getattr(st, "class_model", None)
        class_name = None
        if cls:
            name = getattr(cls, "name", None) or ""
            section = getattr(cls, "section", None)
            class_name = f"{name} - {section}" if section else (name or None)
        out.append(
            StudentSearchItem(
                id=st.id,
                student_name=st.student_name,
                student_code=st.student_code,
                admission_no=st.admission_no,
                roll_no=st.roll_no,
                class_id=st.class_id,
                class_name=class_name,
            )
        )
    return out


