from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_permission, CurrentUser
from app.schemas.fee import (
    FeeCategoryResponse,
    FeeCategoryCreate,
    FeeCategoryUpdate,
    FeeStructureCreate,
    FeeStructureUpdate,
    FeeStructureResponse,
    FeeStructurePaginatedResponse,
    FeeDueListResponse,
)
from app.services import fee_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/fees", tags=["Fees"])


@router.get("/categories", response_model=list[FeeCategoryResponse])
async def read_fee_categories(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "view")),
):
    """List all fee categories for the current tenant."""
    return fee_service.get_fee_categories(db, current_user.tenant_id)


@router.get("/categories/{category_id}", response_model=FeeCategoryResponse)
async def read_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "view")),
):
    """Get a single fee category by ID."""
    return fee_service.get_fee_category(db, current_user.tenant_id, category_id)


@router.post("/categories", response_model=FeeCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_category(
    category: FeeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "create")),
):
    """Create a new fee category."""
    return fee_service.create_fee_category(db, category, current_user.tenant_id, current_user.id)


@router.put("/categories/{category_id}", response_model=FeeCategoryResponse)
async def update_fee_category(
    category_id: str,
    category: FeeCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "edit")),
):
    """Update an existing fee category."""
    return fee_service.update_fee_category(db, category_id, category, current_user.tenant_id, current_user.id)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "delete")),
):
    """Delete a fee category."""
    fee_service.delete_fee_category(db, category_id, current_user.tenant_id, current_user.id)
    return None

@router.get("/structures", response_model=FeeStructurePaginatedResponse)
async def read_fee_structures(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1),
    search: str = Query(None),
    class_id: int = Query(None),
    class_name: str = Query(None),
    academic_year_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "view"))
):
    structures = fee_service.get_fee_structures(
        db, 
        current_user.tenant_id, 
        class_id=class_id, 
        academic_year_id=academic_year_id,
        class_name=class_name
    )
    
    # Simple manual search for now if needed, or implement in service
    if search:
        structures = [s for s in structures if search.lower() in (s.class_name or "").lower()]

    total = len(structures)
    start = page * size
    end = start + size
    
    # Patch: Ensure late_fee_percentage and description are never None in installments
    def patch_installments(structure):
        if hasattr(structure, 'installments') and structure.installments:
            for inst in structure.installments:
                if getattr(inst, 'late_fee_percentage', None) is None:
                    inst.late_fee_percentage = 0.0
                if getattr(inst, 'description', None) is None:
                    inst.description = ""
        return structure

    items = [patch_installments(s) for s in structures[start:end]]
    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/structures", response_model=FeeStructureResponse, status_code=201)
async def create_fee_structure(
    structure: FeeStructureCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "create"))
):
    return fee_service.create_fee_structure(db, structure, current_user.tenant_id, current_user.id)

@router.put("/structures/{structure_id}", response_model=FeeStructureResponse)
async def update_fee_structure(
    structure_id: int,
    structure: FeeStructureUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "edit"))
):
    return fee_service.update_fee_structure(db, structure_id, structure, current_user.tenant_id, current_user.id)

@router.delete("/structures/{structure_id}", status_code=204)
async def delete_fee_structure(
    structure_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "delete"))
):
    fee_service.delete_fee_structure(db, structure_id, current_user.tenant_id, current_user.id)
    return None

@router.get("/structures/{structure_id}", response_model=FeeStructureResponse)
async def read_fee_structure(
    structure_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "view"))
):
    structure = fee_service.get_fee_structure(db, structure_id, current_user.tenant_id)
    
    # Patch installments for consistency with read_fee_structures
    if hasattr(structure, 'installments') and structure.installments:
        for inst in structure.installments:
            if getattr(inst, 'late_fee_percentage', None) is None:
                inst.late_fee_percentage = 0.0
            if getattr(inst, 'description', None) is None:
                inst.description = ""
                
    return structure


@router.get("/due-list-v2", response_model=FeeDueListResponse)
async def read_fee_due_list_v2(
    academic_year_id: int = Query(..., ge=1),
    class_id: int | None = Query(None, ge=1),
    installment: str | None = Query(None),
    search: str | None = Query(None),
    status: str = Query("ALL"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_permission("Fees", "view")),
):
    """Get due fee list with installment and invoice details."""
    return fee_service.get_fee_due_list_v2(
        db=db,
        tenant_id=current_user.tenant_id,
        academic_year_id=academic_year_id,
        class_id=class_id,
        installment=installment,
        search=search,
        status_filter=status,
        page=page,
        page_size=page_size,
    )

