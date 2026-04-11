from fastapi import APIRouter, Depends, Query, Path, Body, status, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.dependencies import require_permission, get_current_user
from app.schemas.auth import CurrentUser
from app.schemas.lead import (
    LeadCreate, LeadUpdate, LeadDetailResponse, LeadListItem,
    LeadFollowupCreate, LeadFollowupResponse,
    LeadSourceResponse, LeadStatusResponse,
)
from app.services import lead_service

router = APIRouter(prefix="/api/admissions/leads", tags=["Lead Management"])

# ──────────────────────────────────────────────────────────────
# Lead Dropdowns
# ──────────────────────────────────────────────────────────────

@router.get("/sources", response_model=list)
def list_lead_sources(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    sources = lead_service.get_lead_sources(db, current_user.tenant_id)
    return [LeadSourceResponse.from_orm(s).dict() for s in sources]


@router.get("/statuses", response_model=list)
def list_lead_statuses(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    statuses = lead_service.get_lead_statuses(db, current_user.tenant_id)
    return [LeadStatusResponse.from_orm(s).dict() for s in statuses]


# ──────────────────────────────────────────────────────────────
# Lead CRUD
# ──────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/", status_code=status.HTTP_201_CREATED)
def create_lead(
    data: LeadCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    try:
        lead = lead_service.create_lead(db, current_user.tenant_id, data, current_user.id)
        return _build_list_item(lead)
    except HTTPException:
        raise
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=dict)
@router.get("/", response_model=dict)
def list_leads(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "view")),
    search: Optional[str] = Query(None),
    status_id: Optional[int] = Query(None),
    source_id: Optional[int] = Query(None),
    assigned_to: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    try:
        leads, total = lead_service.get_leads(
            db, current_user.tenant_id, search, status_id, source_id, assigned_to, page, page_size
        )
        data = [_build_list_item(lead) for lead in leads]
        return {"data": data, "total": total}
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/society-suggestions", response_model=list[str])
def get_society_suggestions(
    q: str = Query(""),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return lead_service.get_society_suggestions(db, current_user.tenant_id, q)


@router.get("/{lead_id}")
def get_lead(
    lead_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "view")),
):
    lead = lead_service.get_lead_by_id(db, current_user.tenant_id, lead_id)
    return _build_detail(lead)


@router.put("/{lead_id}")
def update_lead(
    lead_id: int = Path(...),
    data: LeadUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "edit")),
):
    lead = lead_service.update_lead(db, current_user.tenant_id, lead_id, data, current_user.id)
    return _build_detail(lead)


@router.delete("/{lead_id}")
def delete_lead(
    lead_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "delete")),
):
    lead_service.delete_lead(db, current_user.tenant_id, lead_id, current_user.id)
    return {"message": "Lead deleted successfully"}


@router.post("/{lead_id}/convert")
def convert_lead(
    lead_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "edit")),
):
    lead = lead_service.convert_lead(db, current_user.tenant_id, lead_id, current_user.id)
    return {"message": "Lead marked as converted", "lead_id": lead.id}


# ──────────────────────────────────────────────────────────────
# Follow-up endpoints
# ──────────────────────────────────────────────────────────────

@router.get("/{lead_id}/followups")
def get_followups(
    lead_id: int = Path(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "view")),
):
    followups = lead_service.get_followups_by_lead(db, current_user.tenant_id, lead_id)
    return [LeadFollowupResponse.from_orm(f).dict() for f in followups]


@router.post("/{lead_id}/followups", status_code=status.HTTP_201_CREATED)
def create_followup(
    lead_id: int = Path(...),
    data: LeadFollowupCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "edit")),
):
    # Ensure path lead_id matches body
    data.lead_id = lead_id
    followup = lead_service.create_followup(db, current_user.tenant_id, data, current_user.id)
    return LeadFollowupResponse.from_orm(followup).dict()


@router.post("/followups/{followup_id}/complete")
def complete_followup(
    followup_id: int = Path(...),
    completion_notes: str = Body("", embed=True),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "edit")),
):
    followup = lead_service.complete_followup(db, current_user.tenant_id, followup_id, completion_notes, current_user.id)
    return LeadFollowupResponse.from_orm(followup).dict()


# ──────────────────────────────────────────────────────────────
# Internal helpers to build response dicts
# ──────────────────────────────────────────────────────────────

def _build_list_item(lead) -> dict:
    return {
        "id": lead.id,
        "lead_code": lead.lead_code,
        "child_name": lead.child_name,
        "child_gender": lead.child_gender,
        "parent_name": lead.parent.parent_name if lead.parent else None,
        "mobile_number": lead.parent.mobile_number if lead.parent else None,
        "source_name": lead.source.name if lead.source else None,
        "status_name": lead.status.name if lead.status else None,
        "status_color": lead.status.color_code if lead.status else None,
        "next_followup_date": str(lead.next_followup_date) if lead.next_followup_date else None,
        "assigned_to": lead.assigned_to,
        "created_at": str(lead.created_at) if lead.created_at else None,
        "converted": bool(lead.converted_at),
    }


def _build_detail(lead) -> dict:
    item = _build_list_item(lead)
    item.update({
        "tenant_id": lead.tenant_id,
        "parent": {
            "id": lead.parent.id,
            "parent_name": lead.parent.parent_name,
            "mobile_number": lead.parent.mobile_number,
            "alternate_mobile": lead.parent.alternate_mobile,
            "email": lead.parent.email,
            "address": lead.parent.address,
            "city": lead.parent.city,
            "state": lead.parent.state,
            "pin_code": lead.parent.pin_code,
            "relationship": lead.parent.relationship,
            "society": lead.parent.society,
        } if lead.parent else None,
        "child_dob": str(lead.child_dob) if lead.child_dob else None,
        "lead_source_id": lead.lead_source_id,
        "lead_status_id": lead.lead_status_id,
        "preferred_class_id": lead.preferred_class_id,
        "preferred_academic_year_id": lead.preferred_academic_year_id,
        "expected_admission_date": str(lead.expected_admission_date) if lead.expected_admission_date else None,
        "notes": lead.notes,
        "remarks": lead.remarks,
        "converted_to_student_id": lead.converted_to_student_id,
        "converted_at": str(lead.converted_at) if lead.converted_at else None,
        "followups": [
            {
                "id": f.id,
                "lead_id": f.lead_id,
                "followup_date": str(f.followup_date),
                "followup_type": f.followup_type,
                "followup_notes": f.followup_notes,
                "followup_status": f.followup_status,
                "completed_at": str(f.completed_at) if f.completed_at else None,
                "completion_notes": f.completion_notes,
                "next_followup_date": str(f.next_followup_date) if f.next_followup_date else None,
                "created_at": str(f.created_at) if f.created_at else None,
            }
            for f in (lead.followups or [])
        ],
        "updated_at": str(lead.updated_at) if lead.updated_at else None,
    })
    return item
