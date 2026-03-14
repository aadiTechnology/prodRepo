from sqlalchemy.orm import Session
from datetime import datetime
from sqlalchemy.exc import SQLAlchemyError
from app.models.class_fee_structure_assignment import ClassFeeStructureAssignment, AssignmentStatus
from app.schemas.class_fee_structure_assignment import (
    ClassFeeStructureAssignmentCreate,
    ClassFeeStructureAssignmentUpdate,
)
from app.core.exceptions import AppException

class ClassFeeStructureAssignmentService:
    @staticmethod
    def get_assignment_by_id(db: Session, assignment_id: int):
        assignment = db.query(ClassFeeStructureAssignment).filter(ClassFeeStructureAssignment.id == assignment_id).first()
        if not assignment:
            raise AppException("Assignment not found", status_code=404)
        return assignment
    @staticmethod
    def create_assignment(db: Session, payload: ClassFeeStructureAssignmentCreate, acting_user_id: int):
        # Prevent duplicate assignment
        existing = db.query(ClassFeeStructureAssignment).filter(
            ClassFeeStructureAssignment.academic_year == payload.academic_year,
            ClassFeeStructureAssignment.class_id == payload.class_id,
            ClassFeeStructureAssignment.status == AssignmentStatus.ACTIVE,
        ).first()
        if existing:
            raise AppException("Duplicate assignment: Active fee structure already assigned to this class for the academic year.", status_code=409)
        assignment = ClassFeeStructureAssignment(
            academic_year=payload.academic_year,
            class_id=payload.class_id,
            fee_structure_id=payload.fee_structure_id,
            effective_date=payload.effective_date,
            status=AssignmentStatus.ACTIVE,
            created_by=acting_user_id,
        )
        try:
            db.add(assignment)
            db.commit()
            db.refresh(assignment)
            return assignment
        except SQLAlchemyError as e:
            db.rollback()
            raise AppException(f"Database error: {str(e)}", status_code=500)

    @staticmethod
    def get_assignments(db: Session, filters: dict, page: int = 1, limit: int = 20):
        query = db.query(ClassFeeStructureAssignment)
        # Debug: print the first row raw
        first_row = query.first()
        if first_row:
            print("DEBUG: First row fields:", first_row.__dict__)
        if 'academicYear' in filters:
            query = query.filter(ClassFeeStructureAssignment.academic_year_id == filters['academicYear'])
        if 'class' in filters:
            query = query.filter(ClassFeeStructureAssignment.class_id == filters['class'])
        # Add search, pagination, etc.
        total = query.count()
        # Order by id descending (newest first)
        items = query.order_by(ClassFeeStructureAssignment.id.desc()).offset((page - 1) * limit).limit(limit).all()
        return items, total

    @staticmethod
    def update_assignment(db: Session, assignment_id: int, payload: ClassFeeStructureAssignmentUpdate, acting_user_id: int):
        assignment = db.query(ClassFeeStructureAssignment).filter(ClassFeeStructureAssignment.id == assignment_id).first()
        if not assignment:
            raise AppException("Assignment not found", status_code=404)
        # TODO: Check if student fee ledgers exist, reject update if so
        if payload.class_id:
            assignment.class_id = payload.class_id
        if payload.fee_structure_id:
            assignment.fee_structure_id = payload.fee_structure_id
        if payload.effective_date:
            assignment.effective_date = payload.effective_date
        assignment.updated_by = acting_user_id
        assignment.updated_at = datetime.utcnow()
        try:
            db.commit()
            db.refresh(assignment)
            return assignment
        except SQLAlchemyError as e:
            db.rollback()
            raise AppException(f"Database error: {str(e)}", status_code=500)

    @staticmethod
    def deactivate_assignment(db: Session, assignment_id: int, acting_user_id: int):
        assignment = db.query(ClassFeeStructureAssignment).filter(ClassFeeStructureAssignment.id == assignment_id).first()
        if not assignment:
            raise AppException("Assignment not found", status_code=404)
        assignment.status = AssignmentStatus.INACTIVE
        assignment.end_date = datetime.utcnow().date()
        assignment.updated_by = acting_user_id
        assignment.updated_at = datetime.utcnow()
        try:
            db.commit()
            db.refresh(assignment)
            return assignment
        except SQLAlchemyError as e:
            db.rollback()
            raise AppException(f"Database error: {str(e)}", status_code=500)
