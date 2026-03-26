# PDF download support
from fastapi.responses import Response
import io
from app.models.student import Student
from app.models.student_fee_ledger import FeeLedger
# Student Fee Ledger Router
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.schemas.student_fee_ledger import (
    StudentDropdownListResponse, StudentDropdown, FeeLedgerResponse, ErrorResponse,
    FeeInstallmentSchema, FeeLedgerSummarySchema, StudentLedgerSchema
)
from datetime import date, datetime
from typing import List
import logging

router = APIRouter(
    prefix="/api/fee-ledger",
    tags=["Student Fee Ledger"]
)
logger = logging.getLogger("student_fee_ledger")


def _get_paid_for_installment(db, student_id: int, installment_id: int, tenant_id: int) -> float:
    """Sum all payments made for a specific installment by a student."""
    from app.models.fee_payment import FeePayment
    total = db.query(func.sum(FeePayment.paid_amount)).filter(
        FeePayment.student_id == student_id,
        FeePayment.fee_installment_id == installment_id,
        FeePayment.tenant_id == tenant_id,
        FeePayment.paid_amount.isnot(None),
    ).scalar()
    return float(total or 0)


def _get_fee_structures_for_student(db, student, tenant_id: int, academic_year: str):
    """Get applicable fee structures for a student, with multiple fallback strategies."""
    from app.models.fee import FeeStructure
    from app.models.academic import AcademicYear

    class_id = getattr(student, 'class_id', None)
    student_fee_structure_id = getattr(student, 'fee_structure_id', None)

    # Strategy 1: direct fee_structure_id on student
    if student_fee_structure_id:
        structs = db.query(FeeStructure).filter(FeeStructure.id == student_fee_structure_id).all()
        if structs:
            logger.info(f"[LEDGER] Using student.fee_structure_id={student_fee_structure_id}")
            return structs

    # Resolve academic year name to IDs
    ay_names = list({academic_year, student.academic_year} - {None, ""})
    academic_year_ids = []
    if ay_names:
        ay_objs = db.query(AcademicYear).filter(
            AcademicYear.name.in_(ay_names),
            AcademicYear.tenant_id == tenant_id,
        ).all()
        academic_year_ids = [ay.id for ay in ay_objs]
    logger.info(f"[LEDGER] academic_year_ids={academic_year_ids}, class_id={class_id}")

    # Strategy 2: class + academic year
    if class_id and academic_year_ids:
        structs = db.query(FeeStructure).filter(
            FeeStructure.class_id == class_id,
            FeeStructure.academic_year_id.in_(academic_year_ids),
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,
            FeeStructure.is_active == True,
        ).all()
        if structs:
            logger.info(f"[LEDGER] Fallback: found {len(structs)} structures for class+year")
            return structs

    # Strategy 3: class only (any year)
    if class_id:
        structs = db.query(FeeStructure).filter(
            FeeStructure.class_id == class_id,
            FeeStructure.tenant_id == tenant_id,
            FeeStructure.is_deleted == False,
            FeeStructure.is_active == True,
        ).all()
        if structs:
            logger.info(f"[LEDGER] Fallback: found {len(structs)} structures for class only")
            return structs

    logger.warning(f"[LEDGER] No fee structures found for student {student.id}")
    return []


def _build_installment_list(db, student_id: int, tenant_id: int, fee_structures: list) -> tuple:
    """Build installment list with real per-installment paid amounts from fee_payments."""
    from app.models.fee import FeeInstallment, FeeCategory
    installment_list = []
    total_fee = 0.0
    total_paid = 0.0
    today = date.today()

    for fs in fee_structures:
        installments = db.query(FeeInstallment).filter(
            FeeInstallment.fee_structure_id == fs.id,
            FeeInstallment.is_deleted == False,
        ).order_by(FeeInstallment.installment_number.asc()).all()

        for inst in installments:
            amount = float(inst.amount or 0)
            total_fee += amount

            # Real paid amount from fee_payments table
            paid = _get_paid_for_installment(db, student_id, inst.id, tenant_id)
            paid = min(paid, amount)  # cap at installment amount
            balance = max(amount - paid, 0.0)
            total_paid += paid

            # Category name
            fee_category_name = None
            if inst.fee_category_id:
                cat = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                if cat:
                    fee_category_name = cat.name
            fee_category_name = fee_category_name or inst.description or "Tuition"

            # Status
            if balance == 0 and amount > 0:
                status = "PAID"
            elif paid > 0 and balance > 0:
                status = "PARTIAL"
            elif inst.due_date < today:
                status = "OVERDUE"
            else:
                status = "PENDING"

            installment_list.append(FeeInstallmentSchema(
                installment=str(inst.installment_number),
                category=fee_category_name,
                due_date=inst.due_date,
                amount=amount,
                paid=paid,
                balance=balance,
                status=status,
            ))

    outstanding = total_fee - total_paid
    return installment_list, total_fee, total_paid, max(outstanding, 0.0)


@router.get("/students", response_model=StudentDropdownListResponse)
def get_students(search: str = Query(None), tenant_id: int = Query(...), db: Session = Depends(get_db)):
    query = db.query(Student).filter(Student.tenant_id == tenant_id, Student.is_active == True)
    if search:
        query = query.filter(
            (Student.student_name.ilike(f"%{search}%")) |
            (Student.student_code.ilike(f"%{search}%"))
        )
    students = query.limit(50).all()
    result = [
        StudentDropdown(id=s.id, student_name=s.student_name, student_code=s.student_code, academic_year=s.academic_year)
        for s in students
    ]
    return StudentDropdownListResponse(students=result)


@router.get("/{student_id}", response_model=FeeLedgerResponse, responses={
    400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}
})
def get_fee_ledger(
    student_id: int,
    academic_year: str = Query(...),
    tenant_id: int = Query(...),
    db: Session = Depends(get_db)
):
    logger.info(f"[LEDGER] student_id={student_id}, academic_year={academic_year}, tenant_id={tenant_id}")
    if not student_id:
        raise HTTPException(status_code=400, detail="Please select a student")

    student = db.query(Student).filter(Student.id == student_id, Student.tenant_id == tenant_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    fee_structures = _get_fee_structures_for_student(db, student, tenant_id, academic_year)
    if not fee_structures:
        raise HTTPException(status_code=404, detail="Fee ledger not available for this student")

    installment_list, total_fee, total_paid, outstanding = _build_installment_list(
        db, student_id, tenant_id, fee_structures
    )

    if not installment_list:
        raise HTTPException(status_code=404, detail="No installments found for this student")

    return FeeLedgerResponse(
        student=StudentLedgerSchema(
            id=student.id,
            student_name=student.student_name,
            student_code=student.student_code,
            academic_year=student.academic_year or academic_year,
        ),
        summary=FeeLedgerSummarySchema(
            total_fee=total_fee,
            total_paid=total_paid,
            outstanding=outstanding,
        ),
        installments=installment_list,
    )


@router.get("/download/{student_id}", responses={
    400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}
})
def download_fee_ledger(student_id: int, tenant_id: int = Query(...), db: Session = Depends(get_db)):
    logger.info(f"[PDF] Download student_id={student_id}, tenant_id={tenant_id}")
    if not student_id:
        raise HTTPException(status_code=400, detail="Please select a student")

    student = db.query(Student).filter(Student.id == student_id, Student.tenant_id == tenant_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    fee_structures = _get_fee_structures_for_student(db, student, tenant_id, student.academic_year or "")
    installment_list = []
    if fee_structures:
        installment_list, _, _, _ = _build_installment_list(db, student_id, tenant_id, fee_structures)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.platypus import Table, TableStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setFont("Helvetica-Bold", 16)
        p.drawString(72, 720, "Fee Ledger")
        p.setFont("Helvetica", 12)
        p.drawString(72, 700, f"Student Name: {student.student_name}")
        p.drawString(72, 680, f"Student Code: {student.student_code or '-'}")
        p.drawString(72, 660, f"Academic Year: {student.academic_year or '-'}")
        p.drawString(72, 640, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        data = [["Installment", "Category", "Due Date", "Amount", "Paid", "Balance", "Status"]]
        if installment_list:
            for inst in installment_list:
                data.append([
                    str(inst.installment),
                    inst.category,
                    inst.due_date.strftime("%Y-%m-%d") if inst.due_date else "",
                    f"Rs.{inst.amount:,.2f}",
                    f"Rs.{inst.paid:,.2f}",
                    f"Rs.{inst.balance:,.2f}",
                    inst.status,
                ])
        else:
            data.append(["-", "-", "-", "-", "-", "-", "-"])

        table = Table(data, colWidths=[65, 80, 70, 65, 65, 65, 60])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        table.wrapOn(p, 72, 580)
        table.drawOn(p, 72, 580 - 20 * len(data))
        p.showPage()
        p.save()
        pdf_bytes = buffer.getvalue()
        buffer.close()
    except ImportError:
        raise HTTPException(status_code=500, detail="PDF generation not available (reportlab not installed)")

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=fee_ledger_{student.student_code or student_id}.pdf"},
    )