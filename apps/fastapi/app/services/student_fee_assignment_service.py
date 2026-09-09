
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models.student_fee_assignment import (
    StudentFeeAssignment,
    StudentFeeDetail,
    StudentFeeInstallment,
)
from app.models.student import Student
from app.models.fee import FeeStructure
from app.models.fee_discount import FeeDiscount
from app.models.fee import FeeCategory
from app.models.fee import FeeInstallment
from app.models.academic import AcademicYear
from app.models.academic import SchoolClass
from app.schemas.student_fee_assignment import (
    StudentFeeAssignmentCreate,
)
from app.core.exceptions import NotFoundException, AppException
from app.core.logging_config import get_logger
from sqlalchemy import and_

logger = get_logger(__name__)


def _only_custom_fee_plan_name(raw: str, master_name: str | None) -> str:
    name = (raw or "").strip()
    master = (master_name or "").strip()
    if not name or not master:
        return name
    for sep in (" — ", " – ", " - ", "—", "–", "-", " "):
        prefix = master + sep
        if name.lower().startswith(prefix.lower()):
            name = name[len(prefix):].strip()
            break
    parts = master.split()
    if len(parts) >= 2:
        first, rest = parts[0], " ".join(parts[1:])
        for sep in (" - ", " — ", " – ", "-"):
            wrapped = f"{first}{sep}{rest}"
            if name.lower().startswith(wrapped.lower()):
                leftover = name[len(wrapped):].lstrip(" -—–").strip()
                if leftover:
                    name = leftover
                break
    return name.strip()


def get_students_for_dropdown(db: Session):
    # Join students and classes
    results = (
        db.query(Student.id, Student.student_name, SchoolClass.id.label("class_id"), SchoolClass.name.label("class_name"))
        .join(SchoolClass, Student.class_id == SchoolClass.id)
        .all()
    )
    return [
        {
            "id": r.id,
            "name": r.student_name,
            "class_id": r.class_id,
            "class_name": r.class_name,
        }
        for r in results
    ]

def get_student_detail(db: Session, student_id: int):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise NotFoundException("Student not found", 404)
    class_ = db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
    return {
        "id": student.id,
        "name": student.student_name,
        "class_id": class_.id if class_ else None,
        "class_name": class_.name if class_ else None,
        "tenant_id": class_.tenant_id if class_ else None,
    }

def assign_fee_to_student(db: Session, payload: StudentFeeAssignmentCreate, auto_commit: bool = True):
    # Strict validation
    if not payload.student_id:
        raise AppException("student_id is required", status_code=422)
    if not payload.academic_year_id:
        raise AppException("academic_year_id is required", status_code=400)
    if not payload.fee_structure_id:
        raise AppException("fee_structure_id is required", status_code=400)

    # Check student exists
    student = db.query(Student).filter(Student.id == payload.student_id).first()
    if not student:
        raise NotFoundException("Student not found", 404)

    # Get academic year name from academic_year_id
    academic_year_name = None
    if hasattr(payload, 'academic_year_id') and payload.academic_year_id:
        from app.models.academic import AcademicYear
        ay = db.query(AcademicYear).filter(AcademicYear.id == payload.academic_year_id).first()
        if ay:
            academic_year_name = ay.name
    # Fallback to student's academic_year if not found
    if not academic_year_name:
        academic_year_name = getattr(student, 'academic_year', None)

    # Removed uniqueness check for academic year; allow multiple assignments per student per academic year

    # Fetch fee structure
    fee_structure = db.query(FeeStructure).filter(FeeStructure.id == payload.fee_structure_id).first()
    if not fee_structure:
        raise AppException("Fee structure not found", status_code=400)

    # Fetch installments from the master plan unless this student has a custom schedule.
    custom_installments = list(getattr(payload, "custom_installments", None) or [])
    has_custom_schedule = len(custom_installments) > 0
    installments = []
    if not has_custom_schedule:
        installments = db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == payload.fee_structure_id).all()

    # Discount
    discount = None
    if payload.discount_id:
        discount = (
            db.query(FeeDiscount)
            .filter(
                FeeDiscount.id == payload.discount_id,
                FeeDiscount.is_deleted == False,  # noqa: E712
                FeeDiscount.status == True,  # noqa: E712
            )
            .first()
        )

    # Calculate amounts
    total_amount = 0.0
    details = []
    if has_custom_schedule:
        custom_sum = float(sum(float(inst.amount or 0) for inst in custom_installments))
        if payload.custom_annual_amount is not None:
            base_amount = float(payload.custom_annual_amount)
        else:
            base_amount = custom_sum
    else:
        base_amount = float(sum(float(inst.amount or 0) for inst in installments))
    if base_amount <= 0:
        base_amount = float(fee_structure.total_amount or 0)

    discount_applied = 0.0
    if has_custom_schedule and payload.custom_discount_amount is not None:
        discount_applied = max(0.0, min(float(payload.custom_discount_amount or 0), base_amount))
    elif discount and base_amount > 0:
        discount_type = str(discount.discount_type or "").strip().lower()
        discount_value = float(discount.discount_value or 0)
        if discount_type in {"percentage", "percent"}:
            discount_applied = (base_amount * discount_value) / 100.0
        else:
            discount_applied = discount_value
        discount_applied = max(0.0, min(discount_applied, base_amount))

    final_amount = max(0.0, base_amount - discount_applied)
    category_name = (
        fee_structure.fee_category.name
        if getattr(fee_structure, "fee_category", None) and getattr(fee_structure.fee_category, "name", None)
        else "Fee"
    )
    details.append({
        "category": category_name,
        "amount": base_amount,
        "discount_applied": discount_applied,
        "final_amount": final_amount,
    })
    total_amount = final_amount
    # additional_fee logic removed

    if has_custom_schedule:
        custom_sum = float(sum(float(inst.amount or 0) for inst in custom_installments))
        if abs(custom_sum - float(final_amount)) > 0.05:
            raise AppException(
                f"Installment total ({custom_sum:.2f}) must match final payable ({float(final_amount):.2f}).",
                status_code=400,
            )
        if any(not inst.due_date for inst in custom_installments):
            raise AppException("Each customized installment needs a due date.", status_code=400)

    assignment_fee_structure_id = payload.fee_structure_id

    # Save in transaction
    try:
        # Persist customized schedule as its own Fee Structure so it appears on /fees/setup,
        # without modifying the master plan used by other students.
        if has_custom_schedule:
            custom_name = _only_custom_fee_plan_name(
                getattr(payload, "custom_fee_plan_name", None) or "",
                fee_structure.name,
            )
            if not custom_name:
                raise AppException("Custom fee plan name is required.", status_code=400)
            custom_structure = FeeStructure(
                tenant_id=fee_structure.tenant_id,
                class_id=fee_structure.class_id,
                class_division_id=fee_structure.class_division_id,
                fee_category_id=fee_structure.fee_category_id,
                multi_category_ids=fee_structure.multi_category_ids,
                academic_year_id=fee_structure.academic_year_id,
                total_amount=final_amount,
                installment_type=fee_structure.installment_type or "CUSTOM",
                num_installments=len(custom_installments),
                description=None,
                name=custom_name,
                is_active=True,
                created_by=getattr(student, "created_by", None),
            )
            db.add(custom_structure)
            db.flush()
            for index, inst in enumerate(custom_installments):
                db.add(FeeInstallment(
                    fee_structure_id=custom_structure.id,
                    fee_category_id=fee_structure.fee_category_id,
                    installment_number=int(inst.installment_no or index + 1),
                    amount=max(0.0, round(float(inst.amount or 0), 2)),
                    due_date=inst.due_date,
                    late_fee_applicable=False,
                    created_by=getattr(student, "created_by", None),
                ))
            assignment_fee_structure_id = custom_structure.id

        assignment = StudentFeeAssignment(
            student_id=payload.student_id,
            academic_year_id=payload.academic_year_id,
            fee_structure_id=assignment_fee_structure_id,
            discount_id=payload.discount_id,
            additional_fee=payload.additional_fee,
            total_amount=total_amount,
            final_amount=total_amount,
            status="Pending",
        )
        db.add(assignment)
        db.flush()
        # Details
        for d in details:
            db.add(StudentFeeDetail(
                assignment_id=assignment.id,
                category=d["category"],
                amount=d["amount"],
                discount_applied=d["discount_applied"],
                final_amount=d["final_amount"],
            ))
        # Installments: custom rows apply only to this student; otherwise copy the master plan.
        if has_custom_schedule:
            for index, inst in enumerate(custom_installments):
                db.add(StudentFeeInstallment(
                    assignment_id=assignment.id,
                    installment_no=int(inst.installment_no or index + 1),
                    due_date=inst.due_date,
                    amount=max(0.0, round(float(inst.amount or 0), 2)),
                    status="Pending",
                ))
        else:
            total_template_installment_sum = float(sum(float(inst.amount or 0) for inst in installments))
            discount_ratio = (discount_applied / total_template_installment_sum) if total_template_installment_sum > 0 else 0.0

            for inst in installments:
                raw_amount = float(inst.amount or 0)
                # Apply discount ratio to each installment
                discounted_amount = max(0.0, round(raw_amount * (1.0 - discount_ratio), 2))
                
                db.add(StudentFeeInstallment(
                    assignment_id=assignment.id,
                    installment_no=inst.installment_number,
                    due_date=inst.due_date,
                    amount=discounted_amount,
                    status="Pending",
                ))
        # Create FeeLedger if not exists
        from app.models.student_fee_ledger import FeeLedger
        existing_ledger = db.query(FeeLedger).filter(
            FeeLedger.student_id == payload.student_id,
            FeeLedger.academic_year == academic_year_name,
            FeeLedger.tenant_id == student.tenant_id
        ).first()
        if not existing_ledger:
            new_ledger = FeeLedger(
                tenant_id=student.tenant_id,
                student_id=student.id,
                academic_year=academic_year_name,
                total_fee=total_amount,
                total_paid=0,
                total_balance=total_amount
            )
            db.add(new_ledger)
        db.flush()
        assignment_installments = db.query(StudentFeeInstallment).filter(StudentFeeInstallment.assignment_id == assignment.id).all()
        from app.services.invoice_service import create_invoices_for_enrolled_student
        create_invoices_for_enrolled_student(
            db,
            student=student,
            academic_year_id=payload.academic_year_id,
            fee_structure_id=assignment_fee_structure_id,
            assignment_installments=assignment_installments,
        )
        if auto_commit:
            db.commit()
        installments_response = [
            {
                "installment_no": inst.installment_no,
                "due_date": inst.due_date,
                "amount": float(inst.amount),
                "status": inst.status,
            }
            for inst in assignment_installments
        ]
        return {
            "message": "Fee ledger generated successfully",
            "student_id": assignment.student_id,
            "total_amount": assignment.total_amount,
            "final_amount": assignment.final_amount,
            "details": details,
            "installments": installments_response,
        }
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Error assigning fee: {str(e)}")
        raise AppException("Database error", status_code=500)
