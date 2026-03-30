"""
PT_* normalized timesheet tables used by reporting.

These tables are created/migrated via SQL scripts in Product/document.
We map them as SQLAlchemy Core Tables for read-heavy queries.
"""

from sqlalchemy import Column, Date, DateTime, Integer, Numeric, String, Table

from app.core.database import Base


pt_owners = Table(
    "PT_Owners",
    Base.metadata,
    Column("OwnerId", Integer, primary_key=True),
    Column("OwnerName", String(100)),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
)

pt_features = Table(
    "PT_Features",
    Base.metadata,
    Column("FeatureId", Integer, primary_key=True),
    Column("FeatureName", String(200)),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
)

pt_tasks = Table(
    "PT_Tasks",
    Base.metadata,
    Column("TaskId", Integer, primary_key=True),
    Column("TaskName", String(100)),
    Column("CategoryId", Integer),
)

pt_sprints = Table(
    "PT_Sprints",
    Base.metadata,
    Column("SprintId", Integer, primary_key=True),
    Column("SprintName", String(100)),
    Column("StartDate", Date),
    Column("EndDate", Date),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
)

pt_pages = Table(
    "PT_Pages",
    Base.metadata,
    Column("PageId", Integer, primary_key=True),
    Column("FeatureId", Integer),
    Column("PageName", String(200)),
)

pt_subtasks = Table(
    "PT_Subtasks",
    Base.metadata,
    Column("SubtaskId", Integer, primary_key=True),
    Column("TaskId", Integer),
    Column("SubtaskName", String(200)),
)

pt_timesheets = Table(
    "PT_Timesheets",
    Base.metadata,
    Column("TimesheetId", Integer, primary_key=True),
    Column("OwnerId", Integer),
    Column("FeatureId", Integer),
    Column("PageId", Integer),
    Column("TaskId", Integer),
    Column("SubtaskId", Integer),
    Column("SprintId", Integer),
    Column("Description", String(500)),
    Column("Efforts", Numeric(5, 2)),
    Column("ActivityDate", DateTime),
    Column("CreatedOn", DateTime),
)

