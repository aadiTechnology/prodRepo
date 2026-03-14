from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser
from app.schemas.fee import (
    FeeCategoryResponse,
    FeeCategoryCreate,
    FeeCategoryUpdate,
    FeeStructureCreate,
    FeeStructureUpdate,
    FeeStructureResponse,
    FeeStructurePaginatedResponse,
)
from app.services import fee_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/fees", tags=["Fees"])


@router.get("/categories", response_model=list[FeeCategoryResponse])
async def read_fee_categories(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all fee categories for the current tenant."""
    return fee_service.get_fee_categories(db, current_user.tenant_id)


@router.get("/categories/{category_id}", response_model=FeeCategoryResponse)
async def read_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get a single fee category by ID."""
    return fee_service.get_fee_category(db, current_user.tenant_id, category_id)


@router.post("/categories", response_model=FeeCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_fee_category(
    category: FeeCategoryCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    """Create a new fee category."""
    return fee_service.create_fee_category(db, category, current_user.tenant_id, current_user.id)


@router.put("/categories/{category_id}", response_model=FeeCategoryResponse)
async def update_fee_category(
    category_id: str,
    category: FeeCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
):
    """Update an existing fee category."""
    return fee_service.update_fee_category(db, category_id, category, current_user.tenant_id, current_user.id)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fee_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
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
    academic_year_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
):
    structures = fee_service.get_fee_structures(
        db, 
        current_user.tenant_id, 
        class_id=class_id, 
        academic_year_id=academic_year_id
    )
    
    # Simple manual search for now if needed, or implement in service
    if search:
        structures = [s for s in structures if search.lower() in (s.class_name or "").lower()]

    total = len(structures)
    start = page * size
    end = start + size
    
    return {
        "items": structures[start:end],
        "total": total,
        "page": page,
        "size": size
    }

@router.post("/structures", response_model=FeeStructureResponse, status_code=201)
async def create_fee_structure(
    structure: FeeStructureCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    return fee_service.create_fee_structure(db, structure, current_user.tenant_id, current_user.id)

@router.put("/structures/{structure_id}", response_model=FeeStructureResponse)
async def update_fee_structure(
    structure_id: int,
    structure: FeeStructureUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    return fee_service.update_fee_structure(db, structure_id, structure, current_user.tenant_id, current_user.id)

@router.delete("/structures/{structure_id}", status_code=204)
async def delete_fee_structure(
    structure_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
):
    fee_service.delete_fee_structure(db, structure_id, current_user.tenant_id, current_user.id)
    return None
