# PDF download support
from fastapi.responses import Response
import io
from app.models.student_fee_ledger import Student, FeeLedger
# Student Fee Ledger Router
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.student_fee_ledger import (
    StudentDropdownListResponse, StudentDropdown, FeeLedgerResponse, ErrorResponse, EmptyArrayResponse,
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

@router.get("/students", response_model=StudentDropdownListResponse)
def get_students(search: str = Query(None), tenant_id: int = Query(...), db: Session = Depends(get_db)):
    query = db.query(Student).filter(Student.tenant_id == tenant_id, Student.is_active == True)
    if search:
        query = query.filter(
            (Student.student_name.ilike(f"%{search}%")) |
            (Student.student_code.ilike(f"%{search}%"))
        )
    students = query.all()
    result = [StudentDropdown(id=s.id, student_name=s.student_name, student_code=s.student_code, academic_year=s.academic_year) for s in students]
    return StudentDropdownListResponse(students=result)

@router.get("/{student_id}", response_model=FeeLedgerResponse, responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
def get_fee_ledger(student_id: int, academic_year: str = Query(...), tenant_id: int = Query(...), db: Session = Depends(get_db)):
    logger.info(f"[DEBUG] student_id={student_id}, academic_year={academic_year}, tenant_id={tenant_id}")
    if not student_id:
        raise HTTPException(status_code=400, detail="Please select a student")
    student = db.query(Student).filter(Student.id == student_id, Student.tenant_id == tenant_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Fee ledger not available")
    logger.info(f"[DEBUG] student.class_id={getattr(student, 'class_id', None)}, student.academic_year={student.academic_year}")
    ledger = db.query(FeeLedger).filter(FeeLedger.student_id == student_id, FeeLedger.academic_year == academic_year, FeeLedger.tenant_id == tenant_id).first()
    from app.models.fee import FeeStructure, FeeInstallment
    from app.models.academic import AcademicYear
    class_id = getattr(student, 'class_id', None)
    academic_year_ids = []
    if student.academic_year:
        academic_year_objs = db.query(AcademicYear).filter(
            AcademicYear.name == student.academic_year,
            AcademicYear.tenant_id == tenant_id
        ).all()
        academic_year_ids = [ay.id for ay in academic_year_objs]
    logger.info(f"[DEBUG] academic_year_ids={academic_year_ids}")
    fee_structures = []
    student_fee_structure_id = getattr(student, 'fee_structure_id', None)
    if student_fee_structure_id:
        fee_structures = db.query(FeeStructure).filter(FeeStructure.id == student_fee_structure_id).all()
        logger.info(f"[DEBUG] Using ONLY student.fee_structure_id={student_fee_structure_id}")
    else:
        logger.info(f"[DEBUG] No fee_structure_id set for student {student.id}")
    logger.info(f"[DEBUG] fee_structures found: {[fs.id for fs in fee_structures]}")
    from app.models.student_fee_ledger import FeePayment
    if not ledger and fee_structures:
        # No ledger, generate from all fee structures
        installment_list = []
        total_fee = 0
        for fs in fee_structures:
            installments = db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == fs.id).all()
            for inst in installments:
                amount = float(inst.amount)
                total_fee += amount
                # Fetch real category name from fee_categories via fee_category_id on installment
                fee_category_name = None
                if inst.fee_category_id:
                    from app.models.fee import FeeCategory
                    fee_category = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                    if fee_category:
                        fee_category_name = fee_category.name
                if not fee_category_name:
                    # fallback to description or Tuition
                    fee_category_name = inst.description or "Tuition"
                installment_list.append(FeeInstallmentSchema(
                    installment=str(inst.installment_number),
                    category=fee_category_name,
                    due_date=inst.due_date,
                    amount=amount,
                    paid=0.0,
                    balance=amount,
                    status="OVERDUE" if inst.due_date < date.today() else ""
                ))
        return FeeLedgerResponse(
            student=StudentLedgerSchema(
                id=student.id,
                student_name=student.student_name,
                student_code=student.student_code,
                academic_year=student.academic_year
            ),
            summary=FeeLedgerSummarySchema(total_fee=total_fee, total_paid=0.0, outstanding=total_fee),
            installments=installment_list
        )
    elif ledger:
        # Ledger exists, distribute total_fee across installments proportionally
        installment_list = []
        if fee_structures:
            # Gather all installments
            all_installments = []
            for fs in fee_structures:
                installments = db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == fs.id).all()
                all_installments.extend(installments)
            n = len(all_installments)
            logger.info(f"[DEBUG] FeeLedger total_fee={ledger.total_fee}, total_paid={ledger.total_paid}, n_installments={n}")
            if n > 0:
                # Distribute ledger total_fee and total_paid evenly if all original amounts are equal, else proportionally
                orig_amounts = [float(inst.amount) for inst in all_installments]
                if all(a == orig_amounts[0] for a in orig_amounts):
                    # All installments are equal, distribute evenly, assign any difference to last installment
                    total_fee = float(ledger.total_fee)
                    total_paid = float(ledger.total_paid)
                    base_amount = round(total_fee / n, 2)
                    base_paid = round(total_paid / n, 2)
                    amounts = [base_amount] * n
                    paids = [base_paid] * n
                    # Fix: assign any difference (from rounding) to the last installment
                    amounts[-1] = round(total_fee - sum(amounts[:-1]), 2)
                    paids[-1] = round(total_paid - sum(paids[:-1]), 2)
                    for i, inst in enumerate(all_installments):
                        amount = amounts[i]
                        paid = paids[i]
                        balance = amount - paid
                        paid = min(paid, amount)
                        balance = max(amount - paid, 0)
                        logger.info(f"[DEBUG] Installment {i+1}: even_amount={amount}, paid={paid}, balance={balance}")
                        status = "PAID" if balance == 0 else ("PARTIAL" if paid > 0 and balance > 0 else ("OVERDUE" if inst.due_date < date.today() and balance > 0 else ""))
                        # Fetch real category name from fee_categories via fee_category_id on installment
                        fee_category_name = None
                        if inst.fee_category_id:
                            from app.models.fee import FeeCategory
                            fee_category = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                            if fee_category:
                                fee_category_name = fee_category.name
                        if not fee_category_name:
                            fee_category_name = inst.description or "Tuition"
                        installment_list.append(FeeInstallmentSchema(
                            installment=str(inst.installment_number),
                            category=fee_category_name,
                            due_date=inst.due_date,
                            amount=amount,
                            paid=paid,
                            balance=balance,
                            status=status
                        ))
                else:
                    # Proportional distribution
                    original_total = sum(orig_amounts)
                    running_amount = 0.0
                    running_paid = 0.0
                    for i, inst in enumerate(all_installments):
                        orig_amount = float(inst.amount)
                        if i < n - 1:
                            amount = round(float(ledger.total_fee) * (orig_amount / original_total), 2)
                            paid = round(float(ledger.total_paid) * (orig_amount / original_total), 2)
                        else:
                            amount = round(float(ledger.total_fee) - running_amount, 2)
                            paid = round(float(ledger.total_paid) - running_paid, 2)
                        running_amount += amount
                        running_paid += paid
                        balance = amount - paid
                        paid = min(paid, amount)
                        balance = max(amount - paid, 0)
                        logger.info(f"[DEBUG] Installment {i+1}: orig_amount={orig_amount}, amount={amount}, paid={paid}, balance={balance}")
                        status = "PAID" if balance == 0 else ("PARTIAL" if paid > 0 and balance > 0 else ("OVERDUE" if inst.due_date < date.today() and balance > 0 else ""))
                        # Fetch real category name from fee_categories via fee_category_id on installment
                        fee_category_name = None
                        if inst.fee_category_id:
                            from app.models.fee import FeeCategory
                            fee_category = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                            if fee_category:
                                fee_category_name = fee_category.name
                        if not fee_category_name:
                            fee_category_name = inst.description or "Tuition"
                        installment_list.append(FeeInstallmentSchema(
                            installment=str(inst.installment_number),
                            category=fee_category_name,
                            due_date=inst.due_date,
                            amount=amount,
                            paid=paid,
                            balance=balance,
                            status=status
                        ))
        return FeeLedgerResponse(
            student=StudentLedgerSchema(
                id=student.id,
                student_name=student.student_name,
                student_code=student.student_code,
                academic_year=student.academic_year
            ),
            summary=FeeLedgerSummarySchema(
                total_fee=float(ledger.total_fee),
                total_paid=float(ledger.total_paid),
                outstanding=float(ledger.total_balance)
            ),
            installments=installment_list
        )
    else:
        raise HTTPException(status_code=404, detail="Fee ledger or fee structure not available for this student/class/year.")

@router.get("/download/{student_id}", responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}})
def download_fee_ledger(student_id: int, tenant_id: int = Query(...), db: Session = Depends(get_db)):
    logger.info(f"[PDF] Download request for student_id={student_id}, tenant_id={tenant_id}")
    if not student_id:
        logger.error("[PDF] No student_id provided")
        raise HTTPException(status_code=400, detail="Please select a student")
    student = db.query(Student).filter(Student.id == student_id, Student.tenant_id == tenant_id).first()
    if not student:
        logger.error(f"[PDF] Student not found for student_id={student_id}, tenant_id={tenant_id}")
        raise HTTPException(status_code=404, detail="Fee ledger not available")

    logger.info(f"[PDF] Generating PDF for student: {student.student_name} ({student.student_code})")
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors
    import io
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    p.setFont("Helvetica-Bold", 16)
    p.drawString(72, 720, "Fee Ledger")
    p.setFont("Helvetica", 12)
    p.drawString(72, 700, f"Student Name: {student.student_name}")
    p.drawString(72, 680, f"Student Code: {student.student_code}")
    p.drawString(72, 660, f"Academic Year: {student.academic_year}")
    p.drawString(72, 640, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Fetch ledger data for table
    from app.models.fee import FeeStructure, FeeInstallment, FeeCategory
    from app.models.student_fee_ledger import FeeLedger
    ledger = db.query(FeeLedger).filter(FeeLedger.student_id == student_id, FeeLedger.tenant_id == tenant_id).first()
    if not ledger:
        logger.error(f"[PDF] No ledger found for student_id={student_id}")
        p.showPage()
        p.save()
        pdf_bytes = buffer.getvalue()
        buffer.close()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=fee_ledger.pdf"}
        )


    # Use the same logic as the API to get accurate installment data
    from app.models.fee import FeeStructure, FeeInstallment, FeeCategory
    from app.models.student_fee_ledger import FeeLedger
    from app.schemas.student_fee_ledger import FeeInstallmentSchema
    # Try to get the same installment_list as the API
    ledger = db.query(FeeLedger).filter(FeeLedger.student_id == student.id, FeeLedger.tenant_id == tenant_id).first()
    fee_structures = []
    if hasattr(student, 'fee_structure_id') and student.fee_structure_id:
        fee_structures = db.query(FeeStructure).filter(FeeStructure.id == student.fee_structure_id).all()
    installment_list = []
    if ledger and fee_structures:
        # Use the same logic as the API for even/proportional distribution
        all_installments = []
        for fs in fee_structures:
            installments = db.query(FeeInstallment).filter(FeeInstallment.fee_structure_id == fs.id).all()
            all_installments.extend(installments)
        n = len(all_installments)
        if n > 0:
            orig_amounts = [float(inst.amount) for inst in all_installments]
            if all(a == orig_amounts[0] for a in orig_amounts):
                total_fee = float(ledger.total_fee)
                total_paid = float(ledger.total_paid)
                base_amount = round(total_fee / n, 2)
                base_paid = round(total_paid / n, 2)
                amounts = [base_amount] * n
                paids = [base_paid] * n
                amounts[-1] = round(total_fee - sum(amounts[:-1]), 2)
                paids[-1] = round(total_paid - sum(paids[:-1]), 2)
                for i, inst in enumerate(all_installments):
                    amount = amounts[i]
                    paid = paids[i]
                    balance = amount - paid
                    paid = min(paid, amount)
                    balance = max(amount - paid, 0)
                    status = "PAID" if balance == 0 else ("PARTIAL" if paid > 0 and balance > 0 else ("OVERDUE" if inst.due_date < date.today() and balance > 0 else ""))
                    fee_category_name = None
                    if inst.fee_category_id:
                        fee_category = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                        if fee_category:
                            fee_category_name = fee_category.name
                    if not fee_category_name:
                        fee_category_name = inst.description or "Tuition"
                    installment_list.append(FeeInstallmentSchema(
                        installment=str(inst.installment_number),
                        category=fee_category_name,
                        due_date=inst.due_date,
                        amount=amount,
                        paid=paid,
                        balance=balance,
                        status=status
                    ))
            else:
                original_total = sum(orig_amounts)
                running_amount = 0.0
                running_paid = 0.0
                for i, inst in enumerate(all_installments):
                    orig_amount = float(inst.amount)
                    if i < n - 1:
                        amount = round(float(ledger.total_fee) * (orig_amount / original_total), 2)
                        paid = round(float(ledger.total_paid) * (orig_amount / original_total), 2)
                    else:
                        amount = round(float(ledger.total_fee) - running_amount, 2)
                        paid = round(float(ledger.total_paid) - running_paid, 2)
                    running_amount += amount
                    running_paid += paid
                    balance = amount - paid
                    paid = min(paid, amount)
                    balance = max(amount - paid, 0)
                    status = "PAID" if balance == 0 else ("PARTIAL" if paid > 0 and balance > 0 else ("OVERDUE" if inst.due_date < date.today() and balance > 0 else ""))
                    fee_category_name = None
                    if inst.fee_category_id:
                        fee_category = db.query(FeeCategory).filter(FeeCategory.id == inst.fee_category_id).first()
                        if fee_category:
                            fee_category_name = fee_category.name
                    if not fee_category_name:
                        fee_category_name = inst.description or "Tuition"
                    installment_list.append(FeeInstallmentSchema(
                        installment=str(inst.installment_number),
                        category=fee_category_name,
                        due_date=inst.due_date,
                        amount=amount,
                        paid=paid,
                        balance=balance,
                        status=status
                    ))
    # Table header
    data = [["Installment", "Category", "Due Date", "Amount", "Paid", "Balance", "Status"]]
    if installment_list:
        for inst in installment_list:
            data.append([
                str(inst.installment),
                inst.category,
                inst.due_date.strftime("%Y-%m-%d") if inst.due_date else "",
                f"₹{inst.amount:,.2f}",
                f"₹{inst.paid:,.2f}",
                f"₹{inst.balance:,.2f}",
                inst.status
            ])
    else:
        data.append(["-", "-", "-", "-", "-", "-", "-"])

    # Draw table
    table = Table(data, colWidths=[60, 80, 70, 60, 60, 60, 60])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    table.wrapOn(p, 72, 600)
    table.drawOn(p, 72, 600 - 20 * len(data))

    p.showPage()
    p.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    logger.info(f"[PDF] PDF generated, size={len(pdf_bytes)} bytes")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=fee_ledger.pdf"}
    )