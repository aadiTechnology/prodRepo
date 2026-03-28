
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

def assign_fee_to_student(db: Session, payload: StudentFeeAssignmentCreate):
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

    # Fetch fee components
    fee_components = db.query(FeeCategory).join(FeeStructure, FeeCategory.id == FeeStructure.fee_category_id).filter(FeeStructure.id == payload.fee_structure_id).all()
    # Fetch installments
    installments = db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == payload.fee_structure_id).all()

    # Discount
    discount = None
    if payload.discount_id:
        discount = db.query(FeeDiscount).filter(FeeDiscount.id == payload.discount_id).first()

    # Calculate amounts
    total_amount = 0
    details = []
    for comp in fee_components:
        amount = comp.amount if hasattr(comp, "amount") else 0
        final_amount = amount
        discount_applied = 0
        if discount:
            if discount.discount_type == "percentage":
                discount_applied = amount * discount.discount_value / 100
            else:
                discount_applied = discount.discount_value
            final_amount = amount - discount_applied
        details.append({
            "category": comp.name if hasattr(comp, "name") else comp.category,
            "amount": amount,
            "discount_applied": discount_applied,
            "final_amount": final_amount,
        })
        total_amount += final_amount
    # additional_fee logic removed

    # Save in transaction
    try:
        assignment = StudentFeeAssignment(
            student_id=payload.student_id,
            academic_year_id=payload.academic_year_id,
            fee_structure_id=payload.fee_structure_id,
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
        # Installments
        for inst in installments:
            db.add(StudentFeeInstallment(
                assignment_id=assignment.id,
                installment_no=inst.installment_number,
                due_date=inst.due_date,
                amount=inst.amount,
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
        db.commit()
        # Fetch installments for the assignment
        assignment_installments = db.query(StudentFeeInstallment).filter(StudentFeeInstallment.assignment_id == assignment.id).all()
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
