from app.models.student import Student
from app.models.student_fee_assignment import StudentFeeAssignment
from app.models.academic import AcademicYear, SchoolClass, ClassDivision
from app.models.fee import FeeStructure
from app.models.fee_discount import FeeDiscount
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from app.models.academic import SchoolClass, ClassDivision
from app.schemas.student_schema import StudentListResponse, StudentUpdateRequest, StudentDetailResponse
from typing import Optional

class StudentService:
    def __init__(self, db: Session):
        self.db = db

    def get_students(self, page=1, limit=10, search=None, class_id=None, class_=None, status=None, tenant_id=None, division_id=None):
        from app.schemas.student_schema import StudentListItem, Pagination, StudentListResponse
        query = (
            self.db.query(Student, SchoolClass, ClassDivision)
            .join(SchoolClass, Student.class_id == SchoolClass.id, isouter=True)
            .join(ClassDivision, ClassDivision.id == Student.class_division_id, isouter=True)
        )
        # Build dynamic filters (from stashed changes)
        filters = []
        if tenant_id:
            filters.append(Student.tenant_id == tenant_id)
        if search is not None and isinstance(search, str) and search.strip() != "":
            like = f"%{search.strip()}%"
            filters.append(or_(Student.student_name.ilike(like), Student.student_code.ilike(like), Student.mobile_number.ilike(like)))
        if class_id is not None:
            filters.append(Student.class_id == class_id)
        if division_id is not None:
            filters.append(Student.class_division_id == division_id)
        if class_ is not None and isinstance(class_, str) and class_.strip() != "":
            filters.append(SchoolClass.name == class_.strip())
        if status is not None and isinstance(status, str) and status.strip() != "":
            is_active = status.lower() == "active"
            filters.append(Student.is_active == is_active)
        if filters:
            query = query.filter(and_(*filters))
        total = query.count()
        results = query.order_by(Student.id).offset((page - 1) * limit).limit(limit).all()
        data = []
        for student, school_class, class_division in results:
            class_name = school_class.name if school_class else ""
            division_name = class_division.division_name if class_division else ""
            if class_name and division_name:
                class_display = f"{class_name}-{division_name}"
            elif class_name:
                class_display = class_name
            else:
                class_display = f"Class {student.class_id}" if student.class_id else "Unknown"
            data.append(
                StudentListItem(
                    id=str(student.id),
                    name=student.student_name,
                    gender=student.gender,
                    mobile=student.mobile_number,
                    roll_no=student.roll_no,
                    class_=class_display,
                    class_id=student.class_id,
                    class_division_id=student.class_division_id,
                    status="Active" if student.is_active else "Inactive"
                )
            )
        pagination = Pagination(page=page, limit=limit, total=total)
        return StudentListResponse(data=data, pagination=pagination)

    class NotFound(Exception):
        pass
    class AccessDenied(Exception):
        pass

    def get_student_by_id(self, student_id: str, tenant_id: int = None) -> Optional[StudentDetailResponse]:
        query = self.db.query(Student)
        if tenant_id:
            query = query.filter(Student.tenant_id == tenant_id)
        
        if str(student_id).isdigit():
            student = query.filter(Student.id == int(student_id)).first()
        else:
            student = query.filter(Student.student_code == student_id).first()
        if not student:
            return None
        latest_assignment = (
            self.db.query(StudentFeeAssignment)
            .filter(StudentFeeAssignment.student_id == student.id)
            .order_by(StudentFeeAssignment.id.desc())
            .first()
        )
        effective_academic_year_id = student.academic_year_id or (latest_assignment.academic_year_id if latest_assignment else None)
        effective_fee_structure_id = student.fee_structure_id or (latest_assignment.fee_structure_id if latest_assignment else None)
        effective_discount_id = latest_assignment.discount_id if latest_assignment else None

        academic_year_name = None
        class_name = None
        division_name = None
        fee_structure_name = None
        discount_name = None

        if effective_academic_year_id:
            ay = self.db.query(AcademicYear).filter(AcademicYear.id == effective_academic_year_id).first()
            academic_year_name = ay.name if ay else None
        if student.class_id:
            cls = self.db.query(SchoolClass).filter(SchoolClass.id == student.class_id).first()
            class_name = cls.name if cls else None
            if not effective_academic_year_id and cls and cls.academic_year_id:
                effective_academic_year_id = cls.academic_year_id
        if student.class_division_id:
            div = self.db.query(ClassDivision).filter(ClassDivision.id == student.class_division_id).first()
            division_name = div.division_name if div else None
        if effective_fee_structure_id:
            fs = self.db.query(FeeStructure).filter(FeeStructure.id == effective_fee_structure_id).first()
            fee_structure_name = fs.name if fs and fs.name else (f"Fee Structure #{effective_fee_structure_id}" if fs else None)
        if effective_discount_id:
            disc = self.db.query(FeeDiscount).filter(FeeDiscount.id == effective_discount_id).first()
            discount_name = disc.discount_name if disc else None
        dob = student.date_of_birth
        if dob is not None and not isinstance(dob, str):
            dob = dob.isoformat()
        parent_name = None
        parent_mobile = None
        if student.parent_id:
            from app.models.lead import LeadParent
            parent = self.db.query(LeadParent).filter(LeadParent.id == student.parent_id).first()
            if parent:
                parent_name = parent.parent_name
                parent_mobile = parent.mobile_number
        return StudentDetailResponse(
            id=student.student_code or str(student.id),
            name=student.student_name,
            gender=student.gender,
            date_of_birth=dob,
            mobile=student.mobile_number,
            roll_no=student.roll_no,
            email=student.email,
            address=student.address,
            area=student.area,
            city=student.city,
            state=student.state,
            pincode=student.pincode,
            class_id=student.class_id,
            class_division_id=student.class_division_id,
            class_name=class_name,
            class_division_name=division_name,
            academic_year_id=effective_academic_year_id,
            academic_year_name=academic_year_name,
            fee_structure_id=effective_fee_structure_id,
            fee_structure_name=fee_structure_name,
            discount_id=effective_discount_id,
            discount_name=discount_name,
            is_active=student.is_active,
            parent_id=student.parent_id,
            parent_name=parent_name,
            parent_mobile=parent_mobile,
            admission_no=student.admission_no,
            birth_certificate_url=student.birth_certificate_url,
            photo_url=student.photo_url,
            created_at=student.created_at.isoformat() if student.created_at else None,
            updated_at=student.updated_at.isoformat() if student.updated_at else None
        )

    def add_student(self, req, user):
        from app.models.lead import LeadParent
        from app.schemas.student_schema import StudentCreateResponse
        import re, random, string
        # 1. Extract tenant_id from user (Remote update requirement)
        tenant_id = getattr(user, "tenant_id", None) or getattr(user, "tenantId", None)
        if not tenant_id:
            raise Exception("Tenant ID missing from token")
        try:
            # Validate required fields
            if not req.student_name or not req.gender or not req.date_of_birth or not req.mobile_number or not req.class_id:
                raise ValueError("Missing required fields")
            if not re.fullmatch(r"\d{10}", req.mobile_number):
                raise ValueError("Invalid mobile number. Must be 10 digits.")
            # Check/Create parent
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
                self.db.add(parent)
                self.db.flush()
            # Generate codes
            def gen_code(prefix):
                return prefix + ''.join(random.choices(string.digits, k=6))
            student = Student(
                tenant_id=tenant_id,
                student_name=req.student_name,
                gender=req.gender,
                date_of_birth=req.date_of_birth,
                mobile_number=req.mobile_number,
                roll_no=getattr(req, 'roll_no', None),
                email=req.email,
                address=getattr(req, 'address', None),
                area=getattr(req, 'area', None),
                city=getattr(req, 'city', None),
                state=getattr(req, 'state', None),
                pincode=getattr(req, 'pincode', None),
                class_id=req.class_id,
                class_division_id=req.class_division_id,
                is_active=True,
                parent_id=parent.id,
                student_code=gen_code("STU"),
                admission_no=gen_code("ADM"),
                birth_certificate_url=getattr(req, 'birth_certificate_url', None),
                photo_url=getattr(req, 'photo_url', None)
            )
            self.db.add(student)
            self.db.commit()
            self.db.refresh(student)

            # Create User for Student
            try:
                from app.services import user_service
                from app.schemas.user import UserCreate
                from app.models.user import User
                from app.utils.student_login_email import normalize_email, resolve_student_login_email

                taken = {
                    normalize_email(row[0])
                    for row in self.db.query(User.email).filter(User.is_deleted == False).all()  # noqa: E712
                    if row[0]
                }
                user_email = resolve_student_login_email(
                    req.email or getattr(req.parent, "email", None) or student.email,
                    student.admission_no or student.student_code or str(student.id),
                    taken,
                )
                user_create = UserCreate(
                    email=user_email,
                    full_name=student.student_name,
                    password=student.mobile_number, # default password
                    role="STUDENT",
                    tenant_id=tenant_id
                )
                user_service.create_user(
                    self.db,
                    user=user_create,
                    role="STUDENT",
                    created_by=getattr(user, "id", None) if user else None,
                    tenant_id=tenant_id
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to create user for student {student.id}: {e}")

            return StudentCreateResponse(message="Student created successfully", student_id=student.id)
        except Exception as e:
            self.db.rollback()
            raise e

    def update_student(self, student_id: str, req: StudentUpdateRequest, tenant_id: int = None):
        query = self.db.query(Student)
        if tenant_id:
            query = query.filter(Student.tenant_id == tenant_id)
            
        if str(student_id).isdigit():
            student = query.filter(Student.id == int(student_id)).first()
        else:
            student = query.filter(Student.student_code == student_id).first()
        if not student:
            raise StudentService.NotFound()
        for field, value in req.dict(exclude_unset=True).items():
            if field == "parent":
                continue
            setattr(student, field, value)
        self.db.commit()
        self.db.refresh(student)
        return {"success": True}

    def soft_delete_student(self, student_id: str, tenant_id: int = None):
        query = self.db.query(Student)
        if tenant_id:
            query = query.filter(Student.tenant_id == tenant_id)
            
        if str(student_id).isdigit():
            student = query.filter(Student.id == int(student_id)).first()
        else:
            student = query.filter(Student.student_code == student_id).first()
            
        if not student:
            raise StudentService.NotFound()
            
        student.is_active = False
        self.db.commit()
        return {"success": True}
