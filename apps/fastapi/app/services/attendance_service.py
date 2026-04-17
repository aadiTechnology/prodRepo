from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import date, datetime
from fastapi import HTTPException
from app.models.academic import AcademicYear
from app.models.student import Student
from app.models.student_attendance import StudentAttendance
from app.schemas.attendance_schema import MarkAttendanceRequest, AttendanceListResponse, AttendanceResponse

class AttendanceService:
    def __init__(self, db: Session):
        self.db = db

    def get_attendance_grid(self, attendance_date: date, class_id: int, division_id: int, tenant_id: int) -> AttendanceListResponse:
        # 1. Fetch all active students for this class/division
        students = (
            self.db.query(Student)
            .filter(
                Student.tenant_id == tenant_id,
                Student.class_id == class_id,
                Student.class_division_id == division_id,
                Student.is_active == True
            )
            .order_by(Student.roll_no, Student.student_name)
            .all()
        )

        # 2. Fetch existing attendance records for the date
        existing_attendance = {
            att.student_id: att 
            for att in self.db.query(StudentAttendance)
            .filter(
                StudentAttendance.tenant_id == tenant_id,
                StudentAttendance.attendance_date == attendance_date,
                StudentAttendance.class_id == class_id,
                StudentAttendance.class_division_id == division_id
            ).all()
        }

        # 3. Build response grid
        grid = []
        for s in students:
            att_record = existing_attendance.get(s.id)
            grid.append(AttendanceResponse(
                student_id=s.id,
                student_name=s.student_name,
                roll_no=s.roll_no,
                status=att_record.status if att_record else None,
                remarks=att_record.remarks if att_record else None
            ))

        return AttendanceListResponse(
            date=attendance_date,
            class_id=class_id,
            class_division_id=division_id,
            attendance=grid
        )

    def mark_attendance(self, req: MarkAttendanceRequest, current_user):
        try:
            # 1. Fetch Academic Year and Validate Date
            academic_year = self.db.query(AcademicYear).filter(
                AcademicYear.id == req.academic_year_id,
                AcademicYear.tenant_id == current_user.tenant_id,
                AcademicYear.is_deleted == False
            ).first()
            
            if not academic_year:
                raise HTTPException(status_code=404, detail="Academic year not found")
                
            if not (academic_year.start_date <= req.attendance_date <= academic_year.end_date):
                raise HTTPException(status_code=400, detail="Outside academic year you are not able to mark attendance")

            # 2. Process each record
            for record in req.records:
                # Check for existing record to update, else create new
                existing = self.db.query(StudentAttendance).filter(
                    StudentAttendance.tenant_id == current_user.tenant_id,
                    StudentAttendance.student_id == record.student_id,
                    StudentAttendance.attendance_date == req.attendance_date,
                    StudentAttendance.is_deleted == False
                ).first()

                print(f"DEBUG: Record for student {record.student_id} on {req.attendance_date}: {'Found' if existing else 'Not Found'}")

                if existing:
                    existing.status = record.status
                    existing.remarks = record.remarks
                    existing.updated_at = datetime.now()
                    existing.updated_by = current_user.id
                else:
                    new_attendance = StudentAttendance(
                        tenant_id=req.tenant_id,
                        academic_year_id=req.academic_year_id,
                        student_id=record.student_id,
                        class_id=req.class_id,
                        class_division_id=req.class_division_id,
                        attendance_date=req.attendance_date,
                        status=record.status,
                        remarks=record.remarks,
                        created_by=current_user.id
                    )
                    self.db.add(new_attendance)

            self.db.commit()
            return {"message": "Attendance marked successfully"}
        except Exception as e:
            self.db.rollback()
            raise e
