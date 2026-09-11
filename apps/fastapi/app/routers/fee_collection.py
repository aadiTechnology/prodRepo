from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import CurrentUser
from app.core.exceptions import ValidationException
from app.routers.installment_tracking import require_installment_tracking_access
from app.schemas.fee_collection import (
    FeeReceiptDetailResponse,
    FeePaymentCollectRequest,
    FeePaymentCollectResponse,
    InvoicePaymentCollectRequest,
    FeePaymentApprovalActionResponse,
    FeePaymentApprovalListResponse,
    FeePaymentApprovalRejectRequest,
)
from app.services.fee_collection_service import (
    collect_payment,
    collect_invoice_payment,
    get_receipt_detail,
    get_invoice_receipt_detail,
    list_pending_approvals,
    approve_pending_payment,
    reject_pending_payment,
)

router = APIRouter(prefix="/fees/collection", tags=["Fees - Collection"])


@router.post("", response_model=FeePaymentCollectResponse, status_code=status.HTTP_201_CREATED)
async def collect_fee_payment(
    payload: FeePaymentCollectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    # Use provided tenant_id or fallback to current_user.tenant_id
    effective_tenant_id = payload.tenant_id if payload.tenant_id is not None else current_user.tenant_id
    
    if effective_tenant_id is None:
        raise ValidationException("Tenant ID is required.")
    
    return collect_payment(
        db,
        tenant_id=effective_tenant_id,
        user_id=current_user.id,
        req=payload,
    )


@router.post("/invoice", response_model=FeePaymentCollectResponse, status_code=status.HTTP_201_CREATED)
async def collect_invoice_fee_payment(
    payload: InvoicePaymentCollectRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    # Use provided tenant_id or fallback to current_user.tenant_id
    effective_tenant_id = payload.tenant_id if payload.tenant_id is not None else current_user.tenant_id
    
    if effective_tenant_id is None:
        raise ValidationException("Tenant ID is required.")
    
    return collect_invoice_payment(
        db,
        tenant_id=effective_tenant_id,
        user_id=current_user.id,
        req=payload,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.get("/receipt/{payment_id}", response_model=FeeReceiptDetailResponse)
async def get_fee_receipt_detail(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return get_receipt_detail(
        db,
        tenant_id=current_user.tenant_id,
        payment_id=payment_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@router.get("/receipt/invoice/{invoice_id}", response_model=FeeReceiptDetailResponse)
async def get_invoice_fee_receipt_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return get_invoice_receipt_detail(
        db,
        tenant_id=current_user.tenant_id,
        invoice_id=invoice_id,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


pending_router = APIRouter(prefix="/fees", tags=["Fees - Pending Approval"])


@pending_router.get("/pending-approval", response_model=FeePaymentApprovalListResponse)
async def list_fee_pending_approval(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1),
    class_id: int | None = Query(None, ge=1),
    division_id: int | None = Query(None, ge=1),
    student_id: int | None = Query(None, ge=1),
    status_filter: str | None = Query("Pending Approval", alias="status"),
    search: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return list_pending_approvals(
        db,
        tenant_id=current_user.tenant_id,
        class_id=class_id,
        division_id=division_id,
        student_id=student_id,
        status=status_filter,
        search=search,
        page=page,
        size=size,
        user_id=current_user.id,
        email=str(current_user.email),
        legacy_role=current_user.role,
    )


@pending_router.post(
    "/pending-approval/{payment_id}/approve",
    response_model=FeePaymentApprovalActionResponse,
)
async def approve_fee_pending_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return approve_pending_payment(
        db,
        tenant_id=current_user.tenant_id,
        payment_id=payment_id,
        user_id=current_user.id,
    )


@pending_router.post(
    "/pending-approval/{payment_id}/reject",
    response_model=FeePaymentApprovalActionResponse,
)
async def reject_fee_pending_payment(
    payment_id: int,
    payload: FeePaymentApprovalRejectRequest | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_installment_tracking_access),
):
    return reject_pending_payment(
        db,
        tenant_id=current_user.tenant_id,
        payment_id=payment_id,
        req=payload,
        user_id=current_user.id,
    )

