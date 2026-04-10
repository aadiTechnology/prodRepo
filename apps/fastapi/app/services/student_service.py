from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from app.models.student import Student
from app.models.academic import SchoolClass, ClassDivision
from app.schemas.student_schema import StudentListResponse, StudentUpdateRequest
from typing import Optional

class StudentService:
    class NotFound(Exception): pass
    class AccessDenied(Exception): pass

    def __init__(self, db: Session):
        self.db = db

    def get_students(self, page: int, limit: int, search: Optional[str], class_id: Optional[int], class_: Optional[str], status: Optional[str]):
        # Debug log for query params
        print("Query Params:", {"page": page, "limit": limit, "search": search, "class_id": class_id, "status": status})

        query = (
            self.db.query(Student, SchoolClass, ClassDivision)
            .join(SchoolClass, Student.class_id == SchoolClass.id, isouter=True)
            .join(ClassDivision, ClassDivision.class_id == SchoolClass.id, isouter=True)
        )

        # Build dynamic filters
        filters = []
        if search is not None and isinstance(search, str) and search.strip() != "":
            like = f"%{search.strip()}%"
            filters.append(or_(Student.student_name.ilike(like), Student.student_code.ilike(like), Student.mobile_number.ilike(like)))
        if class_id is not None:
            filters.append(Student.class_id == class_id)
        if class_ is not None and isinstance(class_, str) and class_.strip() != "":
            filters.append(SchoolClass.class_name == class_.strip())
        if status is not None and isinstance(status, str) and status.strip() != "":
            is_active = status.lower() == "active"
            filters.append(Student.is_active == is_active)
        if filters:
            query = query.filter(and_(*filters))

        # Debug log for filters
        print("Final WHERE filters:", filters)

        try:
            total = query.count()
            students = query.order_by(Student.created_at.desc()).offset((page-1)*limit).limit(limit).all()
        except Exception as error:
            print("DB ERROR:", error)
            import traceback; traceback.print_exc()
            # Return empty result on DB error instead of 500
            from app.schemas.student_schema import StudentListItem, Pagination, StudentListResponse
            pagination = Pagination(page=page, limit=limit, total=0)
            return StudentListResponse(data=[], pagination=pagination)

        from app.schemas.student_schema import StudentListItem, Pagination, StudentListResponse
        data = []
        for student, school_class, class_division in students:
            # Defensive: handle missing class/division gracefully
            class_name = None
            if school_class is not None:
                class_name = school_class.name
            elif getattr(student, "class_id", None):
                class_name = f"Class {student.class_id}"
            division_name = None
            if class_division is not None:
                division_name = class_division.division_name
                if class_name and division_name:
                    class_display = f"{class_name}-{division_name}"
                elif class_name:
                    class_display = class_name
                else:
                    class_display = f"Class {getattr(student, 'class_id', 'Unknown')}"
                if not class_display or class_display is None:
                    class_display = f"Class {getattr(student, 'class_id', 'Unknown')}"
            # Robust debug log for each row
            print(f"[STUDENT DEBUG] StudentID: {student.id}, Name: {student.student_name}, Class: {class_name}, Division: {division_name}, Class_Display: {class_display}")
            data.append(StudentListItem(
                id=student.student_code or str(student.id),
                name=student.student_name,
                gender=student.gender,
                mobile=student.mobile_number,
                class_=class_display,
                status="Active" if student.is_active else "Inactive"
            ))
        pagination = Pagination(page=page, limit=limit, total=total)
        return StudentListResponse(data=data, pagination=pagination)

    def update_student(self, student_id: int, req: StudentUpdateRequest):
        student = self.db.query(Student).filter(Student.id == student_id, Student.is_active == True).first()
        if not student:
            raise StudentService.NotFound()
        for field, value in req.dict(exclude_unset=True).items():
            setattr(student, field, value)
        self.db.commit()
        self.db.refresh(student)
        return {"success": True}

    def soft_delete_student(self, student_id: int):
        student = self.db.query(Student).filter(Student.id == student_id, Student.is_active == True).first()
        if not student:
            raise StudentService.NotFound()
        student.is_active = False
        self.db.commit()
        return {"success": True}
