"""Read access for PT_Project (reporting scope)."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.pt_timesheet import pt_project


def get_project_row(db: Session, project_id: int) -> tuple[int, int, str] | None:
    """Returns (Id, TenantId, ProjectName) or None."""
    row = db.execute(
        select(pt_project.c.Id, pt_project.c.TenantId, pt_project.c.ProjectName).where(pt_project.c.Id == project_id)
    ).first()
    if not row:
        return None
    return int(row[0]), int(row[1]), str(row[2])


def list_projects_for_reports(db: Session, *, tenant_id: int | None) -> list[dict]:
    """Tenant users: projects for that tenant. Platform (tenant_id None): all active projects."""
    stmt = select(pt_project.c.Id, pt_project.c.ProjectName).where(
        (pt_project.c.IsActive == True) | (pt_project.c.IsActive.is_(None))
    )
    if tenant_id is not None:
        stmt = stmt.where(pt_project.c.TenantId == tenant_id)
    stmt = stmt.order_by(pt_project.c.ProjectName.asc())
    rows = db.execute(stmt).all()
    return [{"id": int(r[0]), "label": str(r[1]).strip() if r[1] else f"Project {r[0]}"} for r in rows]
