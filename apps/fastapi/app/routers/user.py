import fastapi
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPasswordUpdate, ChangePasswordRequest, ChangePasswordResponse
from app.services import user_service
from app.core.logging_config import get_logger
from app.services.rbac_service import get_user_roles
from app.models.user import User, UserRole
from app.core.exceptions import ConflictException
from fastapi.responses import JSONResponse
from app.core.exceptions import ConflictException
from app.models.user_profile import UserProfile

logger = get_logger(__name__)

router = APIRouter(prefix="/api/account", tags=["Account"])

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> UserResponse:
    """Create a new user. Requires admin role."""
    logger.info(f"Admin {current_user.email} creating user: {user.email}")
    try:
        db_user = user_service.create_user(db, user, created_by=current_user.id)
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            roles=[role.code for role in get_user_roles(db, db_user.id)]
        )
    except ConflictException as e:
        return JSONResponse(status_code=409, content={"message": str(e)})
    except Exception:
        return fastapi.responses.JSONResponse(status_code=500, content={"message": "Unable to save user. Please try again."})

@router.get("/", response_model=list[UserResponse])
async def read_all_users(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> list[UserResponse]:
    """Get all users. Requires authentication."""
    logger.debug(f"User {current_user.email} fetching all users")
    db_users = db.query(User).filter(User.is_deleted == False).all()
    users = []
    for db_user in db_users:
        roles = [role.code for role in get_user_roles(db, db_user.id)]
        users.append(UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            tenant_id=db_user.tenant_id,
            phone_number=db_user.phone_number,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            roles=roles
        ))
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def read_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserResponse:
    """Get a user by ID. Requires authentication."""
    logger.debug(f"User {current_user.email} fetching user: {user_id}")
    u = user_service.get_user(db, user_id)
    return UserResponse(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        tenant_id=u.tenant_id,
        phone_number=u.phone_number,
        is_active=u.is_active,
        created_at=u.created_at,
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user)
) -> UserResponse:
    """Update a user. Users can update themselves, admins can update anyone."""
    try:
        db_user = user_service.update_user(db, user_id, user, updated_by=current_user.id)
        return {"message": "User saved successfully."}
    except ConflictException as e:
        return fastapi.responses.JSONResponse(status_code=403, content={"message": str(e)})
    except Exception:
        return fastapi.responses.JSONResponse(status_code=500, content={"message": "Unable to save user. Please try again."})

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> None:
    """Soft delete a user. Requires admin role."""
    logger.info(f"Admin {current_user.email} soft-deleting user: {user_id}")
    user_service.soft_delete_user(db, user_id, deleted_by=current_user.id)
    return None


@router.put("/{user_id}/password", status_code=204)
async def change_user_password(
    user_id: int,
    payload: UserPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin),
) -> None:
    """
    Change a user's password (admin-only).

    This is used by admins to reset another user's password.
    """
    logger.info(f"Admin {current_user.email} changing password for user: {user_id}")
    user_service.set_user_password(db, user_id, payload.new_password, updated_by=current_user.id)
    return None

@router.post("/change-password", response_model=ChangePasswordResponse)
async def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ChangePasswordResponse:
    """
    Change password for the current user.
    """
    logger.info(f"Change password: current_user={current_user}")

    user_id = current_user.id
    tenant_id = getattr(current_user, "tenant_id", None)
    logger.info(f"Change password: user_id={user_id}, tenant_id={tenant_id}, role={current_user.role}")

    # Allow super admin (tenant_id is None)
    if tenant_id is None and current_user.role == "SUPER_ADMIN":
        result = user_service.handle_change_password(db, user_id, None, req)
        return ChangePasswordResponse(**result)
    elif tenant_id is None:
        return ChangePasswordResponse(success=False, message="Tenant information missing.")
    else:
        result = user_service.handle_change_password(db, user_id, tenant_id, req)
        return ChangePasswordResponse(**result)


