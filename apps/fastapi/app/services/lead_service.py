import random
import string
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_
from fastapi import HTTPException

from app.models.lead import Lead, LeadFollowup, LeadSource, LeadStatus, Parent
from app.schemas.lead import LeadCreate, LeadUpdate, LeadFollowupCreate


# ──────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────

def _generate_lead_code(db: Session, tenant_id: int) -> str:
    suffix = "".join(random.choices(string.digits, k=6))
    return f"LD-{tenant_id}-{suffix}"


def _get_or_create_parent(db: Session, tenant_id: int, data: LeadCreate, user_id: int) -> Parent:
    # Check if a parent with the same mobile already exists for this tenant
    parent = db.query(Parent).filter(
        Parent.tenant_id == tenant_id,
        Parent.mobile_number == data.mobile_number,
        Parent.is_deleted == False,
    ).first()
    if parent:
        # Update name if changed
        parent.parent_name = data.parent_name
        parent.email = data.email or parent.email
        parent.alternate_mobile = data.alternate_mobile or parent.alternate_mobile
        parent.address = data.address or parent.address
        parent.city = data.city or parent.city
        parent.state = data.state or parent.state
        parent.pin_code = data.pin_code or parent.pin_code
        parent.relationship = data.relationship or parent.relationship
        db.flush()
        return parent

    parent = Parent(
        tenant_id=tenant_id,
        parent_name=data.parent_name,
        mobile_number=data.mobile_number,
        alternate_mobile=data.alternate_mobile,
        email=data.email,
        address=data.address,
        city=data.city,
        state=data.state,
        pin_code=data.pin_code,
        relationship=data.relationship,
        created_by=user_id,
    )
    db.add(parent)
    db.flush()
    return parent


# ──────────────────────────────────────────────────────────────
# Lead CRUD
# ──────────────────────────────────────────────────────────────

def create_lead(db: Session, tenant_id: int, data: LeadCreate, user_id: int) -> Lead:
    # Validate status and source exist
    source = db.query(LeadSource).filter(
        LeadSource.id == data.lead_source_id,
        LeadSource.is_active == True
    ).first()
    if not source:
        raise HTTPException(status_code=400, detail="Invalid lead source")

    status = db.query(LeadStatus).filter(
        LeadStatus.id == data.lead_status_id,
        LeadStatus.is_active == True
    ).first()
    if not status:
        raise HTTPException(status_code=400, detail="Invalid lead status")

    try:
        parent = _get_or_create_parent(db, tenant_id, data, user_id)
        lead = Lead(
            tenant_id=tenant_id,
            lead_code=_generate_lead_code(db, tenant_id),
            parent_id=parent.id,
            child_name=data.child_name,
            child_dob=data.child_dob,
            child_gender=data.child_gender,
            lead_source_id=data.lead_source_id,
            lead_status_id=data.lead_status_id,
            preferred_class_id=data.preferred_class_id,
            preferred_academic_year_id=data.preferred_academic_year_id,
            expected_admission_date=data.expected_admission_date,
            notes=data.notes,
            remarks=data.remarks,
            assigned_to=data.assigned_to,
            created_by=user_id,
        )
        db.add(lead)
        db.commit()
        db.refresh(lead)
        return lead
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while creating lead")


def get_leads(
    db: Session,
    tenant_id: int,
    search: str = None,
    status_id: int = None,
    source_id: int = None,
    assigned_to: int = None,
    page: int = 1,
    page_size: int = 10,
):
    query = db.query(Lead).filter(
        Lead.tenant_id == tenant_id,
        Lead.is_deleted == False,
    )

    if search:
        query = query.join(Parent, Lead.parent_id == Parent.id, isouter=True).filter(
            or_(
                Lead.child_name.ilike(f"%{search}%"),
                Parent.parent_name.ilike(f"%{search}%"),
                Parent.mobile_number.ilike(f"%{search}%"),
                Lead.lead_code.ilike(f"%{search}%"),
            )
        )

    if status_id:
        query = query.filter(Lead.lead_status_id == status_id)

    if source_id:
        query = query.filter(Lead.lead_source_id == source_id)

    if assigned_to:
        query = query.filter(Lead.assigned_to == assigned_to)

    total = query.count()
    leads = (
        query.order_by(Lead.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return leads, total


def get_lead_by_id(db: Session, tenant_id: int, lead_id: int) -> Lead:
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.tenant_id == tenant_id,
        Lead.is_deleted == False,
    ).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


def update_lead(db: Session, tenant_id: int, lead_id: int, data: LeadUpdate, user_id: int) -> Lead:
    lead = get_lead_by_id(db, tenant_id, lead_id)

    # Update parent fields if provided
    parent = lead.parent
    if parent:
        if data.parent_name is not None:
            parent.parent_name = data.parent_name
        if data.mobile_number is not None:
            parent.mobile_number = data.mobile_number
        if data.alternate_mobile is not None:
            parent.alternate_mobile = data.alternate_mobile
        if data.email is not None:
            parent.email = data.email
        if data.address is not None:
            parent.address = data.address
        if data.city is not None:
            parent.city = data.city
        if data.state is not None:
            parent.state = data.state
        if data.pin_code is not None:
            parent.pin_code = data.pin_code
        if data.relationship is not None:
            parent.relationship = data.relationship

    # Update lead fields
    lead_fields = [
        "child_name", "child_dob", "child_gender",
        "lead_source_id", "lead_status_id",
        "preferred_class_id", "preferred_academic_year_id",
        "expected_admission_date", "notes", "remarks", "assigned_to",
    ]
    for field in lead_fields:
        val = getattr(data, field, None)
        if val is not None:
            setattr(lead, field, val)

    lead.updated_by = user_id
    lead.updated_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(lead)
        return lead
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while updating lead")


def delete_lead(db: Session, tenant_id: int, lead_id: int, user_id: int) -> bool:
    lead = get_lead_by_id(db, tenant_id, lead_id)
    try:
        lead.is_deleted = True
        lead.deleted_at = datetime.utcnow()
        lead.deleted_by = user_id
        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while deleting lead")


def convert_lead(db: Session, tenant_id: int, lead_id: int, user_id: int) -> Lead:
    lead = get_lead_by_id(db, tenant_id, lead_id)
    if lead.converted_to_student_id:
        raise HTTPException(status_code=400, detail="Lead already converted to student")
    try:
        # Mark as converted (actual student creation done via Student module)
        lead.converted_at = datetime.utcnow()
        lead.converted_by = user_id
        db.commit()
        db.refresh(lead)
        return lead
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while converting lead")


# ──────────────────────────────────────────────────────────────
# Follow-up CRUD
# ──────────────────────────────────────────────────────────────

def create_followup(
    db: Session, tenant_id: int, data: LeadFollowupCreate, user_id: int
) -> LeadFollowup:
    # Verify lead belongs to tenant
    lead = get_lead_by_id(db, tenant_id, data.lead_id)

    try:
        followup = LeadFollowup(
            tenant_id=tenant_id,
            lead_id=data.lead_id,
            followup_date=data.followup_date,
            followup_type=data.followup_type,
            followup_notes=data.followup_notes,
            followup_status="Pending",
            next_followup_date=data.next_followup_date,
            created_by=user_id,
        )
        db.add(followup)

        # Sync next_followup_date on lead for fast list queries
        if data.followup_date:
            lead.next_followup_date = data.followup_date
        lead.updated_by = user_id

        db.commit()
        db.refresh(followup)
        return followup
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while creating follow-up")


def complete_followup(
    db: Session, tenant_id: int, followup_id: int, completion_notes: str, user_id: int
) -> LeadFollowup:
    followup = db.query(LeadFollowup).filter(
        LeadFollowup.id == followup_id,
        LeadFollowup.tenant_id == tenant_id,
    ).first()
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")

    try:
        followup.followup_status = "Completed"
        followup.completed_at = datetime.utcnow()
        followup.completed_by = user_id
        followup.completion_notes = completion_notes

        # Update lead's next_followup_date with any future scheduled followup
        if followup.next_followup_date:
            lead = db.query(Lead).filter(Lead.id == followup.lead_id).first()
            if lead:
                lead.next_followup_date = followup.next_followup_date

        db.commit()
        db.refresh(followup)
        return followup
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Database error while completing follow-up")


def get_followups_by_lead(db: Session, tenant_id: int, lead_id: int):
    get_lead_by_id(db, tenant_id, lead_id)  # authorization check
    return (
        db.query(LeadFollowup)
        .filter(LeadFollowup.lead_id == lead_id, LeadFollowup.tenant_id == tenant_id)
        .order_by(LeadFollowup.followup_date.desc())
        .all()
    )


# ──────────────────────────────────────────────────────────────
# Dropdown Data
# ──────────────────────────────────────────────────────────────

def get_lead_sources(db: Session, tenant_id: int):
    return db.query(LeadSource).filter(
        LeadSource.is_active == True
    ).order_by(LeadSource.name).all()


def get_lead_statuses(db: Session, tenant_id: int):
    return db.query(LeadStatus).filter(
        LeadStatus.is_active == True
    ).order_by(LeadStatus.sequence_order).all()
