from __future__ import annotations

from datetime import datetime
import re

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.lead import Lead, LeadStatus, LeadParent
from app.models.student import Student
from app.models.student_fee_assignment import StudentFeeAssignment
from app.schemas.student_fee_assignment import StudentFeeAssignmentCreate
from app.services import student_fee_assignment_service


class EnrollmentService:
    def __init__(self, db: Session):
        self.db = db

    def get_prefill_from_lead(self, tenant_id: int, lead_id: int) -> dict:
        lead = (
            self.db.query(Lead)
            .filter(
                Lead.id == lead_id,
                Lead.tenant_id == tenant_id,
                Lead.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        parent = lead.parent
        converted_student: Student | None = None
        latest_fee_assignment: StudentFeeAssignment | None = None
        if lead.converted_to_student_id:
            converted_student = (
                self.db.query(Student)
                .filter(
                    Student.id == lead.converted_to_student_id,
                    Student.tenant_id == tenant_id,
                )
                .first()
            )
            if converted_student:
                latest_fee_assignment = (
                    self.db.query(StudentFeeAssignment)
                    .filter(StudentFeeAssignment.student_id == converted_student.id)
                    .order_by(StudentFeeAssignment.id.desc())
                    .first()
                )

        return {
            "lead_id": lead.id,
            "student_name": lead.child_name,
            "date_of_birth": lead.child_dob,
            "gender": lead.child_gender,
            "parent_name": parent.parent_name if parent else None,
            "mobile_number": parent.mobile_number if parent else None,
            "email": parent.email if parent else None,
            "academic_year_id": (
                (latest_fee_assignment.academic_year_id if latest_fee_assignment else None)
                or (converted_student.academic_year_id if converted_student else None)
                or lead.preferred_academic_year_id
            ),
            "class_id": (converted_student.class_id if converted_student else None) or lead.preferred_class_id,
            "class_division_id": converted_student.class_division_id if converted_student else None,
            "fee_structure_id": latest_fee_assignment.fee_structure_id if latest_fee_assignment else None,
            "discount_id": latest_fee_assignment.discount_id if latest_fee_assignment else None,
            "expected_admission_date": lead.expected_admission_date,
            "birth_certificate_url": converted_student.birth_certificate_url if converted_student else None,
            "photo_url": converted_student.photo_url if converted_student else None,
        }

    def _get_or_create_parent(
        self,
        tenant_id: int,
        parent_name: str,
        mobile_number: str,
        email: str | None,
        user_id: int,
    ) -> LeadParent:
        parent = (
            self.db.query(LeadParent)
            .filter(
                LeadParent.tenant_id == tenant_id,
                LeadParent.mobile_number == mobile_number,
                LeadParent.is_deleted == False,  # noqa: E712
            )
            .first()
        )
        if parent:
            parent.parent_name = parent_name
            if email is not None:
                parent.email = email
            parent.updated_by = user_id
            parent.updated_at = datetime.utcnow()
            self.db.flush()
            return parent

        parent = LeadParent(
            tenant_id=tenant_id,
            parent_name=parent_name,
            mobile_number=mobile_number,
            email=email,
            created_by=user_id,
        )
        self.db.add(parent)
        self.db.flush()
        return parent

    def _admission_no_prefix(self, tenant_id: int) -> str:
        return f"ADM-{tenant_id}-"

    def _format_admission_no(self, tenant_id: int, sequence: int) -> str:
        return f"{self._admission_no_prefix(tenant_id)}{sequence:06d}"

    def _next_admission_sequence(self, tenant_id: int) -> int:
        prefix = self._admission_no_prefix(tenant_id)
        rows = (
            self.db.query(Student.admission_no)
            .filter(
                Student.tenant_id == tenant_id,
                Student.admission_no.isnot(None),
            )
            .all()
        )
        max_seq = 0
        for (admission_no,) in rows:
            val = (admission_no or "").strip()
            if not val:
                continue
            if val.startswith(prefix):
                suffix = val[len(prefix) :]
                if suffix.isdigit():
                    max_seq = max(max_seq, int(suffix))
                    continue
            match = re.search(r"(\d+)\s*$", val)
            if match:
                max_seq = max(max_seq, int(match.group(1)))
        return max_seq + 1

    def get_next_admission_no(self, tenant_id: int) -> str:
        return self._format_admission_no(tenant_id, self._next_admission_sequence(tenant_id))

    def _generate_admission_no(self, tenant_id: int) -> str:
        start_seq = self._next_admission_sequence(tenant_id)
        for offset in range(20):
            candidate = self._format_admission_no(tenant_id, start_seq + offset)
            exists = (
                self.db.query(Student.id)
                .filter(
                    Student.tenant_id == tenant_id,
                    Student.admission_no == candidate,
                )
                .first()
            )
            if not exists:
                return candidate
        raise HTTPException(status_code=500, detail="Unable to generate admission number")

    def enroll(self, tenant_id: int, user_id: int, payload) -> dict:
        try:
            lead: Lead | None = None
            if payload.lead_id:
                lead = (
                    self.db.query(Lead)
                    .filter(
                        Lead.id == payload.lead_id,
                        Lead.tenant_id == tenant_id,
                        Lead.is_deleted == False,  # noqa: E712
                    )
                    .first()
                )
                if not lead:
                    raise HTTPException(status_code=404, detail="Lead not found")
                if lead.converted_to_student_id:
                    raise HTTPException(status_code=400, detail="Lead already converted to student")

            parent = self._get_or_create_parent(
                tenant_id=tenant_id,
                parent_name=payload.parent_name,
                mobile_number=payload.mobile_number,
                email=payload.email,
                user_id=user_id,
            )

            admission_no = (payload.admission_no or "").strip() or self._generate_admission_no(tenant_id)

            student = Student(
                tenant_id=tenant_id,
                student_name=payload.student_name,
                student_code=admission_no,
                date_of_birth=payload.date_of_birth,
                gender=payload.gender,
                admission_no=admission_no,
                admission_date=payload.admission_date,
                academic_year_id=payload.academic_year_id,
                class_id=payload.class_id,
                class_division_id=payload.class_division_id,
                roll_no=payload.roll_no,
                parent_id=parent.id,
                mobile_number=payload.mobile_number,
                email=payload.email,
                parent_name=payload.parent_name,
                address=parent.address,
                area=parent.society,
                city=parent.city,
                state=parent.state,
                pincode=parent.pin_code,
                birth_certificate_url=payload.birth_certificate_url,
                photo_url=payload.photo_url,
                is_active=True,
            )
            self.db.add(student)
            self.db.flush()

            fee_payload = StudentFeeAssignmentCreate(
                student_id=student.id,
                academic_year_id=payload.academic_year_id,
                fee_structure_id=payload.fee_structure_id,
                discount_id=payload.discount_id,
                additional_fee=payload.additional_fee,
            )
            fee_result = student_fee_assignment_service.assign_fee_to_student(
                self.db,
                fee_payload,
                auto_commit=False,
            )

            if lead:
                lead.converted_to_student_id = student.id
                lead.converted_at = datetime.utcnow()
                lead.converted_by = user_id

                converted_status = (
                    self.db.query(LeadStatus)
                    .filter(
                        (LeadStatus.code.ilike("converted")) | (LeadStatus.name.ilike("converted")),
                        LeadStatus.is_active == True,  # noqa: E712
                    )
                    .order_by(LeadStatus.id.desc())
                    .first()
                )
                if converted_status:
                    lead.lead_status_id = converted_status.id

            self.db.commit()
            self.db.refresh(student)

            # Create User for Student
            created_user = None
            try:
                from app.services import user_service, profile_image_service
                from app.schemas.user import UserCreate
                from app.models.user import User
                from app.utils.student_login_email import normalize_email, resolve_student_login_email
                from app.core.exceptions import ConflictException

                taken = {
                    normalize_email(row[0])
                    for row in self.db.query(User.email).filter(User.is_deleted == False).all()  # noqa: E712
                    if row[0]
                }
                user_email = resolve_student_login_email(
                    payload.email or student.email,
                    student.admission_no or student.student_code or str(student.id),
                    taken,
                )
                user_create = UserCreate(
                    email=user_email,
                    full_name=student.student_name,
                    password=student.mobile_number or "student@123", # default password
                    role="STUDENT",
                    tenant_id=tenant_id
                )
                try:
                    created_user = user_service.create_user(
                        self.db,
                        user=user_create,
                        role="STUDENT",
                        created_by=user_id,
                        tenant_id=tenant_id
                    )
                except ConflictException:
                    created_user = profile_image_service._resolve_user_for_student(self.db, student)
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to create user for enrolled student {student.id}: {e}")

            if payload.photo_url:
                from app.services import profile_image_service

                login_user = created_user or profile_image_service._resolve_user_for_student(self.db, student)
                if login_user:
                    profile_image_service.save_user_profile_image(
                        self.db,
                        login_user.id,
                        payload.photo_url,
                    )
                else:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Enrollment photo saved for student %s but no login user was found to sync profile image",
                        student.id,
                    )

            printable = {
                "student": {
                    "id": student.id,
                    "name": student.student_name,
                    "admission_no": student.admission_no,
                    "admission_date": str(student.admission_date) if student.admission_date else None,
                },
                "parent": {
                    "name": parent.parent_name,
                    "mobile_number": parent.mobile_number,
                },
                "fee": fee_result,
                "generated_at": datetime.utcnow().isoformat(),
            }

            return {
                "message": "Enrollment completed successfully",
                "student_id": student.id,
                "admission_no": student.admission_no,
                "fee_assignment": fee_result,
                "printable": printable,
            }
        except HTTPException:
            self.db.rollback()
            raise
        except SQLAlchemyError:
            self.db.rollback()
            raise HTTPException(status_code=500, detail="Enrollment failed. Please try again")
