import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user, CurrentUser
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.profile import ProfileResponse, ProfileUpdate
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/profile", tags=["Profile"])

UPLOAD_DIR = "static/profile-images"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _build_response(db_user: User, profile_image_path: str | None) -> ProfileResponse:
    """Build a ProfileResponse from a User ORM object."""
    role_str = db_user.role.value if hasattr(db_user.role, "value") else str(db_user.role)
    return ProfileResponse(
        full_name=db_user.full_name,
        email=db_user.email,
        role=role_str,
        is_active=db_user.is_active,
        profile_image_path=profile_image_path,
    )


@router.get("", response_model=ProfileResponse)
async def get_profile(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Fetch the logged-in user's full profile including is_active and image."""
    # Always query the full User row so we get is_active
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
    image_path = profile.ProfileImagePath if profile else None

    logger.info(f"Profile fetched for user {current_user.id} ({db_user.email})")
    return _build_response(db_user, image_path)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Update the logged-in user's full name."""
    if len(payload.full_name.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter Full Name (minimum 2 characters).",
        )

    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db_user.full_name = payload.full_name.strip()
    db.commit()
    db.refresh(db_user)

    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
    image_path = profile.ProfileImagePath if profile else None

    logger.info(f"Profile name updated for user {current_user.id}")
    return _build_response(db_user, image_path)


@router.post("/upload-image", response_model=ProfileResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Upload a profile image. Saves to static/profile-images/{userId}.{ext}."""
    extension = os.path.splitext(file.filename or "")[1].lower()
    if extension not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: jpg, jpeg, png, gif, webp.",
        )

    filename = f"{current_user.id}{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save profile image for user {current_user.id}: {e}")
        raise HTTPException(status_code=500, detail="Unable to save image. Please try again.")

    public_path = f"/profile-images/{filename}"

    # Upsert into UserProfile table
    try:
        profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()
        if profile:
            profile.ProfileImagePath = public_path
            logger.info(f"Updating existing profile for user {current_user.id}")
        else:
            profile = UserProfile(UserId=current_user.id, ProfileImagePath=public_path)
            db.add(profile)
            logger.info(f"Creating new profile for user {current_user.id}")
        
        db.commit()
        db.refresh(profile)
        logger.info(f"✓ Profile image committed to database for user {current_user.id}: {public_path}")
    except Exception as e:
        db.rollback()
        logger.error(f"✗ Failed to save profile to database: {type(e).__name__}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )

    db_user = db.query(User).filter(User.id == current_user.id).first()
    logger.info(f"Profile image updated for user {current_user.id}: {public_path}")
    return _build_response(db_user, profile.ProfileImagePath)


@router.delete("/image", response_model=ProfileResponse)
async def delete_profile_image(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
) -> ProfileResponse:
    """Remove the user's profile image from disk and clear the DB path."""
    profile = db.query(UserProfile).filter(UserProfile.UserId == current_user.id).first()

    if profile and profile.ProfileImagePath:
        # Delete file from disk (best-effort)
        filename = os.path.basename(profile.ProfileImagePath)
        file_path = os.path.join(UPLOAD_DIR, filename)
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted image file: {file_path}")
        except Exception as e:
            logger.warning(f"Could not delete image file {file_path}: {e}")

        # Update database
        try:
            profile.ProfileImagePath = None
            db.commit()
            db.refresh(profile)
            logger.info(f"✓ Profile image deleted from database for user {current_user.id}")
        except Exception as e:
            db.rollback()
            logger.error(f"✗ Failed to delete profile from database: {type(e).__name__}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Database error: {str(e)}"
            )

    db_user = db.query(User).filter(User.id == current_user.id).first()
    logger.info(f"Profile image deleted for user {current_user.id}")
    return _build_response(db_user, None)
