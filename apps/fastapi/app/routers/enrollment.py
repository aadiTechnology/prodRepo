import logging

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
from app.core.exceptions import ValidationException
from app.schemas.auth import CurrentUser
from app.schemas.enrollment import (
    EnrollmentCreateRequest,
    EnrollmentCreateResponse,
    EnrollmentPrefillResponse,
    NextAdmissionNoResponse,
)
from app.services.enrollment_service import EnrollmentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admissions/enrollments", tags=["Enrollment"])


@router.get("/next-admission-no", response_model=NextAdmissionNoResponse)
def get_next_admission_no(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    if current_user.tenant_id is None:
        raise HTTPException(status_code=400, detail="Tenant context is required")
    try:
        admission_no = EnrollmentService(db).get_next_admission_no(current_user.tenant_id)
        return NextAdmissionNoResponse(admission_no=admission_no)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("get_next_admission_no failed: %s", e)
        raise HTTPException(status_code=500, detail="Unable to generate admission number")


@router.get("/prefill/{lead_id}", response_model=EnrollmentPrefillResponse)
def prefill_from_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    try:
        data = EnrollmentService(db).get_prefill_from_lead(current_user.tenant_id, lead_id)
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("prefill_from_lead failed for lead_id=%s: %s", lead_id, e)
        raise HTTPException(status_code=500, detail="Unable to load enrollment form")


@router.post("", response_model=EnrollmentCreateResponse)
@router.post("/", response_model=EnrollmentCreateResponse)
def enroll_student(
    payload: EnrollmentCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    try:
        result = EnrollmentService(db).enroll(current_user.tenant_id, current_user.id, payload)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("enroll_student failed: %s", e)
        raise HTTPException(status_code=500, detail="Enrollment failed. Please try again")


@router.post("/upload-document")
async def upload_enrollment_document(
    document_type: str = Query(..., pattern="^(birth_certificate|photo)$"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    if current_user.tenant_id is None:
        raise HTTPException(status_code=400, detail="Tenant context is required")

    try:
        content = await file.read()
        return EnrollmentService(db).upload_document(
            tenant_id=current_user.tenant_id,
            user_id=current_user.id,
            document_type=document_type,
            file_name=file.filename or f"{document_type}",
            content=content,
            content_type=file.content_type,
        )
    except ValidationException as exc:
        raise HTTPException(status_code=400, detail=exc.message) from exc
    except HTTPException:
        raise
    except Exception:
        logger.exception("upload_enrollment_document failed")
        raise HTTPException(status_code=500, detail="Unable to upload file")
