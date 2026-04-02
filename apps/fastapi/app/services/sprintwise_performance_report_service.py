"""Sprintwise billable vs page effort comparison — orchestration."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.timesheet_report_repository import (
    fetch_sprint_labels,
    fetch_sprintwise_efforts_for_category,
    resolve_task_category_id_by_name,
)
from app.schemas.sprintwise_performance_report_schema import (
    SprintwisePerformanceReportResponse,
    SprintwiseSprintTotals,
)

_BILLABLE = "Billable"
_PAGE_DEVELOPMENT = "PageDevelopment"


def get_sprintwise_performance_report(
    db: Session,
    *,
    member_ids: list[int] | None,
) -> SprintwisePerformanceReportResponse:
    owner_filter: list[int] | None = None
    if member_ids:
        owner_filter = list(dict.fromkeys(member_ids))

    billable_cat_id = resolve_task_category_id_by_name(db, _BILLABLE)
    page_cat_id = resolve_task_category_id_by_name(db, _PAGE_DEVELOPMENT)

    bill_map = (
        fetch_sprintwise_efforts_for_category(db, category_id=billable_cat_id, owner_ids=owner_filter)
        if billable_cat_id is not None
        else {}
    )
    page_map = (
        fetch_sprintwise_efforts_for_category(db, category_id=page_cat_id, owner_ids=owner_filter)
        if page_cat_id is not None
        else {}
    )

    sprint_ids = sorted(set(bill_map.keys()) | set(page_map.keys()))
    if not sprint_ids:
        return SprintwisePerformanceReportResponse(sprints=[])

    labels = fetch_sprint_labels(db, sprint_ids)
    sprints: list[SprintwiseSprintTotals] = []
    for sid in sprint_ids:
        b = bill_map.get(sid, Decimal("0"))
        p = page_map.get(sid, Decimal("0"))
        sprints.append(
            SprintwiseSprintTotals(
                sprint_id=sid,
                sprint_label=labels.get(sid, f"Sprint {sid}"),
                billable_efforts=float(b),
                page_efforts=float(p),
            )
        )
    return SprintwisePerformanceReportResponse(sprints=sprints)
