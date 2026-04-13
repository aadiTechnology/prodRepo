from app.models.student import Student
from sqlalchemy.orm import Session
from app.models.academic import SchoolClass, ClassDivision
from app.schemas.student_schema import StudentListResponse, StudentUpdateRequest, StudentDetailResponse
from typing import Optional



class StudentService:
    def get_students(self, page=1, limit=10, search=None, class_id=None, class_=None, status=None):
        from app.schemas.student_schema import StudentListItem, Pagination, StudentListResponse
        query = self.db.query(Student)
        if search:
            query = query.filter(Student.student_name.ilike(f"%{search}%"))
        if class_id:
            query = query.filter(Student.class_id == class_id)
        if status:
            if status.lower() == "active":
                query = query.filter(Student.is_active == True)
            elif status.lower() == "inactive":
                query = query.filter(Student.is_active == False)
        total = query.count()
        students = query.order_by(Student.id).offset((page - 1) * limit).limit(limit).all()
        data = []
        for s in students:
            # Get class name if available
            class_name = s.class_model.name if s.class_model else ""
            # Ensure id is always a string and not None
            sid = s.student_code if getattr(s, 'student_code', None) else s.id
            sid_str = str(sid) if sid is not None else ""
            data.append(
                StudentListItem(
                    id=sid_str,
                    name=s.student_name,
                    gender=getattr(s, 'gender', None),
                    mobile=getattr(s, 'mobile_number', None),
                    class_=class_name,
                    status="Active" if getattr(s, 'is_active', True) else "Inactive"
                )
            )
        pagination = Pagination(page=page, limit=limit, total=total)
        return StudentListResponse(data=data, pagination=pagination)
    class NotFound(Exception):
        pass
    class AccessDenied(Exception):
        pass

    def get_student_by_id(self, student_id: str) -> Optional[StudentDetailResponse]:
        query = self.db.query(Student)
        if str(student_id).isdigit():
            student = query.filter(Student.id == int(student_id)).first()
        else:
            student = query.filter(Student.student_code == student_id).first()
        if not student:
            return None
        dob = student.date_of_birth
        if dob is not None and not isinstance(dob, str):
            dob = dob.isoformat()
        parent_name = None
        parent_mobile = None
        if student and getattr(student, 'parent_id', None):
            from app.models.lead import LeadParent
            parent = self.db.query(LeadParent).filter(LeadParent.id == student.parent_id).first()
            if parent:
                parent_name = parent.parent_name
                parent_mobile = parent.mobile_number
        return StudentDetailResponse(
            id=student.student_code if student.student_code else str(student.id),
            name=student.student_name,
            gender=student.gender,
            date_of_birth=dob,
            mobile=student.mobile_number,
            email=student.email,
            address=student.address,
            area=student.area,
            city=student.city,
            state=student.state,
            pincode=student.pincode,
            class_id=student.class_id,
            class_division_id=student.class_division_id,
            is_active=student.is_active,
            parent_id=student.parent_id,
            parent_name=parent_name,
            parent_mobile=parent_mobile,
            admission_no=student.admission_no,
            created_at=student.created_at.isoformat() if student.created_at else None,
            updated_at=student.updated_at.isoformat() if student.updated_at else None
        )

    def __init__(self, db: Session):
        self.db = db

    def add_student(self, req, user):
        from app.models.lead import LeadParent
        from app.models.student import Student
        from app.models.academic import ClassDivision
        from app.schemas.student_schema import StudentCreateResponse
        import re, random, string

        # 1. Extract tenant_id from user (Pydantic model safe)
        tenant_id = getattr(user, "tenant_id", None) or getattr(user, "tenantId", None)
        print("Tenant ID:", tenant_id)
        if not tenant_id:
            raise Exception("Tenant ID missing from token")

        try:
            # Validate required fields
            if not req.student_name or not req.gender or not req.date_of_birth or not req.mobile_number or not req.class_id or not req.class_division_id:
                raise ValueError("Missing required fields")
            # Validate mobile number (10 digits)
            if not re.fullmatch(r"\d{10}", req.mobile_number):
                raise ValueError("Invalid mobile number. Must be 10 digits.")
            # Validate email (if provided)
            if req.email and not re.fullmatch(r"[^@]+@[^@]+\.[^@]+", req.email):
                raise ValueError("Invalid email format.")

            # Check if parent exists by mobile_number and tenant_id
            parent = self.db.query(LeadParent).filter(
                LeadParent.mobile_number == req.parent.mobile_number,
                LeadParent.tenant_id == tenant_id
            ).first()
            if not parent:
                parent = LeadParent(
                    parent_name=req.parent.parent_name,
                    mobile_number=req.parent.mobile_number,
                    tenant_id=tenant_id
                )
                try:
                    self.db.add(parent)
                    self.db.flush()  # get parent.id
                except Exception as e:
                    print("DB ERROR (parent insert):", str(e))
                    self.db.rollback()
                    raise Exception("Database error while inserting parent")

            # Generate student_code and admission_no
            def gen_code(prefix):
                return prefix + ''.join(random.choices(string.digits, k=6))
            student_code = gen_code("STU")
            admission_no = gen_code("ADM")

            # Insert student
            student = Student(
                tenant_id=tenant_id,
                student_name=req.student_name,
                gender=req.gender,
                date_of_birth=req.date_of_birth,
                mobile_number=req.mobile_number,
                email=req.email,
                address=getattr(req, 'address', None),
                area=getattr(req, 'area', None),
                city=getattr(req, 'city', None),
                state=getattr(req, 'state', None),
                pincode=getattr(req, 'pincode', None),
                class_id=req.class_id,
                class_division_id=req.class_division_id,
                is_active=req.is_active,
                parent_id=parent.id,
                student_code=student_code,
                admission_no=admission_no
            )
            self.db.add(student)
            self.db.commit()
            self.db.refresh(student)
            return StudentCreateResponse(message="Student created successfully", student_id=student.id)
        except ValueError as ve:
            self.db.rollback()
            raise ve
        except Exception as e:
            self.db.rollback()
            print("DB ERROR (student insert):", str(e))
            import traceback; traceback.print_exc()
            raise Exception("Database error")

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

    def update_student(self, student_id: str, req: StudentUpdateRequest):
        if str(student_id).isdigit():
            student = self.db.query(Student).filter(Student.id == int(student_id), Student.is_active == True).first()
        else:
            student = self.db.query(Student).filter(Student.student_code == student_id, Student.is_active == True).first()
        if not student:
            raise StudentService.NotFound()
        for field, value in req.dict(exclude_unset=True).items():
            if field == "parent":
                # Handle parent update logic here if needed
                continue
            setattr(student, field, value)
        self.db.commit()
        self.db.refresh(student)
        return {"success": True}

    def soft_delete_student(self, student_id: str):
        if str(student_id).isdigit():
            student = self.db.query(Student).filter(Student.id == int(student_id), Student.is_active == True).first()
        else:
            student = self.db.query(Student).filter(Student.student_code == student_id, Student.is_active == True).first()
        if not student:
            raise StudentService.NotFound()
        student.is_active = False
        self.db.commit()
        return {"success": True}
