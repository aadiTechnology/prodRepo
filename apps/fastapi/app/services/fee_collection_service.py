from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.models.fee import FeeInstallment
from app.models.fee_payment import FeePayment, FeePaymentAllocation
from app.models.student import Student
from app.schemas.fee_collection import FeePaymentCollectRequest, FeePaymentCollectResponse


def collect_payment(
    db: Session,
    *,
    tenant_id: int,
    user_id: int | None,
    req: FeePaymentCollectRequest,
) -> FeePaymentCollectResponse:
    student = (
        db.query(Student)
        .filter(Student.tenant_id == tenant_id, Student.id == req.student_id)
        .first()
    )
    if not student:
        raise NotFoundException("Student", req.student_id)

    installment_ids = [a.fee_installment_id for a in req.allocations]
    installments = (
        db.query(FeeInstallment)
        .filter(
            FeeInstallment.id.in_(installment_ids),
            FeeInstallment.is_deleted == False,  # noqa: E712
        )
        .all()
    )
    found_ids = {i.id for i in installments}
    missing = [i for i in installment_ids if i not in found_ids]
    if missing:
        raise NotFoundException("FeeInstallment", missing[0])

    inst_amounts = {i.id: float(i.amount) for i in installments}
    for a in req.allocations:
        if float(a.amount_allocated) > inst_amounts.get(a.fee_installment_id, 0.0):
            raise ConflictException("Allocated amount cannot exceed installment amount.")

    total_amount = float(sum(a.amount_allocated for a in req.allocations))

    payment = FeePayment(
        tenant_id=tenant_id,
        student_id=req.student_id,
        payment_date=datetime.utcnow(),
        payment_method=req.payment_method,
        reference_no=req.reference_no,
        total_amount=total_amount,
        notes=req.notes,
        created_by=user_id,
    )
    db.add(payment)
    db.flush()

    for a in req.allocations:
        db.add(
            FeePaymentAllocation(
                tenant_id=tenant_id,
                payment_id=payment.id,
                fee_installment_id=a.fee_installment_id,
                amount_allocated=a.amount_allocated,
                created_by=user_id,
            )
        )

    db.commit()
    db.refresh(payment)

    return FeePaymentCollectResponse(
        payment_id=payment.id,
        student_id=payment.student_id,
        total_amount=float(payment.total_amount),
        payment_date=payment.payment_date,
    )

