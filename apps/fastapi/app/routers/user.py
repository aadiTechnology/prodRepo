import fastapi
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin, CurrentUser, get_rbac_role_codes, SYSTEM_ADMIN_ROLE_CODE
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserPasswordUpdate, ChangePasswordRequest, ChangePasswordResponse
from app.services import user_service
from app.core.logging_config import get_logger
from app.services.rbac_service import get_user_roles
from app.models.user import User, UserRole
from app.core.exceptions import ConflictException, AppException, ForbiddenException
from fastapi.responses import JSONResponse

logger = get_logger(__name__)

router = APIRouter(prefix="/api/account", tags=["Account"])

def _is_system_admin(current_user: CurrentUser, db: Session) -> bool:
    if current_user.tenant_id is not None:
        return False
    if current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        return True
    rbac_role_codes = get_rbac_role_codes(db, current_user.id)
    return SYSTEM_ADMIN_ROLE_CODE.lower() in rbac_role_codes

@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> UserResponse:
    """Create a new user. Requires admin role."""
    logger.info(f"Admin {current_user.email} creating user: {user.email}")
    try:
        is_system_admin = _is_system_admin(current_user, db)
        if not is_system_admin:
            if user.tenant_id is not None and user.tenant_id != current_user.tenant_id:
                raise ForbiddenException("Insufficient permissions")
        effective_tenant_id = user.tenant_id if is_system_admin else current_user.tenant_id
        db_user = user_service.create_user(db, user, created_by=current_user.id, tenant_id=effective_tenant_id)
        # Refresh user object to load relationships after creation
        db.refresh(db_user)
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            is_active=db_user.is_active,
            tenant_id=db_user.tenant_id,
            created_at=db_user.created_at,
            roles=[role.code for role in db_user.roles]
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
    # Use eager loading to fetch users with their roles in a single query
    from sqlalchemy.orm import joinedload
    query = db.query(User).filter(User.is_deleted == False).options(joinedload(User.roles))
    if not _is_system_admin(current_user, db):
        if current_user.tenant_id is None:
            query = query.filter(User.id == current_user.id)
        else:
            query = query.filter(User.tenant_id == current_user.tenant_id)
    db_users = query.all()
    users = []
    for db_user in db_users:
        # Roles are already loaded via joinedload, no additional query needed
        roles = [role.code for role in db_user.roles]
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
    if not _is_system_admin(current_user, db):
        if current_user.tenant_id is None and u.id != current_user.id:
            raise ForbiddenException("Insufficient permissions")
        if current_user.tenant_id is not None and u.tenant_id != current_user.tenant_id:
            raise ForbiddenException("Insufficient permissions")
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
        is_system_admin = _is_system_admin(current_user, db)
        if not is_system_admin:
            if current_user.tenant_id is None and current_user.id != user_id:
                raise ForbiddenException("Insufficient permissions")
            if current_user.tenant_id is not None:
                existing_user = user_service.get_user(db, user_id)
                if existing_user.tenant_id != current_user.tenant_id:
                    raise ForbiddenException("Insufficient permissions")
            if user.tenant_id is not None and user.tenant_id != current_user.tenant_id:
                raise ForbiddenException("Insufficient permissions")
        db_user = user_service.update_user(db, user_id, user, updated_by=current_user.id)
        return UserResponse(
            id=db_user.id,
            email=db_user.email,
            full_name=db_user.full_name,
            tenant_id=db_user.tenant_id,
            phone_number=db_user.phone_number,
            is_active=db_user.is_active,
            created_at=db_user.created_at,
            roles=[role.code for role in get_user_roles(db, db_user.id)]
        )
    except AppException as e:
        logger.warning(f"Update user failed: {e.message}")
        return JSONResponse(status_code=e.status_code, content={"message": e.message})
    except ConflictException as e:
        # Fallback for direct ConflictException if not inheriting from AppException in some versions
        return JSONResponse(status_code=409, content={"message": str(e)})
    except Exception as e:
        logger.error(f"Unexpected error updating user {user_id}: {str(e)}")
        return JSONResponse(status_code=500, content={"message": "Unable to save user. Please try again."})

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(require_admin)
) -> None:
    """Soft delete a user. Requires admin role."""
    logger.info(f"Admin {current_user.email} soft-deleting user: {user_id}")
    if not _is_system_admin(current_user, db):
        target_user = user_service.get_user(db, user_id)
        if current_user.tenant_id is None and current_user.id != target_user.id:
            raise ForbiddenException("Insufficient permissions")
        if current_user.tenant_id is not None and target_user.tenant_id != current_user.tenant_id:
            raise ForbiddenException("Insufficient permissions")
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
