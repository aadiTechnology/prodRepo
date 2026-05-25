import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.models.user import User
from app.models.user_profile import UserProfile
from app.models.teacher import Teacher
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile"])

UPLOAD_DIR = "static/profile-images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_response(db_user: User, profile_image_path: str | None, db: Session | None = None) -> ProfileResponse:
    """Build a ProfileResponse from a User ORM object."""
    # Use RBAC roles first (source of truth), fall back to legacy role column
    if db_user.roles:
        role_str = db_user.roles[0].code
    else:
        role_str = db_user.role.value if hasattr(db_user.role, "value") else str(db_user.role)
    tenant_name = db_user.tenant.name if db_user.tenant else None
    phone_number = db_user.phone_number
    created_at = db_user.created_at
    # Fall back to Teacher.mobile_number if User.phone_number is not set
    if not phone_number and db:
        teacher = db.query(Teacher).filter(
            Teacher.user_id == db_user.id,
            Teacher.is_deleted == False
        ).first()
        if teacher and teacher.mobile_number:
            phone_number = teacher.mobile_number
    return ProfileResponse(
        full_name=db_user.full_name,
        email=db_user.email,
        role=role_str,
        is_active=db_user.is_active,
        profile_image_path=profile_image_path,
        phone_number=phone_number,
        created_at=created_at,
        tenant_name=tenant_name,
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Fetch the logged-in user's full profile including is_active and image.
    
    ✓ Each user sees ONLY their own profile (user_id enforced)
    """
    # Validate current_user has valid ID
    if not current_user or not current_user.id:
        logger.error(f"Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user session")

    # Query User with explicit user_id filter
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        logger.warning(f"User not found for ID: {current_user.id}")
        raise HTTPException(status_code=404, detail="User not found")

    # Get UserProfile for THIS user only (user_id enforced)
    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
    image_path = profile.ProfileImagePath if profile else None

    logger.info(
        f"✓ Profile fetched for user {current_user.id} ({db_user.email}) | "
        f"Image: {image_path or 'None'}"
    )
    return _build_response(db_user, image_path, db)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Update the logged-in user's full name.
    
    ✓ Each user can ONLY update their own profile (user_id enforced)
    """
    if not current_user or not current_user.id:
        logger.error(f"Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user session")

    if len(payload.full_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter Full Name (minimum 2 characters).",
        )

    # Query User with explicit user_id filter
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        logger.warning(f"User not found for ID: {current_user.id}")
        raise HTTPException(status_code=404, detail="User not found")

    old_name = db_user.full_name
    db_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(db_user)

    # Get UserProfile for THIS user only
    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
    image_path = profile.ProfileImagePath if profile else None

    logger.info(
        f"✓ Profile name updated for user {current_user.id} ({db_user.email}) | "
        f"'{old_name}' → '{db_user.full_name}'"
    )
    return _build_response(db_user, image_path, db)


@router.post("/upload-image", response_model=ProfileResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Upload a profile image. Saves to static/profile-images/{userId}.{ext}
    
    ✓ Each user's image is stored with THEIR user_id as filename
    ✓ Prevents image sharing between users
    """
    if not current_user or not current_user.id:
        logger.error(f"Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user session")

    # Validate file extension
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp.",
        )

    # Create filename with USER_ID to ensure uniqueness
    filename = f"{current_user.id}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    logger.info(
        f"[UPLOAD] User {current_user.id} ({current_user.email}) uploading image: {filename}"
    )

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"[DISK] File saved: {file_path}")
    except Exception as e:
        logger.error(f"[DISK ERROR] Failed to save profile image for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Unable to save image. Please try again.")

    public_path = f"/profile-images/{filename}"

    # Upsert into UserProfile table (user_id enforced)
    try:
        profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
        if profile:
            old_path = profile.ProfileImagePath
            profile.ProfileImagePath = public_path
            logger.info(
                f"[DB] Updating existing UserProfile for user {current_user.id} | "
                f"{old_path} → {public_path}"
            )
        else:
            profile = UserProfile(UserId=current_user.id, ProfileImagePath=public_path)
            db.add(profile)
            logger.info(
                f"[DB] Creating new UserProfile for user {current_user.id} | {public_path}"
            )

        db.commit()
        db.refresh(profile)
        logger.info(
            f"✓ Profile image committed to DB for user {current_user.id}: {public_path}"
        )
    except Exception as e:
        db.rollback()
        logger.error(
            f"✗ Database error for user {current_user.id}: {type(e).__name__}: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # Get updated User record
    db_user = db.query(User).filter(User.id == current_user.id).first()
    logger.info(
        f"✓ Profile image upload complete for user {current_user.id} ({db_user.email}) "
        f"→ {public_path}"
    )
    return _build_response(db_user, profile.ProfileImagePath, db)


@router.delete("/image", response_model=ProfileResponse)
async def delete_profile_image(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Remove the user's profile image from disk and clear the DB path.
    
    ✓ Each user can ONLY delete their own image (user_id enforced)
    """
    if not current_user or not current_user.id:
        logger.error(f"Invalid current_user: {current_user}")
        raise HTTPException(status_code=401, detail="Invalid user session")

    logger.info(f"[DELETE] User {current_user.id} ({current_user.email}) deleting profile image")

    # Get UserProfile for THIS user only
    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()

    if profile and profile.ProfileImagePath:
        # Delete file from disk (best-effort)
        filename = os.path.basename(profile.ProfileImagePath)
        file_path = os.path.join(UPLOAD_DIR, filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"[DISK] File deleted: {file_path}")
        except Exception as e:
            logger.warning(f"[DISK WARN] Could not delete image file {file_path}: {e}")

        # Update database
        try:
            old_path = profile.ProfileImagePath
            profile.ProfileImagePath = None
            db.commit()
            db.refresh(profile)
            logger.info(
                f"✓ Profile image deleted from DB for user {current_user.id} | "
                f"Removed: {old_path}"
            )
        except Exception as e:
            db.rollback()
            logger.error(
                f"✗ Database error deleting profile for user {current_user.id}: "
                f"{type(e).__name__}: {str(e)}"
            )
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    else:
        logger.info(f"[DELETE] No image found for user {current_user.id} to delete")

    # Get updated User record
    db_user = db.query(User).filter(User.id == current_user.id).first()
    logger.info(f"✓ Profile image deletion complete for user {current_user.id} ({db_user.email})")
    return _build_response(db_user, None, db)
