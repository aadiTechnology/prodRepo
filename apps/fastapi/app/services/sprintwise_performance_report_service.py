"""Sprintwise billable vs productive (page) vs total effort — orchestration."""

from collections import defaultdict
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.timesheet_report_repository import (
    fetch_member_sprint_metric_pairs,
    fetch_owner_labels,
    fetch_sprint_ids_ordered,
    fetch_sprint_labels,
    fetch_sprintwise_efforts_for_category,
    fetch_sprintwise_total_efforts,
    resolve_task_category_id_by_name,
)
from app.services.report_project_service import assert_can_access_pt_project
from app.schemas.sprintwise_performance_report_schema import (
    MemberSprintMetrics,
    OverallMemberSummary,
    SprintMemberDetailBlock,
    SprintwisePerformanceReportResponse,
    SprintwiseReportSlice,
    SprintwiseSprintTotals,
)

_BILLABLE = "Billable"
_PAGE_DEVELOPMENT = "PageDevelopment"


def _merge_maps(target: dict[int, Decimal], source: dict[int, Decimal]) -> None:
    for sid, val in source.items():
        target[sid] = target.get(sid, Decimal("0")) + val


def _resolve_sprint_order(
    db: Session, project_id: int, key_set: set[int], sprint_filter: list[int] | None
) -> list[int]:
    if not key_set:
        return []
    if sprint_filter:
        return [s for s in sprint_filter if s in key_set]
    full = fetch_sprint_ids_ordered(db, project_id)
    return [s for s in full if s in key_set]


def _maps_to_sprints(
    db: Session,
    bill_map: dict[int, Decimal],
    page_map: dict[int, Decimal],
    total_map: dict[int, Decimal],
    sprint_order: list[int],
) -> list[SprintwiseSprintTotals]:
    if not sprint_order:
        return []
    labels = fetch_sprint_labels(db, sprint_order)
    out: list[SprintwiseSprintTotals] = []
    for sid in sprint_order:
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


def _member_metric(oid: int, label: str, b: Decimal, p: Decimal, t: Decimal) -> MemberSprintMetrics:
    return MemberSprintMetrics(
        owner_id=oid,
        owner_label=label,
        billable_efforts=float(b),
        productive_efforts=float(p),
        total_efforts=float(t),
    )


def _build_detail_and_overall(
    db: Session,
    *,
    pair_totals: dict[tuple[int, int], tuple[Decimal, Decimal, Decimal]],
    sprint_order: list[int],
    owner_labels: dict[int, str],
    include_detail: bool,
) -> tuple[list[SprintMemberDetailBlock], OverallMemberSummary]:
    per_owner_totals: dict[int, tuple[Decimal, Decimal, Decimal]] = defaultdict(
        lambda: (Decimal("0"), Decimal("0"), Decimal("0"))
    )
    for (oid, _sid), (b, p, t) in pair_totals.items():
        ob, op, ot = per_owner_totals[oid]
        per_owner_totals[oid] = (ob + b, op + p, ot + t)

    summary_members: list[MemberSprintMetrics] = []
    for oid in sorted(per_owner_totals.keys(), key=lambda o: owner_labels.get(o, str(o)).lower()):
        b, p, t = per_owner_totals[oid]
        summary_members.append(
            _member_metric(oid, owner_labels.get(oid, f"Owner {oid}"), b, p, t)
        )
    overall = OverallMemberSummary(members=summary_members)

    if not include_detail or not sprint_order:
        return [], overall

    detail: list[SprintMemberDetailBlock] = []
    labels_map = fetch_sprint_labels(db, sprint_order)
    for sid in sprint_order:
        oids = {oid for (oid, s) in pair_totals.keys() if s == sid}
        members: list[MemberSprintMetrics] = []
        for oid in sorted(oids, key=lambda o: owner_labels.get(o, str(o)).lower()):
            b, p, t = pair_totals.get((oid, sid), (Decimal("0"), Decimal("0"), Decimal("0")))
            members.append(_member_metric(oid, owner_labels.get(oid, f"Owner {oid}"), b, p, t))
        detail.append(
            SprintMemberDetailBlock(
                sprint_id=sid,
                sprint_label=labels_map.get(sid, f"Sprint {sid}"),
                members=members,
            )
        )
    return detail, overall


def get_sprintwise_performance_report(
    db: Session,
    *,
    project_id: int,
    user_tenant_id: int | None,
    member_ids: list[int] | None,
    sprint_ids: list[int] | None,
    include_detail: bool,
) -> SprintwisePerformanceReportResponse:
    assert_can_access_pt_project(db, project_id, user_tenant_id)

    billable_cat_id = resolve_task_category_id_by_name(db, _BILLABLE)
    page_cat_id = resolve_task_category_id_by_name(db, _PAGE_DEVELOPMENT)

    sprint_filter: list[int] | None = None
    if sprint_ids:
        sprint_filter = list(dict.fromkeys(sprint_ids))

    owner_filter: list[int] | None = None
    if member_ids:
        owner_filter = list(dict.fromkeys(member_ids))

    def fetch_triple(of: list[int] | None) -> tuple[dict[int, Decimal], dict[int, Decimal], dict[int, Decimal]]:
        bill_m: dict[int, Decimal] = {}
        page_m: dict[int, Decimal] = {}
        if billable_cat_id is not None:
            bill_m = fetch_sprintwise_efforts_for_category(
                db,
                project_id=project_id,
                category_id=billable_cat_id,
                owner_ids=of,
                sprint_ids=sprint_filter,
            )
        if page_cat_id is not None:
            page_m = fetch_sprintwise_efforts_for_category(
                db,
                project_id=project_id,
                category_id=page_cat_id,
                owner_ids=of,
                sprint_ids=sprint_filter,
            )
        tot_m = fetch_sprintwise_total_efforts(
            db, project_id=project_id, owner_ids=of, sprint_ids=sprint_filter
        )
        return bill_m, page_m, tot_m

    pair_totals = fetch_member_sprint_metric_pairs(
        db,
        project_id=project_id,
        owner_ids=owner_filter,
        sprint_ids=sprint_filter,
        billable_category_id=billable_cat_id,
        productive_category_id=page_cat_id,
    )

    sprint_ids_in_pairs = {sid for (_, sid) in pair_totals.keys()}
    sprint_order_common = _resolve_sprint_order(db, project_id, sprint_ids_in_pairs, sprint_filter)

    if owner_filter:
        owner_label_scope = fetch_owner_labels(db, owner_filter)
    else:
        oids_pt = {oid for (oid, _) in pair_totals.keys()}
        owner_label_scope = fetch_owner_labels(db, sorted(oids_pt)) if oids_pt else {}

    detail_by_sprint, overall_summary = _build_detail_and_overall(
        db,
        pair_totals=pair_totals,
        sprint_order=sprint_order_common,
        owner_labels=owner_label_scope,
        include_detail=include_detail,
    )

    if not owner_filter:
        bill_map, page_map, total_map = fetch_triple(None)
        so = _resolve_sprint_order(
            db, project_id, set(bill_map) | set(page_map) | set(total_map), sprint_filter
        )
        sprints = _maps_to_sprints(db, bill_map, page_map, total_map, so)
        return SprintwisePerformanceReportResponse(
            slices=[
                SprintwiseReportSlice(
                    slice_key="all",
                    label="All members",
                    owner_id=None,
                    sprints=sprints,
                )
            ],
            detail_by_sprint=detail_by_sprint,
            overall_summary=overall_summary,
        )

    if len(owner_filter) == 1:
        oid = owner_filter[0]
        bill_map, page_map, total_map = fetch_triple([oid])
        so = _resolve_sprint_order(
            db, project_id, set(bill_map) | set(page_map) | set(total_map), sprint_filter
        )
        sprints = _maps_to_sprints(db, bill_map, page_map, total_map, so)
        labels_o = fetch_owner_labels(db, [oid])
        return SprintwisePerformanceReportResponse(
            slices=[
                SprintwiseReportSlice(
                    slice_key=f"member:{oid}",
                    label=labels_o.get(oid, f"Owner {oid}"),
                    owner_id=oid,
                    sprints=sprints,
                )
            ],
            detail_by_sprint=detail_by_sprint,
            overall_summary=overall_summary,
        )

    owner_labels = fetch_owner_labels(db, owner_filter)
    slices: list[SprintwiseReportSlice] = []
    combined_bill: dict[int, Decimal] = {}
    combined_page: dict[int, Decimal] = {}
    combined_total: dict[int, Decimal] = {}

    for oid in owner_filter:
        bill_map, page_map, total_map = fetch_triple([oid])
        _merge_maps(combined_bill, bill_map)
        _merge_maps(combined_page, page_map)
        _merge_maps(combined_total, total_map)
        so = _resolve_sprint_order(
            db, project_id, set(bill_map) | set(page_map) | set(total_map), sprint_filter
        )
        member_sprints = _maps_to_sprints(db, bill_map, page_map, total_map, so)
        slices.append(
            SprintwiseReportSlice(
                slice_key=f"member:{oid}",
                label=owner_labels.get(oid, f"Owner {oid}"),
                owner_id=oid,
                sprints=member_sprints,
            )
        )

    so_t = _resolve_sprint_order(
        db, project_id, set(combined_bill) | set(combined_page) | set(combined_total), sprint_filter
    )
    total_sprints = _maps_to_sprints(db, combined_bill, combined_page, combined_total, so_t)
    slices.append(
        SprintwiseReportSlice(
            slice_key="total",
            label="Total",
            owner_id=None,
            sprints=total_sprints,
        )
    )
    return SprintwisePerformanceReportResponse(
        slices=slices,
        detail_by_sprint=detail_by_sprint,
        overall_summary=overall_summary,
    )
