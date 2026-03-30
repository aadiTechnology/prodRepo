"""
Timesheet entry table mapping for reporting (dbo.TimesheetEntries).
Read-oriented; table has no primary key in the canonical DDL — use Core Table for selects.
"""

from sqlalchemy import Column, DateTime, Integer, Numeric, String, Table

from app.core.database import Base

timesheet_entries = Table(
    "TimesheetEntries",
    Base.metadata,
    Column("OwnerName", String(100)),
    Column("FeatureName", String(200)),
    Column("PageName", String(200)),
    Column("TaskType", String(100)),
    Column("Subtask", String(200)),
    Column("Description", String(500)),
    Column("SpendEfforts", Numeric(5, 2)),
    Column("CreatedOn", DateTime),
    Column("Sprint", Integer),
    schema="dbo",
)
