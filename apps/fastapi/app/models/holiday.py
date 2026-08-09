from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, event

from app.core.database import Base
from app.utils.holiday_storage import (
    coerce_holiday_type_for_db,
    pack_holiday_description,
    unpack_holiday_description,
)


class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    academic_year_id = Column(Integer, ForeignKey("academic_years.id", ondelete="NO ACTION"), nullable=False)
    holiday_name = Column(String(150), nullable=False)
    holiday_type = Column(String(50), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    applicable_for = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)


@event.listens_for(Holiday, "before_insert", propagate=True)
@event.listens_for(Holiday, "before_update", propagate=True)
def _enforce_legacy_holiday_type_check(mapper, connection, target: Holiday) -> None:
    """Many DBs still CHECK holiday_type to legacy enums. Coerce the column and keep free text in HOLIDAY_META_V1."""
    raw = (getattr(target, "holiday_type", None) or "").strip()
    db_val, label = coerce_holiday_type_for_db(raw)
    target.holiday_type = db_val
    if not label:
        return
    aud, c_ids, d_ids, user_notes, _, creator_id = unpack_holiday_description(getattr(target, "description", None))
    aud_resolved = (aud or "STUDENT").strip().upper()
    target.description = pack_holiday_description(
        aud_resolved,
        c_ids,
        d_ids,
        user_notes if user_notes else None,
        holiday_type_label=label,
        created_by_user_id=creator_id,
    )
