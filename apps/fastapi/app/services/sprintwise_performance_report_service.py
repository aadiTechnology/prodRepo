"""Sprintwise billable vs page effort comparison — orchestration."""

from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.timesheet_report_repository import (
    fetch_owner_labels,
    fetch_sprint_labels,
    fetch_sprintwise_efforts_for_category,
    fetch_sprintwise_total_efforts,
    resolve_task_category_id_by_name,
)
from app.schemas.sprintwise_performance_report_schema import (
    SprintwisePerformanceReportResponse,
    SprintwiseReportSlice,
    SprintwiseSprintTotals,
)

_BILLABLE = "Billable"
_PAGE_DEVELOPMENT = "PageDevelopment"


def _merge_maps(target: dict[int, Decimal], source: dict[int, Decimal]) -> None:
    for sid, val in source.items():
        target[sid] = target.get(sid, Decimal("0")) + val


def _maps_to_sprints(
    db: Session,
    bill_map: dict[int, Decimal],
    page_map: dict[int, Decimal],
    total_map: dict[int, Decimal],
) -> list[SprintwiseSprintTotals]:
    sprint_ids = sorted(set(bill_map.keys()) | set(page_map.keys()) | set(total_map.keys()))
    if not sprint_ids:
        return []
    labels = fetch_sprint_labels(db, sprint_ids)
    out: list[SprintwiseSprintTotals] = []
    for sid in sprint_ids:
        b = bill_map.get(sid, Decimal("0"))
        p = page_map.get(sid, Decimal("0"))
        t = total_map.get(sid, Decimal("0"))
        out.append(
            SprintwiseSprintTotals(
                sprint_id=sid,
                sprint_label=labels.get(sid, f"Sprint {sid}"),
                billable_efforts=float(b),
                page_efforts=float(p),
                total_efforts=float(t),
            )
        )
    return out


def get_sprintwise_performance_report(
    db: Session,
    *,
    member_ids: list[int] | None,
) -> SprintwisePerformanceReportResponse:
    billable_cat_id = resolve_task_category_id_by_name(db, _BILLABLE)
    page_cat_id = resolve_task_category_id_by_name(db, _PAGE_DEVELOPMENT)

    def fetch_maps(owner_filter: list[int] | None) -> tuple[dict[int, Decimal], dict[int, Decimal]]:
        bill_m: dict[int, Decimal] = {}
        page_m: dict[int, Decimal] = {}
        if billable_cat_id is not None:
            bill_m = fetch_sprintwise_efforts_for_category(
                db, category_id=billable_cat_id, owner_ids=owner_filter
            )
        if page_cat_id is not None:
            page_m = fetch_sprintwise_efforts_for_category(
                db, category_id=page_cat_id, owner_ids=owner_filter
            )
        return bill_m, page_m

    owner_filter: list[int] | None = None
    if member_ids:
        owner_filter = list(dict.fromkeys(member_ids))

    if not owner_filter:
        bill_map, page_map = fetch_maps(None)
        total_map = fetch_sprintwise_total_efforts(db, owner_ids=None)
        sprints = _maps_to_sprints(db, bill_map, page_map, total_map)
        return SprintwisePerformanceReportResponse(
            slices=[
                SprintwiseReportSlice(
                    slice_key="all",
                    label="All members",
                    owner_id=None,
                    sprints=sprints,
                )
            ]
        )

    if len(owner_filter) == 1:
        oid = owner_filter[0]
        bill_map, page_map = fetch_maps([oid])
        total_map = fetch_sprintwise_total_efforts(db, owner_ids=[oid])
        sprints = _maps_to_sprints(db, bill_map, page_map, total_map)
        labels_o = fetch_owner_labels(db, [oid])
        return SprintwisePerformanceReportResponse(
            slices=[
                SprintwiseReportSlice(
                    slice_key=f"member:{oid}",
                    label=labels_o.get(oid, f"Owner {oid}"),
                    owner_id=oid,
                    sprints=sprints,
                )
            ]
        )

    owner_labels = fetch_owner_labels(db, owner_filter)
    slices: list[SprintwiseReportSlice] = []
    combined_bill: dict[int, Decimal] = {}
    combined_page: dict[int, Decimal] = {}
    combined_total: dict[int, Decimal] = {}

    for oid in owner_filter:
        bill_map, page_map = fetch_maps([oid])
        total_map = fetch_sprintwise_total_efforts(db, owner_ids=[oid])
        _merge_maps(combined_bill, bill_map)
        _merge_maps(combined_page, page_map)
        _merge_maps(combined_total, total_map)
        member_sprints = _maps_to_sprints(db, bill_map, page_map, total_map)
        slices.append(
            SprintwiseReportSlice(
                slice_key=f"member:{oid}",
                label=owner_labels.get(oid, f"Owner {oid}"),
                owner_id=oid,
                sprints=member_sprints,
            )
        )

    total_sprints = _maps_to_sprints(db, combined_bill, combined_page, combined_total)
    slices.append(
        SprintwiseReportSlice(
            slice_key="total",
            label="Total",
            owner_id=None,
            sprints=total_sprints,
        )
    )
    return SprintwisePerformanceReportResponse(slices=slices)
