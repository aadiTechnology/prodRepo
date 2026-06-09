import base64
import os
import re
import time

from sqlalchemy.orm import Session

from app.models.teacher import Teacher
from app.models.user_profile import UserProfile

UPLOAD_DIR = "static/profile-images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

_DATA_URL_RE = re.compile(r"^data:(image/[\w.+-]+);base64,(.+)$", re.DOTALL | re.IGNORECASE)

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def _extension_from_mime(mime: str) -> str:
    return MIME_TO_EXT.get(mime.lower(), ".jpg")


def _upsert_user_profile(db: Session, user_id: int, public_path: str | None) -> None:
    profile = db.query(UserProfile).filter(UserProfile.UserId == user_id).first()
    if profile:
        profile.ProfileImagePath = public_path
    else:
        db.add(UserProfile(UserId=user_id, ProfileImagePath=public_path))


def _sync_teacher_photo_url(db: Session, user_id: int, public_path: str | None) -> None:
    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.user_id == user_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if teacher:
        teacher.photo_url = public_path


def save_user_profile_image(db: Session, user_id: int, photo_source: str | None) -> str | None:
    """Persist a profile image for a user from base64 data URL, existing path, or clear it."""
    if not photo_source or not str(photo_source).strip():
        _upsert_user_profile(db, user_id, None)
        _sync_teacher_photo_url(db, user_id, None)
        db.commit()
        return None

    photo_source = str(photo_source).strip()

    if photo_source.startswith("/profile-images/"):
        _upsert_user_profile(db, user_id, photo_source)
        _sync_teacher_photo_url(db, user_id, photo_source)
        db.commit()
        return photo_source

    match = _DATA_URL_RE.match(photo_source)
    if match:
        mime, b64_data = match.group(1), match.group(2)
        ext = _extension_from_mime(mime)
        filename = f"{user_id}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as file_handle:
            file_handle.write(base64.b64decode(b64_data))
        public_path = f"/profile-images/{filename}?v={int(time.time())}"
        _upsert_user_profile(db, user_id, public_path)
        _sync_teacher_photo_url(db, user_id, public_path)
        db.commit()
        return public_path

    if photo_source.startswith("http"):
        _upsert_user_profile(db, user_id, photo_source)
        _sync_teacher_photo_url(db, user_id, photo_source)
        db.commit()
        return photo_source

    return None


def resolve_user_profile_image_path(db: Session, user_id: int) -> str | None:
    profile = db.query(UserProfile).filter(UserProfile.UserId == user_id).first()
    if profile and profile.ProfileImagePath:
        return profile.ProfileImagePath

    teacher = (
        db.query(Teacher)
        .filter(
            Teacher.user_id == user_id,
            Teacher.is_deleted == False,  # noqa: E712
        )
        .first()
    )
    if teacher and teacher.photo_url:
        return teacher.photo_url

    return None


def sync_teacher_photo_from_profile_path(db: Session, user_id: int, public_path: str | None) -> None:
    _sync_teacher_photo_url(db, user_id, public_path)
    db.commit()


def resolve_teacher_photo_url(
    db: Session,
    user_id: int | None,
    stored_photo_url: str | None,
) -> str | None:
    """Return the best available teacher photo (linked user profile first)."""
    if user_id:
        resolved = resolve_user_profile_image_path(db, user_id)
        if resolved:
            return resolved
    return stored_photo_url
