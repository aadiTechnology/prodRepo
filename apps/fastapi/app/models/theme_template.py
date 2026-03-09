"""Theme Template model for storing reusable token override configurations."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import Base


class ThemeTemplate(Base):
    """
    Stores a named set of token overrides (design token configuration).
    Used by Theme Studio for create/edit/load and later for tenant assignment.
    """

    __tablename__ = "theme_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(String(1000), nullable=True)

    # Token overrides as JSON (partial Tokens / StudioOverrides).
    # Compatible with mergeTokenOverrides and buildExportConfig for tenant theme generator.
    config = Column(Text, nullable=False)  # JSON string; MSSQL-friendly

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=True, onupdate=datetime.utcnow)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
