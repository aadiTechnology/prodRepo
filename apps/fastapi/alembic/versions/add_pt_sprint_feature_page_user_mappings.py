"""Add PT sprint feature/page/user mapping tables (dbo).

Revision ID: add_pt_sprint_feature_page_user_mappings
Revises: add_pt_sprints_is_completed
Create Date: 2026-04-08
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_pt_sprint_feature_page_user_mappings"
down_revision: Union[str, Sequence[str], None] = "add_pt_sprints_is_completed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF OBJECT_ID(N'dbo.PT_SprintFeatures', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.PT_SprintFeatures (
                    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    SprintId INT NOT NULL,
                    FeatureId INT NOT NULL,
                    ProjectId INT NOT NULL,
                    CONSTRAINT FK_PT_SprintFeatures_Sprint FOREIGN KEY (SprintId) REFERENCES dbo.PT_Sprints(SprintId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintFeatures_Feature FOREIGN KEY (FeatureId) REFERENCES dbo.PT_Features(FeatureId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintFeatures_Project FOREIGN KEY (ProjectId) REFERENCES dbo.PT_Project(Id) ON DELETE CASCADE,
                    CONSTRAINT UQ_PT_SprintFeatures_Sprint_Feature UNIQUE (SprintId, FeatureId)
                );

                CREATE INDEX IX_PT_SprintFeatures_SprintId ON dbo.PT_SprintFeatures(SprintId);
                CREATE INDEX IX_PT_SprintFeatures_ProjectId ON dbo.PT_SprintFeatures(ProjectId);
            END
            """
        )
    )

    conn.execute(
        sa.text(
            """
            IF OBJECT_ID(N'dbo.PT_SprintFeaturePages', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.PT_SprintFeaturePages (
                    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    SprintId INT NOT NULL,
                    FeatureId INT NOT NULL,
                    PageId INT NOT NULL,
                    ProjectId INT NOT NULL,
                    CONSTRAINT FK_PT_SprintFeaturePages_Sprint FOREIGN KEY (SprintId) REFERENCES dbo.PT_Sprints(SprintId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintFeaturePages_Feature FOREIGN KEY (FeatureId) REFERENCES dbo.PT_Features(FeatureId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintFeaturePages_Page FOREIGN KEY (PageId) REFERENCES dbo.PT_Pages(PageId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintFeaturePages_Project FOREIGN KEY (ProjectId) REFERENCES dbo.PT_Project(Id) ON DELETE CASCADE,
                    CONSTRAINT UQ_PT_SprintFeaturePages_Sprint_Feature_Page UNIQUE (SprintId, FeatureId, PageId)
                );

                CREATE INDEX IX_PT_SprintFeaturePages_SprintId ON dbo.PT_SprintFeaturePages(SprintId);
                CREATE INDEX IX_PT_SprintFeaturePages_Sprint_Feature ON dbo.PT_SprintFeaturePages(SprintId, FeatureId);
                CREATE INDEX IX_PT_SprintFeaturePages_ProjectId ON dbo.PT_SprintFeaturePages(ProjectId);
            END
            """
        )
    )

    conn.execute(
        sa.text(
            """
            IF OBJECT_ID(N'dbo.PT_SprintPageUsers', N'U') IS NULL
            BEGIN
                CREATE TABLE dbo.PT_SprintPageUsers (
                    Id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
                    SprintId INT NOT NULL,
                    FeatureId INT NOT NULL,
                    PageId INT NOT NULL,
                    UserId INT NOT NULL,
                    ProjectId INT NOT NULL,
                    CONSTRAINT FK_PT_SprintPageUsers_Sprint FOREIGN KEY (SprintId) REFERENCES dbo.PT_Sprints(SprintId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintPageUsers_Feature FOREIGN KEY (FeatureId) REFERENCES dbo.PT_Features(FeatureId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintPageUsers_Page FOREIGN KEY (PageId) REFERENCES dbo.PT_Pages(PageId) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintPageUsers_User FOREIGN KEY (UserId) REFERENCES dbo.users(id) ON DELETE CASCADE,
                    CONSTRAINT FK_PT_SprintPageUsers_Project FOREIGN KEY (ProjectId) REFERENCES dbo.PT_Project(Id) ON DELETE CASCADE,
                    CONSTRAINT UQ_PT_SprintPageUsers_Sprint_Feature_Page_User UNIQUE (SprintId, FeatureId, PageId, UserId)
                );

                CREATE INDEX IX_PT_SprintPageUsers_SprintId ON dbo.PT_SprintPageUsers(SprintId);
                CREATE INDEX IX_PT_SprintPageUsers_Sprint_Page ON dbo.PT_SprintPageUsers(SprintId, PageId);
                CREATE INDEX IX_PT_SprintPageUsers_ProjectId ON dbo.PT_SprintPageUsers(ProjectId);
            END
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("IF OBJECT_ID(N'dbo.PT_SprintPageUsers', N'U') IS NOT NULL DROP TABLE dbo.PT_SprintPageUsers;"))
    conn.execute(
        sa.text(
            "IF OBJECT_ID(N'dbo.PT_SprintFeaturePages', N'U') IS NOT NULL DROP TABLE dbo.PT_SprintFeaturePages;"
        )
    )
    conn.execute(
        sa.text(
            "IF OBJECT_ID(N'dbo.PT_SprintFeatures', N'U') IS NOT NULL DROP TABLE dbo.PT_SprintFeatures;"
        )
    )

