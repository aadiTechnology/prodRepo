from sqlalchemy.orm import Session, joinedload, contains_eager
from typing import List, Optional, Tuple
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy import or_, and_, desc, asc
from app.models.subject import Subject, SubjectClass
from app.models.academic import SchoolClass
from app.schemas.subject_schema import SubjectCreate, SubjectUpdate
from app.services.teacher_assignment_guards import subject_has_teacher_and_class_assignment
from app.services.school_class_service import require_active_class, require_active_division

_SUBJECT_CLASS_LOAD = joinedload(Subject.subject_classes).options(
    joinedload(SubjectClass.academic_year),
    joinedload(SubjectClass.class_model).joinedload(SchoolClass.academic_year),
    joinedload(SubjectClass.division_model),
)

_SUBJECT_CLASS_CONTAINS_EAGER = contains_eager(Subject.subject_classes).options(
    joinedload(SubjectClass.academic_year),
    joinedload(SubjectClass.class_model).joinedload(SchoolClass.academic_year),
    joinedload(SubjectClass.division_model),
)


class SubjectService:
    @staticmethod
    def _resolve_academic_year(sc: SubjectClass) -> tuple[Optional[int], Optional[str]]:
        academic_year_id = sc.academic_year_id
        academic_year_name = sc.academic_year.name if sc.academic_year else None
        if not academic_year_name and sc.class_model is not None:
            class_year = sc.class_model.academic_year
            if class_year is not None:
                academic_year_name = class_year.name
                if academic_year_id is None:
                    academic_year_id = sc.class_model.academic_year_id
        return academic_year_id, academic_year_name

    @staticmethod
    def _subject_class_to_dict(sc: SubjectClass) -> dict:
        academic_year_id, academic_year_name = SubjectService._resolve_academic_year(sc)
        return {
            "class_id": sc.class_id,
            "class_name": sc.class_model.name if sc.class_model else None,
            "academic_year_id": academic_year_id,
            "academic_year_name": academic_year_name,
            "class_division_id": sc.class_division_id,
            "division_name": sc.division_model.division_name if sc.division_model else None,
            "is_mandatory": sc.is_mandatory,
            "is_active": sc.is_active,
        }

    @staticmethod
    def _attach_class_mappings(
        subject: Subject,
        class_id: Optional[int] = None,
        academic_year_id: Optional[int] = None,
    ) -> None:
        mappings: list[dict] = []
        for sc in subject.subject_classes:
            if class_id is not None and sc.class_id != class_id:
                continue
            if academic_year_id is not None:
                resolved_year_id, _ = SubjectService._resolve_academic_year(sc)
                if resolved_year_id != academic_year_id:
                    continue
            mappings.append(SubjectService._subject_class_to_dict(sc))
        subject.classes = mappings

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
            query = query.join(SubjectClass).options(_SUBJECT_CLASS_CONTAINS_EAGER)
            if class_id is not None:
                query = query.filter(SubjectClass.class_id == class_id)
            if academic_year_id is not None:
                query = query.filter(SubjectClass.academic_year_id == academic_year_id)
        else:
            query = query.options(_SUBJECT_CLASS_LOAD)

        total = query.count()
        subjects = query.distinct().order_by(asc(Subject.name)).offset(skip).limit(limit).all()

        for subject in subjects:
            SubjectService._attach_class_mappings(
                subject,
                class_id=class_id,
                academic_year_id=academic_year_id,
            )

        return subjects, total

    @staticmethod
    def get_subject(db: Session, tenant_id: int, subject_id: int) -> Optional[Subject]:
        subject = (
            db.query(Subject)
            .options(_SUBJECT_CLASS_LOAD)
            .filter(
                Subject.tenant_id == tenant_id,
                Subject.id == subject_id,
                Subject.is_deleted == False,
            )
            .first()
        )

        if subject:
            SubjectService._attach_class_mappings(subject)
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

        # Handle all_classes flag
        if subject.all_classes and subject.academic_year_id:
            classes = db.query(SchoolClass).filter(
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.academic_year_id == subject.academic_year_id,
                SchoolClass.is_active == True,
                SchoolClass.is_deleted == False
            ).all()
            for cls in classes:
                # Check if mapping already exists from class_mappings to avoid duplicates
                if subject.class_mappings and any(m.class_id == cls.id for m in subject.class_mappings):
                    continue
                
                db.add(SubjectClass(
                    tenant_id=tenant_id,
                    subject_id=db_subject.id,
                    class_id=cls.id,
                    academic_year_id=subject.academic_year_id,
                    is_mandatory=subject.is_mandatory,
                    is_active=subject.is_active,
                    created_by=user_id,
                    created_at=datetime.utcnow()
                ))
        elif subject.class_mappings:
            for mapping in subject.class_mappings:
                require_active_class(db, tenant_id, mapping.class_id)
                require_active_division(
                    db, tenant_id, mapping.class_id, mapping.class_division_id
                )
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
        SubjectService._attach_class_mappings(db_subject)
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

        if update_data.all_classes and update_data.academic_year_id:
            classes = db.query(SchoolClass).filter(
                SchoolClass.tenant_id == tenant_id,
                SchoolClass.academic_year_id == update_data.academic_year_id,
                SchoolClass.is_active == True,
                SchoolClass.is_deleted == False
            ).all()
            for cls in classes:
                # Delete existing mapping for this specific class and year
                db.query(SubjectClass).filter(
                    SubjectClass.subject_id == subject_id,
                    SubjectClass.class_id == cls.id,
                    SubjectClass.academic_year_id == update_data.academic_year_id
                ).delete()

                # Add the new mapping
                db.add(SubjectClass(
                    tenant_id=tenant_id,
                    subject_id=db_subject.id,
                    class_id=cls.id,
                    academic_year_id=update_data.academic_year_id,
                    is_mandatory=update_data.is_mandatory if update_data.is_mandatory is not None else True,
                    is_active=update_data.is_active if update_data.is_active is not None else True,
                    created_by=user_id,
                    created_at=datetime.utcnow()
                ))
        elif class_mappings is not None:
            # We want to update mappings for the specific classes/years provided.
            # For each mapping in the input, we replace the existing mapping for that class/year combination.
            for mapping in class_mappings:
                class_id = mapping.get('class_id')
                year_id = mapping.get('academic_year_id')
                if class_id is not None:
                    require_active_class(db, tenant_id, int(class_id))
                    require_active_division(
                        db,
                        tenant_id,
                        int(class_id),
                        mapping.get("class_division_id"),
                    )

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
        SubjectService._attach_class_mappings(db_subject)
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

        if subject_has_teacher_and_class_assignment(db, tenant_id, subject_id):
            subject_name = (db_subject.name or "this subject").strip()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cannot delete {subject_name} subject because it is assigned "
                    "to a teacher and class."
                ),
            )

        db_subject.is_deleted = True
        db_subject.deleted_at = datetime.utcnow()
        db_subject.deleted_by = user_id

        db.query(SubjectClass).filter(SubjectClass.subject_id == subject_id).delete()

        db.commit()
        return {"message": "Subject deleted successfully"}

