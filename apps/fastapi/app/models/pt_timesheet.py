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

pt_project_users = Table(
    "PT_ProjectUsers",
    Base.metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id"), nullable=False),
    Column("UserId", Integer, ForeignKey("users.id"), nullable=False),
    Column("IsActive", Integer),
    Column("CreatedOn", DateTime),
    UniqueConstraint("ProjectId", "UserId", name="UQ_PT_ProjectUsers_Project_User"),
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
    Column("IsCompleted", Integer),
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

# --- Sprint assignment mappings (Feature -> Page -> Owner) ---
pt_sprint_features = Table(
    "PT_SprintFeatures",
    Base.metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("SprintId", Integer, ForeignKey("PT_Sprints.SprintId", ondelete="CASCADE"), nullable=False),
    Column("FeatureId", Integer, ForeignKey("PT_Features.FeatureId", ondelete="CASCADE"), nullable=False),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id", ondelete="CASCADE"), nullable=False),
    UniqueConstraint("SprintId", "FeatureId", name="UQ_PT_SprintFeatures_Sprint_Feature"),
    schema=_SCHEMA,
)

pt_sprint_feature_pages = Table(
    "PT_SprintFeaturePages",
    Base.metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("SprintId", Integer, ForeignKey("PT_Sprints.SprintId", ondelete="CASCADE"), nullable=False),
    Column("FeatureId", Integer, ForeignKey("PT_Features.FeatureId", ondelete="CASCADE"), nullable=False),
    Column("PageId", Integer, ForeignKey("PT_Pages.PageId", ondelete="CASCADE"), nullable=False),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id", ondelete="CASCADE"), nullable=False),
    UniqueConstraint("SprintId", "FeatureId", "PageId", name="UQ_PT_SprintFeaturePages_Sprint_Feature_Page"),
    schema=_SCHEMA,
)

pt_sprint_page_users = Table(
    "PT_SprintPageUsers",
    Base.metadata,
    Column("Id", Integer, primary_key=True, autoincrement=True),
    Column("SprintId", Integer, ForeignKey("PT_Sprints.SprintId", ondelete="CASCADE"), nullable=False),
    Column("FeatureId", Integer, ForeignKey("PT_Features.FeatureId", ondelete="CASCADE"), nullable=False),
    Column("PageId", Integer, ForeignKey("PT_Pages.PageId", ondelete="CASCADE"), nullable=False),
    Column("UserId", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("ProjectId", Integer, ForeignKey("PT_Project.Id", ondelete="CASCADE"), nullable=False),
    # 1 = Developer, 2 = Tester (legacy NULL treated as 1 in queries)
    Column("AssignmentRole", Integer, nullable=True),
    Column("IsPrimary", Integer, nullable=True),
    Column("UpdatedOn", DateTime, nullable=True),
    Column("UpdatedByUserId", Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    UniqueConstraint(
        "SprintId",
        "FeatureId",
        "PageId",
        "UserId",
        "AssignmentRole",
        name="UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role",
    ),
    schema=_SCHEMA,
)

