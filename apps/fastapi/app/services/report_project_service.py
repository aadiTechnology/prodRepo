"""Validate PT_Project access for reporting (tenant from auth context)."""

from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.repositories.report_project_repository import get_project_row, list_projects_for_reports


def assert_can_access_pt_project(db: Session, project_id: int, user_tenant_id: int | None) -> None:
    row = get_project_row(db, project_id)
    if row is None:
        raise NotFoundException("Project", project_id)
    _pid, proj_tenant_id, _name = row
    if user_tenant_id is not None and int(proj_tenant_id) != int(user_tenant_id):
        raise ForbiddenException("Project is not in your organization")


def list_accessible_report_projects(db: Session, user_tenant_id: int | None) -> list[dict]:
    return list_projects_for_reports(db, tenant_id=user_tenant_id)
