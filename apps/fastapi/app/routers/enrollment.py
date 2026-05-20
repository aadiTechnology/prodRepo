import os
import shutil
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_permission
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
UPLOAD_DIR = "static/enrollment-documents"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
def upload_enrollment_document(
    document_type: str = Query(..., pattern="^(birth_certificate|photo)$"),
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(require_permission("Lead Management", "create")),
):
    extension = os.path.splitext(file.filename or "")[1].lower()
    allowed_image_ext = {".jpg", ".jpeg", ".png", ".webp"}
    allowed_doc_ext = allowed_image_ext | {".pdf"}
    allowed = allowed_doc_ext if document_type == "birth_certificate" else allowed_image_ext
    if extension not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid file type for {document_type}")

    unique_suffix = datetime.utcnow().strftime("%Y%m%d%H%M%S") + "_" + uuid4().hex[:8]
    filename = f"{current_user.tenant_id}_{current_user.id}_{document_type}_{unique_suffix}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception:
        raise HTTPException(status_code=500, detail="Unable to upload file")

    return {
        "message": "File uploaded successfully",
        "file_url": f"/enrollment-documents/{filename}",
        "file_name": file.filename,
        "document_type": document_type,
    }
