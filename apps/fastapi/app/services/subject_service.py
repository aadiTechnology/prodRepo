from sqlalchemy.orm import Session
from typing import List, Optional, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import or_, and_, desc, asc
from app.models.subject import Subject, SubjectClass
from app.schemas.subject_schema import SubjectCreate, SubjectUpdate

class SubjectService:
    @staticmethod
    def get_subjects(
        db: Session,
        tenant_id: int,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        class_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Subject], int]:
        query = db.query(Subject).filter(
            Subject.tenant_id == tenant_id,
            Subject.is_deleted == False
        )

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Subject.name.ilike(search_term),
                    Subject.code.ilike(search_term)
                )
            )

        if is_active is not None:
            query = query.filter(Subject.is_active == is_active)

        if class_id is not None or academic_year_id is not None:
            query = query.join(SubjectClass)
            if class_id is not None:
                query = query.filter(SubjectClass.class_id == class_id)
            if academic_year_id is not None:
                query = query.filter(SubjectClass.academic_year_id == academic_year_id)

        total = query.count()
        subjects = query.distinct().order_by(asc(Subject.name)).offset(skip).limit(limit).all()


        # Prefetching classes mapping for the response
        for subject in subjects:
            subject.classes = [
                {
                    "class_id": sc.class_id,
                    "class_name": sc.class_model.name if sc.class_model else None,
                    "academic_year_id": sc.academic_year_id,
                    "academic_year_name": sc.academic_year.name if sc.academic_year else None,
                    "class_division_id": sc.class_division_id,
                    "division_name": sc.division_model.division_name if sc.division_model else None,
                    "is_mandatory": sc.is_mandatory,
                    "is_active": sc.is_active
                }
                for sc in subject.subject_classes
            ]

        return subjects, total

    @staticmethod
    def get_subject(db: Session, tenant_id: int, subject_id: int) -> Optional[Subject]:
        subject = db.query(Subject).filter(
            Subject.tenant_id == tenant_id,
            Subject.id == subject_id,
            Subject.is_deleted == False
        ).first()

        if subject:
            subject.classes = [
                {
                    "class_id": sc.class_id,
                    "class_name": sc.class_model.name if sc.class_model else None,
                    "academic_year_id": sc.academic_year_id,
                    "academic_year_name": sc.academic_year.name if sc.academic_year else None,
                    "class_division_id": sc.class_division_id,
                    "division_name": sc.division_model.division_name if sc.division_model else None,
                    "is_mandatory": sc.is_mandatory,
                    "is_active": sc.is_active
                }
                for sc in subject.subject_classes
            ]
        return subject

    @staticmethod
    def create_subject(db: Session, tenant_id: int, user_id: int, subject: SubjectCreate) -> Subject:
        # Check if code already exists for tenant
        existing = db.query(Subject).filter(
            Subject.tenant_id == tenant_id,
            Subject.code == subject.code,
            Subject.is_deleted == False
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subject with code '{subject.code}' already exists as '{existing.name}' ({existing.subject_type})"
            )


        db_subject = Subject(
            tenant_id=tenant_id,
            name=subject.name,
            code=subject.code,
            description=subject.description,
            subject_type=subject.subject_type,
            is_active=subject.is_active,
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        db.add(db_subject)
        db.flush()

        if subject.class_mappings:
            for mapping in subject.class_mappings:
                db_mapping = SubjectClass(
                    tenant_id=tenant_id,
                    subject_id=db_subject.id,
                    class_id=mapping.class_id,
                    academic_year_id=mapping.academic_year_id,
                    class_division_id=mapping.class_division_id,
                    is_mandatory=mapping.is_mandatory,
                    is_active=mapping.is_active,
                    created_by=user_id,
                    created_at=datetime.utcnow()
                )
                db.add(db_mapping)

        db.commit()
        db.refresh(db_subject)
        
        db_subject.classes = [
            {
                "class_id": sc.class_id,
                "class_name": sc.class_model.name if sc.class_model else None,
                "academic_year_id": sc.academic_year_id,
                "academic_year_name": sc.academic_year.name if sc.academic_year else None,
                "class_division_id": sc.class_division_id,
                "division_name": sc.division_model.division_name if sc.division_model else None,
                "is_mandatory": sc.is_mandatory,
                "is_active": sc.is_active
            }
            for sc in db_subject.subject_classes
        ]
        return db_subject

    @staticmethod
    def update_subject(db: Session, tenant_id: int, user_id: int, subject_id: int, update_data: SubjectUpdate) -> Subject:
        db_subject = db.query(Subject).filter(
            Subject.tenant_id == tenant_id,
            Subject.id == subject_id,
            Subject.is_deleted == False
        ).first()

        if not db_subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )

        # Check unique code if updated
        if update_data.code and update_data.code != db_subject.code:
            existing = db.query(Subject).filter(
                Subject.tenant_id == tenant_id,
                Subject.code == update_data.code,
                Subject.id != subject_id,
                Subject.is_deleted == False
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Subject with code '{update_data.code}' already exists as '{existing.name}' ({existing.subject_type})"
                )


        update_dict = update_data.dict(exclude_unset=True)
        class_mappings = update_dict.pop("class_mappings", None)

        for key, value in update_dict.items():
            setattr(db_subject, key, value)

        db_subject.updated_by = user_id
        db_subject.updated_at = datetime.utcnow()

        if class_mappings is not None:
            # We want to update mappings for the specific classes/years provided.
            # For each mapping in the input, we replace the existing mapping for that class/year combination.
            for mapping in class_mappings:
                class_id = mapping.get('class_id')
                year_id = mapping.get('academic_year_id')
                
                # Delete existing mapping for this specific class and year
                db.query(SubjectClass).filter(
                    SubjectClass.subject_id == subject_id,
                    SubjectClass.class_id == class_id,
                    SubjectClass.academic_year_id == year_id
                ).delete()

                # Add the new mapping
                db_mapping = SubjectClass(
                    tenant_id=tenant_id,
                    subject_id=db_subject.id,
                    class_id=class_id,
                    academic_year_id=year_id,
                    class_division_id=mapping.get('class_division_id'),
                    is_mandatory=mapping.get('is_mandatory', True),
                    is_active=mapping.get('is_active', True),
                    created_by=user_id,
                    created_at=datetime.utcnow()
                )
                db.add(db_mapping)


        db.commit()
        db.refresh(db_subject)

        db_subject.classes = [
            {
                "class_id": sc.class_id,
                "class_name": sc.class_model.name if sc.class_model else None,
                "academic_year_id": sc.academic_year_id,
                "academic_year_name": sc.academic_year.name if sc.academic_year else None,
                "class_division_id": sc.class_division_id,
                "division_name": sc.division_model.division_name if sc.division_model else None,
                "is_mandatory": sc.is_mandatory,
                "is_active": sc.is_active
            }
            for sc in db_subject.subject_classes
        ]
        return db_subject

    @staticmethod
    def delete_subject(db: Session, tenant_id: int, user_id: int, subject_id: int):
        db_subject = db.query(Subject).filter(
            Subject.tenant_id == tenant_id,
            Subject.id == subject_id,
            Subject.is_deleted == False
        ).first()

        if not db_subject:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subject not found"
            )

        db_subject.is_deleted = True
        db_subject.deleted_at = datetime.utcnow()
        db_subject.deleted_by = user_id

        db.query(SubjectClass).filter(SubjectClass.subject_id == subject_id).delete()

        db.commit()
        return {"message": "Subject deleted successfully"}

