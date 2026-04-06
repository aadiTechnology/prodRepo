"""
PT_* normalized timesheet tables used by reporting.

These tables are created/migrated via SQL scripts in Product/document.
We map them as SQLAlchemy Core Tables for read-heavy queries.
"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Table, UniqueConstraint

from app.core.database import Base


_SCHEMA = "dbo"

pt_project = Table(
    "PT_Project",
    Base.metadata,
    Column("Id", Integer, primary_key=True),
    Column("TenantId", Integer, ForeignKey("tenants.id"), nullable=False),
    Column("ProjectName", String(200), nullable=False),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
    schema=_SCHEMA,
)

pt_owners = Table(
    "PT_Owners",
    Base.metadata,
    Column("OwnerId", Integer, primary_key=True),
    Column("OwnerName", String(100)),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
    schema=_SCHEMA,
)

pt_features = Table(
    "PT_Features",
    Base.metadata,
    Column("FeatureId", Integer, primary_key=True),
    Column("FeatureName", String(200)),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id"), nullable=False),
    schema=_SCHEMA,
)

pt_task_categories = Table(
    "PT_TaskCategories",
    Base.metadata,
    Column("CategoryId", Integer, primary_key=True),
    Column("CategoryName", String(100)),
    schema=_SCHEMA,
)

pt_task_type = Table(
    "PT_TaskType",
    Base.metadata,
    Column("TaskId", Integer, primary_key=True),
    Column("TaskName", String(100)),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id")),
    schema=_SCHEMA,
)

pt_task_category_mapping = Table(
    "PT_TaskCategoryMapping",
    Base.metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("TaskId", Integer, ForeignKey("PT_TaskType.TaskId"), nullable=False),
    Column("CategoryId", Integer, ForeignKey("PT_TaskCategories.CategoryId"), nullable=False),
    Column("CreatedOn", DateTime),
    UniqueConstraint("TaskId", "CategoryId", name="UQ_Task_Category"),
    schema=_SCHEMA,
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
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id")),
    schema=_SCHEMA,
)

pt_pages = Table(
    "PT_Pages",
    Base.metadata,
    Column("PageId", Integer, primary_key=True),
    Column("FeatureId", Integer),
    Column("PageName", String(200)),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id"), nullable=False),
    schema=_SCHEMA,
)

pt_subtasks = Table(
    "PT_Subtasks",
    Base.metadata,
    Column("SubtaskId", Integer, primary_key=True),
    Column("TaskId", Integer),
    Column("SubtaskName", String(200)),
    schema=_SCHEMA,
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
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id")),
    schema=_SCHEMA,
)

