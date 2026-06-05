from typing import List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.models.teacher import Teacher
from app.models.user import User
from app.schemas.teacher_schema import TeacherCreate, TeacherUpdate
from app.schemas.user import UserCreate, UserUpdate
from app.services import user_service
from app.core.exceptions import ConflictException, NotFoundException
from fastapi import HTTPException, status

def get_teacher_assignment_rows(db: Session, tenant_id: int, teacher_id: int) -> list[dict]:
    try:
        rows = db.execute(
            text(
                """
                SELECT
                    ta.class_id,
                    c.name AS class_name,
                    ta.class_division_id,
                    cd.division_name
                FROM teacher_assignments ta
                LEFT JOIN classes c ON c.id = ta.class_id
                LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
                WHERE ta.tenant_id = :tenant_id
                  AND ta.teacher_id = :teacher_id
                  AND ta.is_active = 1
                ORDER BY c.name ASC, cd.division_name ASC, ta.id ASC
                """
            ),
            {"tenant_id": tenant_id, "teacher_id": teacher_id},
        ).mappings().all()
    except SQLAlchemyError:
        return []

    grouped: dict[tuple[Optional[int], str], dict] = {}
    for row in rows:
        key = (row["class_id"], row["class_name"] or "")
        if key not in grouped:
            grouped[key] = {
                "class_id": row["class_id"],
                "class_name": row["class_name"],
                "division_names": [],
                "divisions": [],
            }
        division_name = row["division_name"]
        division_id = row["class_division_id"]
        if division_name and division_name not in grouped[key]["division_names"]:
            grouped[key]["division_names"].append(division_name)
        if division_id is not None:
            existing_ids = {d["id"] for d in grouped[key]["divisions"]}
            if int(division_id) not in existing_ids:
                grouped[key]["divisions"].append(
                    {
                        "id": int(division_id),
                        "division_name": division_name or "",
                    }
                )

    return list(grouped.values())

def get_all_teachers(
    db: Session, 
    tenant_id: int, 
    search: Optional[str] = None, 
    status: Optional[str] = None,
    class_id: Optional[int] = None,
    class_division_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100
) -> Tuple[List[Teacher], int]:
    try:
        teacher_assignments_exist = bool(
            db.execute(
                text(
                    """
                    SELECT TOP 1 1
                    FROM teacher_assignments
                    WHERE tenant_id = :tenant_id
                      AND is_active = 1
                    """
                ),
                {"tenant_id": tenant_id},
            ).scalar()
        )
    except SQLAlchemyError:
        teacher_assignments_exist = False

    if teacher_assignments_exist:
        try:
            teacher_rows = db.execute(
                text(
                    """
                    SELECT
                        t.id,
                        t.tenant_id,
                        t.user_id,
                        t.teacher_code,
                        t.full_name,
                        t.date_of_birth,
                        t.gender,
                        t.mobile_number,
                        t.email,
                        t.qualification,
                        t.experience_years,
                        t.photo_url,
                        t.is_active,
                        t.address,
                        t.city,
                        t.state,
                        t.pincode,
                        t.created_at,
                        t.updated_at,
                        t.class_id AS legacy_class_id,
                        t.class_division_id AS legacy_class_division_id
                    FROM teachers t
                    WHERE t.tenant_id = :tenant_id
                      AND t.is_deleted = 0
                      AND (
                            :status IS NULL
                            OR (:status = 'active' AND t.is_active = 1)
                            OR (:status = 'inactive' AND t.is_active = 0)
                      )
                      AND (
                            :search_like IS NULL
                            OR t.full_name LIKE :search_like
                            OR t.mobile_number LIKE :search_like
                            OR t.teacher_code LIKE :search_like
                      )
                    ORDER BY t.full_name ASC
                    """
                ),
                {
                    "tenant_id": tenant_id,
                    "status": status.lower() if status else None,
                    "search_like": f"%{search.strip()}%" if search and search.strip() else None,
                },
            ).mappings().all()

            assignment_rows = db.execute(
                text(
                    """
                    SELECT
                        ta.teacher_id,
                        ta.class_id,
                        c.name AS class_name,
                        ta.class_division_id,
                        cd.division_name
                    FROM teacher_assignments ta
                    LEFT JOIN classes c ON c.id = ta.class_id
                    LEFT JOIN class_divisions cd ON cd.id = ta.class_division_id
                    WHERE ta.tenant_id = :tenant_id
                      AND ta.is_active = 1
                    """
                ),
                {"tenant_id": tenant_id},
            ).mappings().all()

            grouped: dict[tuple[int, Optional[int]], dict] = {}
            for row in assignment_rows:
                t_id = row["teacher_id"]
                c_id = row["class_id"]
                key = (t_id, c_id)
                if key not in grouped:
                    grouped[key] = {
                        "teacher_id": t_id,
                        "class_id": c_id,
                        "class_name": row["class_name"],
                        "division_ids": set(),
                        "division_names": [],
                    }
                if row["class_division_id"] is not None:
                    grouped[key]["division_ids"].add(row["class_division_id"])
                if row["division_name"] and row["division_name"] not in grouped[key]["division_names"]:
                    grouped[key]["division_names"].append(row["division_name"])

            grouped_by_teacher: dict[int, list[dict]] = {}
            for group in grouped.values():
                grouped_by_teacher.setdefault(group["teacher_id"], []).append(group)

            flattened: list[dict] = []
            for teacher in teacher_rows:
                teacher_dict = dict(teacher)
                teacher_groups = grouped_by_teacher.get(teacher_dict["id"], [])

                if not teacher_groups:
                    flattened.append({
                        **teacher_dict,
                        "class_id": None,
                        "class_division_id": None,
                        "class_name": None,
                        "division_name": None,
                        "_division_ids": set(),
                    })
                    continue

                teacher_groups.sort(key=lambda item: ((item["class_name"] or "").upper(), item["class_id"] or 0))
                for grp in teacher_groups:
                    flattened.append({
                        **teacher_dict,
                        "class_id": grp["class_id"],
                        "class_division_id": None,
                        "class_name": grp["class_name"],
                        "division_name": ", ".join(grp["division_names"]) if grp["division_names"] else None,
                        "_division_ids": grp["division_ids"],
                    })

            if class_id is not None:
                flattened = [row for row in flattened if row["class_id"] == class_id]

            if class_division_id is not None:
                flattened = [
                    row for row in flattened
                    if class_division_id in (row.get("_division_ids") or set())
                ]

            total = len(flattened)
            data = flattened[skip: skip + limit]
            for row in data:
                row.pop("_division_ids", None)

            return data, total
        except SQLAlchemyError:
            pass

    try:
        # Fallback to legacy source when teacher_assignments is unavailable.
        query = db.query(Teacher).filter(
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False
        )

        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Teacher.full_name.ilike(search_filter)) |
                (Teacher.mobile_number.ilike(search_filter)) |
                (Teacher.teacher_code.ilike(search_filter))
            )

        if status is not None:
            if status.lower() == "active":
                query = query.filter(Teacher.is_active == True)
            elif status.lower() == "inactive":
                query = query.filter(Teacher.is_active == False)

        if class_id is not None:
            query = query.filter(Teacher.class_id == class_id)

        if class_division_id is not None:
            query = query.filter(Teacher.class_division_id == class_division_id)

        total = query.count()
        teachers = query.order_by(Teacher.full_name.asc()).offset(skip).limit(limit).all()
        return teachers, total
    except SQLAlchemyError:
        return [], 0

def get_teacher_by_id(db: Session, teacher_id: int, tenant_id: int) -> Teacher:
    teacher = db.query(Teacher).filter(
        Teacher.id == teacher_id,
        Teacher.tenant_id == tenant_id,
        Teacher.is_deleted == False
    ).first()
    
    if not teacher:
        raise NotFoundException(f"Teacher with ID {teacher_id} not found")
        
    return teacher

def check_mobile_duplicate(db: Session, mobile: str, tenant_id: int, exclude_id: int = None):
    query = db.query(Teacher).filter(
        Teacher.tenant_id == tenant_id, 
        Teacher.mobile_number == mobile,
        Teacher.is_deleted == False
    )
    if exclude_id:
        query = query.filter(Teacher.id != exclude_id)
        
    if query.first():
        raise ConflictException("A teacher with this mobile number already exists.")

def generate_teacher_code(db: Session, tenant_id: int) -> str:
    from sqlalchemy import func
    max_id = db.query(func.max(Teacher.id)).filter(Teacher.tenant_id == tenant_id).scalar() or 0
    return f"T{max_id + 1:03d}"

def check_division_assignment_conflict(db: Session, tenant_id: int, class_id: Optional[int], class_division_id: Optional[int], exclude_id: Optional[int] = None):
    if not class_id or not class_division_id:
        return
        
    query = db.query(Teacher).filter(
        Teacher.tenant_id == tenant_id,
        Teacher.class_id == class_id,
        Teacher.class_division_id == class_division_id,
        Teacher.is_deleted == False
    )
    
    if exclude_id:
        query = query.filter(Teacher.id != exclude_id)
        
    existing_teacher = query.first()
    if existing_teacher:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=[{
                "loc": ["body", "class_division_id"],
                "msg": f"This division is already assigned to teacher: {existing_teacher.full_name}",
                "type": "value_error"
            }]
        )

def create_teacher(db: Session, payload: TeacherCreate, created_by: int, tenant_id: int) -> Teacher:
    if tenant_id is None:
        raise ConflictException(
            "No school tenant is associated with this session. "
            "Sign in as a school administrator or use Login as Tenant."
        )

    check_mobile_duplicate(db, payload.mobile_number, tenant_id)
    check_division_assignment_conflict(db, tenant_id, payload.class_id, payload.class_division_id)
    
    teacher_code = generate_teacher_code(db, tenant_id)
    
    # Create or link user account
    user_id = None
    if payload.email:
        existing_user = (
            db.query(User)
            .filter(
                User.email == payload.email,
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if existing_user:
            existing_teacher = (
                db.query(Teacher)
                .filter(
                    Teacher.user_id == existing_user.id,
                    Teacher.tenant_id == tenant_id,
                    Teacher.is_deleted == False,  # noqa: E712
                )
                .first()
            )
            if existing_teacher:
                raise ConflictException(f"A teacher profile already exists for user: {payload.email}")
            user_id = existing_user.id
        elif user_service.get_user_by_email(db, payload.email):
            raise ConflictException(
                f"The email {payload.email} is already registered with another school."
            )
        else:
            # Create new user for teacher
            user_data = UserCreate(
                email=payload.email,
                full_name=payload.full_name,
                password="Teacher@123",
                role="TEACHER",
                tenant_id=tenant_id,
                phone_number=payload.mobile_number,
            )
            try:
                 new_user = user_service.create_user(db, user_data, created_by=created_by, tenant_id=tenant_id)
                 user_id = new_user.id
            except Exception as e:
                # Log but possibly continue or handle specific conflicts
                from app.core.logging_config import get_logger
                logger = get_logger(__name__)
                logger.error(f"Failed to create user for teacher: {str(e)}")
                # For consistency, we might want to fail teacher creation if user creation fails
                raise e

    db_teacher = Teacher(
        **payload.model_dump(),
        tenant_id=tenant_id,
        teacher_code=teacher_code,
        created_by=created_by,
        user_id=user_id
    )
    
    db.add(db_teacher)
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def update_teacher(db: Session, teacher_id: int, payload: TeacherUpdate, updated_by: int, tenant_id: int) -> Teacher:
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    
    if payload.mobile_number and payload.mobile_number != db_teacher.mobile_number:
        check_mobile_duplicate(db, payload.mobile_number, tenant_id, exclude_id=teacher_id)
        
    # Check division conflict if payload has class info
    if (payload.class_id is not None or payload.class_division_id is not None):
        new_class_id = payload.class_id if payload.class_id is not None else db_teacher.class_id
        new_div_id = payload.class_division_id if payload.class_division_id is not None else db_teacher.class_division_id
        
        if new_class_id != db_teacher.class_id or new_div_id != db_teacher.class_division_id:
            check_division_assignment_conflict(db, tenant_id, new_class_id, new_div_id, exclude_id=teacher_id)
        
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_teacher, key, value)
        
    db_teacher.updated_by = updated_by
    
    # Sync with User account if linked
    if db_teacher.user_id:
        user_update_data = {}
        if payload.full_name:
            user_update_data['full_name'] = payload.full_name
        if payload.mobile_number:
            user_update_data['phone_number'] = payload.mobile_number
        if payload.is_active is not None:
            user_update_data['is_active'] = payload.is_active
            
        if user_update_data:
            from app.schemas.user import UserUpdate
            user_service.update_user(db, db_teacher.user_id, UserUpdate(**user_update_data), updated_by=updated_by)

    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def toggle_teacher_status(db: Session, teacher_id: int, updated_by: int, tenant_id: int) -> Teacher:
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    db_teacher.is_active = not db_teacher.is_active
    db_teacher.updated_by = updated_by
    db.commit()
    db.refresh(db_teacher)
    return db_teacher

def soft_delete_teacher(db: Session, teacher_id: int, deleted_by: int, tenant_id: int) -> None:
    from datetime import datetime
    db_teacher = get_teacher_by_id(db, teacher_id, tenant_id)
    db_teacher.is_deleted = True
    db_teacher.deleted_at = datetime.utcnow()
    db_teacher.deleted_by = deleted_by
    
    # Sync with User account if linked - deactivate user
    if db_teacher.user_id:
        user_service.update_user(
            db, 
            db_teacher.user_id, 
            UserUpdate(is_active=False), 
            updated_by=deleted_by
        )
        
    db.commit()


def get_teacher_class_division_pairs(
    db: Session,
    tenant_id: int,
    teacher_id: int,
    academic_year_id: Optional[int] = None,
) -> list[tuple[int, int]]:
    """
    Class-teacher homeroom slots only (subject_id IS NULL) for attendance mark/report.
    Supports multiple class/division pairs per teacher. Legacy fallback when no CT rows exist.
    """
    pairs: set[tuple[int, int]] = set()
    try:
        rows = db.execute(
            text(
                """
                SELECT ta.class_id, ta.class_division_id
                FROM teacher_assignments ta
                WHERE ta.tenant_id = :tenant_id
                  AND ta.teacher_id = :teacher_id
                  AND ta.is_active = 1
                  AND ta.subject_id IS NULL
                  AND (:academic_year_id IS NULL OR ta.academic_year_id = :academic_year_id)
                """
            ),
            {
                "tenant_id": tenant_id,
                "teacher_id": teacher_id,
                "academic_year_id": academic_year_id,
            },
        ).mappings().all()
        for row in rows:
            if row["class_id"] and row["class_division_id"]:
                pairs.add((int(row["class_id"]), int(row["class_division_id"])))
    except SQLAlchemyError:
        pass

    if pairs:
        return sorted(pairs)

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.id == teacher_id,
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,
        )
        .first()
    )
    if teacher and teacher.class_id and teacher.class_division_id:
        return [(int(teacher.class_id), int(teacher.class_division_id))]
    return []


def resolve_teacher_for_user(
    db: Session, tenant_id: int, user_id: int, email: Optional[str] = None
) -> Optional[Teacher]:
    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,
            Teacher.is_active == True,
            Teacher.user_id == user_id,
        )
        .first()
    )
    if teacher:
        return teacher
    if not email:
        return None
    return (
        db.query(Teacher)
        .filter(
            Teacher.tenant_id == tenant_id,
            Teacher.is_deleted == False,
            Teacher.is_active == True,
            Teacher.email == email,
        )
        .first()
    )
