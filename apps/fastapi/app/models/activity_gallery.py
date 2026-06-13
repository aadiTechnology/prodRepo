from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Column, Date, DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ActivityGallery(Base):
    __tablename__ = "activity_gallery"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    tenant_id = Column(BigInteger, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    gallery_name = Column(String(255), nullable=False)
    gallery_type = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    activity_date = Column(Date, nullable=False)
    created_by = Column(BigInteger, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    status = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    media_items = relationship(
        "ActivityGalleryMedia",
        back_populates="gallery",
        cascade="all, delete-orphan",
        lazy="select",
    )
    class_mappings = relationship(
        "ActivityGalleryClassMapping",
        back_populates="gallery",
        cascade="all, delete-orphan",
        lazy="select",
    )


class ActivityGalleryMedia(Base):
    __tablename__ = "activity_gallery_media"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    gallery_id = Column(
        BigInteger,
        ForeignKey("activity_gallery.id", ondelete="CASCADE"),
        nullable=False,
    )
    media_type = Column(String(20), nullable=False)
    file_name = Column(String(255), nullable=False)
    original_file_name = Column(String(255), nullable=True)
    file_path = Column(String(1000), nullable=False)
    file_content = Column(LargeBinary, nullable=True)
    file_size = Column(BigInteger, nullable=True)
    display_order = Column(Integer, default=1, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(Integer, default=1, nullable=False)

    gallery = relationship("ActivityGallery", back_populates="media_items")


class ActivityGalleryClassMapping(Base):
    __tablename__ = "activity_gallery_class_mapping"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    gallery_id = Column(
        BigInteger,
        ForeignKey("activity_gallery.id", ondelete="CASCADE"),
        nullable=False,
    )
    class_id = Column(BigInteger, nullable=False)
    division_id = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    gallery = relationship("ActivityGallery", back_populates="class_mappings")
