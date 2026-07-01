import base64
import os
import re
import shutil
import time

from sqlalchemy.orm import Session

from app.models.student import Student
from app.models.teacher import Teacher
from app.models.user import User
from app.models.user_profile import UserProfile
from app.utils.student_login_email import normalize_email

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


def _resolve_student_for_user(db: Session, user_id: int) -> Student | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.tenant_id:
        return None

    from app.services.homework_access import _resolve_student_record

    return _resolve_student_record(
        db,
        tenant_id=user.tenant_id,
        user_id=user_id,
        email=user.email or "",
    )


def _resolve_user_for_student(db: Session, student: Student) -> User | None:
    if not student.tenant_id:
        return None

    tenant_id = student.tenant_id
    admission_key = (student.admission_no or student.student_code or str(student.id)).strip()
    candidates: list[str] = []

    if student.email:
        candidates.append(normalize_email(student.email))

    candidates.append(f"{admission_key.lower()}@student.local")

    if student.email and "@" in student.email:
        local, domain = student.email.rsplit("@", 1)
        tag = admission_key.lower().replace("+", "").replace("@", "")
        candidates.append(f"{local}+{tag}@{domain}".lower())

    for email in candidates:
        user = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
                User.email.ilike(email),
            )
            .first()
        )
        if user:
            return user

    if student.student_name:
        matches = (
            db.query(User)
            .filter(
                User.tenant_id == tenant_id,
                User.is_deleted == False,  # noqa: E712
                User.full_name.ilike(student.student_name.strip()),
            )
            .all()
        )
        if len(matches) == 1:
            return matches[0]

    return None


def _sync_student_photo_url(db: Session, user_id: int, public_path: str | None) -> None:
    student = _resolve_student_for_user(db, user_id)
    if student:
        student.photo_url = public_path


def _is_served_static_path(path: str) -> bool:
    return path.startswith("/profile-images/") or path.startswith("/enrollment-documents/")


def _normalize_profile_image_source(user_id: int, photo_source: str) -> str:
    """Store profile images under /profile-images/, copying enrollment uploads when needed."""
    path_only = photo_source.split("?", 1)[0].strip()
    if path_only.startswith("/profile-images/"):
        return photo_source

    if not path_only.startswith("/enrollment-documents/"):
        return photo_source

    filename = os.path.basename(path_only)
    source_path = os.path.join("static/enrollment-documents", filename)
    if not os.path.isfile(source_path):
        return photo_source

    ext = os.path.splitext(filename)[1] or ".jpg"
    dest_name = f"{user_id}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, dest_name)
    shutil.copy2(source_path, dest_path)
    return f"/profile-images/{dest_name}?v={int(time.time())}"


def save_user_profile_image(db: Session, user_id: int, photo_source: str | None) -> str | None:
    """Persist a profile image for a user from base64 data URL, existing path, or clear it."""
    if not photo_source or not str(photo_source).strip():
        _upsert_user_profile(db, user_id, None)
        _sync_teacher_photo_url(db, user_id, None)
        _sync_student_photo_url(db, user_id, None)
        db.commit()
        return None

    photo_source = str(photo_source).strip()

    if _is_served_static_path(photo_source):
        public_path = _normalize_profile_image_source(user_id, photo_source)
        _upsert_user_profile(db, user_id, public_path)
        _sync_teacher_photo_url(db, user_id, public_path)
        _sync_student_photo_url(db, user_id, public_path)
        db.commit()
        return public_path

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
        _sync_student_photo_url(db, user_id, public_path)
        db.commit()
        return public_path

    if photo_source.startswith("http"):
        _upsert_user_profile(db, user_id, photo_source)
        _sync_teacher_photo_url(db, user_id, photo_source)
        _sync_student_photo_url(db, user_id, photo_source)
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

    student = _resolve_student_for_user(db, user_id)
    if student and student.photo_url:
        return student.photo_url

    return None


def sync_teacher_photo_from_profile_path(db: Session, user_id: int, public_path: str | None) -> None:
    _sync_teacher_photo_url(db, user_id, public_path)
    db.commit()


def sync_student_photo_from_profile_path(db: Session, user_id: int, public_path: str | None) -> None:
    _sync_student_photo_url(db, user_id, public_path)
    db.commit()


def sync_student_user_photo(db: Session, student: Student, photo_url: str | None) -> None:
    """Copy a student record photo onto the linked login user's profile."""
    user = _resolve_user_for_student(db, student)
    if user:
        save_user_profile_image(db, user.id, photo_url)


def ensure_user_profile_image_from_student(db: Session, user_id: int) -> str | None:
    """Backfill a student's enrollment photo onto their login profile when missing."""
    profile = db.query(UserProfile).filter(UserProfile.UserId == user_id).first()
    if profile and profile.ProfileImagePath:
        return profile.ProfileImagePath

    student = _resolve_student_for_user(db, user_id)
    if student and student.photo_url:
        return save_user_profile_image(db, user_id, student.photo_url)

    return resolve_user_profile_image_path(db, user_id)


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
