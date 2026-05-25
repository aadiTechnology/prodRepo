from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.invoice import (
    FeePlanResponse,
    GenerateInvoiceRequest,
    GenerateInvoiceResponse,
    InvoiceCreateRequest,
    InvoiceDetailResponse,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceStudentItem,
    InvoiceUpdateRequest,
)
from app.services import invoice_service

router = APIRouter(prefix="/fees/invoices", tags=["Fees - Invoice"])
api_router = APIRouter(prefix="/api", tags=["Invoice Generation"])


@router.get("", response_model=InvoiceListResponse)
async def list_student_invoices(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1),
    academic_year_id: int | None = Query(None, ge=1),
    class_id: int | None = Query(None, ge=1),
    installment: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.list_invoices(
        db,
        tenant_id=current_user.tenant_id,
        page=page,
        size=size,
        academic_year_id=academic_year_id,
        class_id=class_id,
        installment=installment,
        status=status_filter,
        search=search,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_student_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.get_invoice(
        db,
        tenant_id=current_user.tenant_id,
        invoice_id=invoice_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.get("/{invoice_id}/detail", response_model=InvoiceDetailResponse)
async def get_student_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.get_invoice_detail(
        db,
        tenant_id=current_user.tenant_id,
        invoice_id=invoice_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_student_invoice(
    payload: InvoiceCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.create_invoice(
        db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_student_invoice(
    invoice_id: int,
    payload: InvoiceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.update_invoice(
        db,
        tenant_id=current_user.tenant_id,
        invoice_id=invoice_id,
        payload=payload,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    invoice_service.delete_invoice(
        db,
        tenant_id=current_user.tenant_id,
        invoice_id=invoice_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
    return None


@api_router.get("/fee-plans", response_model=FeePlanResponse | None)
async def get_fee_plan(
    class_id: int = Query(..., ge=1),
    division_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.get_fee_plan(
        db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
        division_id=division_id,
    )


@api_router.get("/students", response_model=list[InvoiceStudentItem])
async def get_students_for_invoice(
    class_id: int = Query(..., ge=1),
    division_id: int = Query(..., ge=1),
    academic_year_id: int = Query(..., ge=1),
    installment_name: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.get_students_for_invoice(
        db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
        division_id=division_id,
        academic_year_id=academic_year_id,
        installment_name=installment_name,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@api_router.post("/invoices/generate", response_model=GenerateInvoiceResponse)
async def generate_invoices(
    payload: GenerateInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.generate_invoices(
        db,
        tenant_id=current_user.tenant_id,
        payload=payload,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )
