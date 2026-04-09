"""Drop unused dbo.PT_SprintFeatures (sprint assignments use PT_SprintPageUsers only).

Revision ID: drop_pt_sprint_features
Revises: add_pt_sprint_page_users_role_audit
Create Date: 2026-04-10
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "drop_pt_sprint_features"
down_revision: Union[str, Sequence[str], None] = "add_pt_sprint_page_users_role_audit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF OBJECT_ID(N'dbo.PT_SprintFeatures', N'U') IS NOT NULL
                DROP TABLE dbo.PT_SprintFeatures;
            """
        )
    )


def downgrade() -> None:
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
