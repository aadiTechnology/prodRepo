from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.invoice import InvoiceCreateRequest, InvoiceListResponse, InvoiceResponse, InvoiceUpdateRequest
from app.services import invoice_service

router = APIRouter(prefix="/fees/invoices", tags=["Fees - Invoice"])


@router.get("", response_model=InvoiceListResponse)
async def list_student_invoices(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1),
    academic_year_id: int | None = Query(None, ge=1),
    class_id: int | None = Query(None, ge=1),
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
        status=status_filter,
        search=search,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_student_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.get_invoice(db, tenant_id=current_user.tenant_id, invoice_id=invoice_id)


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_student_invoice(
    payload: InvoiceCreateRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return invoice_service.create_invoice(db, tenant_id=current_user.tenant_id, payload=payload)


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
    )


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    invoice_service.delete_invoice(db, tenant_id=current_user.tenant_id, invoice_id=invoice_id)
    return None
