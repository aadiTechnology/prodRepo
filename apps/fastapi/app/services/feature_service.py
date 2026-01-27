"""Service layer for Feature (permission) CRUD and queries."""

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging_config import get_logger
from app.models.feature import Feature
from app.schemas.feature import FeatureCreate, FeatureUpdate


logger = get_logger(__name__)


def get_features(db: Session) -> list[Feature]:
    """Return all non-deleted features."""
    return db.query(Feature).filter(Feature.is_deleted == False).all()  # noqa: E712


def get_feature(db: Session, feature_id: int) -> Feature:
    """Return a single feature by ID."""
    feature = db.query(Feature).filter(Feature.id == feature_id, Feature.is_deleted == False).first()  # noqa: E712
    if not feature:
        raise NotFoundException("Feature", feature_id)
    return feature


def create_feature(db: Session, data: FeatureCreate, created_by: int | None = None) -> Feature:
    """Create a new feature."""
    existing = (
        db.query(Feature)
        .filter(Feature.code == data.code, Feature.is_deleted == False)  # noqa: E712
        .first()
    )
    if existing:
        raise ConflictException(f"Feature with code '{data.code}' already exists")

    feature = Feature(
        code=data.code,
        name=data.name,
        description=data.description,
        category=data.category,
        is_active=data.is_active,
        created_by=created_by,
    )
    db.add(feature)
    db.commit()
    db.refresh(feature)
    logger.info(f"Feature created: {feature.code} (id={feature.id})")
    return feature


def update_feature(db: Session, feature_id: int, data: FeatureUpdate, updated_by: int | None = None) -> Feature:
    """Update an existing feature."""
    feature = get_feature(db, feature_id)

    if data.name is not None:
        feature.name = data.name
    if data.description is not None:
        feature.description = data.description
    if data.category is not None:
        feature.category = data.category
    if data.is_active is not None:
        feature.is_active = data.is_active

    feature.updated_by = updated_by
    db.commit()
    db.refresh(feature)
    logger.info(f"Feature updated: {feature.code} (id={feature.id})")
    return feature


def soft_delete_feature(db: Session, feature_id: int, deleted_by: int | None = None) -> None:
    """Soft delete a feature."""
    feature = get_feature(db, feature_id)
    feature.is_deleted = True
    feature.deleted_by = deleted_by
    db.commit()
    logger.info(f"Feature soft-deleted: {feature.code} (id={feature.id})")

