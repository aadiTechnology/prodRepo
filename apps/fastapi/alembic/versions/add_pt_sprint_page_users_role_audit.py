"""Add AssignmentRole, IsPrimary, audit columns to PT_SprintPageUsers; update unique constraint.

Revision ID: add_pt_sprint_page_users_role_audit
Revises: add_pt_sprint_feature_page_user_mappings
Create Date: 2026-04-10

AssignmentRole: 1 = Developer, 2 = Tester. NULL legacy rows backfilled to 1.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "add_pt_sprint_page_users_role_audit"
down_revision: Union[str, Sequence[str], None] = "add_pt_sprint_feature_page_user_mappings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'PT_SprintPageUsers' AND schema_id = SCHEMA_ID(N'dbo'))
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'AssignmentRole'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers ADD AssignmentRole INT NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'IsPrimary'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers ADD IsPrimary INT NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'UpdatedOn'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers ADD UpdatedOn DATETIME2 NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'UpdatedByUserId'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers ADD UpdatedByUserId INT NULL;

                UPDATE dbo.PT_SprintPageUsers SET AssignmentRole = 1 WHERE AssignmentRole IS NULL;
                UPDATE dbo.PT_SprintPageUsers SET IsPrimary = 0 WHERE IsPrimary IS NULL;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PT_SprintPageUsers_UpdatedByUser'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers
                    ADD CONSTRAINT FK_PT_SprintPageUsers_UpdatedByUser
                    FOREIGN KEY (UpdatedByUserId) REFERENCES dbo.users(id);

                IF EXISTS (
                    SELECT 1 FROM sys.key_constraints
                    WHERE name = N'UQ_PT_SprintPageUsers_Sprint_Feature_Page_User'
                      AND parent_object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers')
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP CONSTRAINT UQ_PT_SprintPageUsers_Sprint_Feature_Page_User;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.key_constraints
                    WHERE name = N'UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role'
                      AND parent_object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers')
                )
                    ALTER TABLE dbo.PT_SprintPageUsers
                    ADD CONSTRAINT UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role
                    UNIQUE (SprintId, FeatureId, PageId, UserId, AssignmentRole);
            END
            """
        )
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            IF EXISTS (SELECT 1 FROM sys.tables WHERE name = N'PT_SprintPageUsers' AND schema_id = SCHEMA_ID(N'dbo'))
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM sys.key_constraints
                    WHERE name = N'UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP CONSTRAINT UQ_PT_SprintPageUsers_Sprint_Feature_Page_User_Role;

                IF EXISTS (
                    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PT_SprintPageUsers_UpdatedByUser'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP CONSTRAINT FK_PT_SprintPageUsers_UpdatedByUser;

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'UpdatedByUserId'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP COLUMN UpdatedByUserId;

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'UpdatedOn'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP COLUMN UpdatedOn;

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'IsPrimary'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP COLUMN IsPrimary;

                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PT_SprintPageUsers') AND name = N'AssignmentRole'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers DROP COLUMN AssignmentRole;

                IF NOT EXISTS (
                    SELECT 1 FROM sys.key_constraints
                    WHERE name = N'UQ_PT_SprintPageUsers_Sprint_Feature_Page_User'
                )
                    ALTER TABLE dbo.PT_SprintPageUsers
                    ADD CONSTRAINT UQ_PT_SprintPageUsers_Sprint_Feature_Page_User
                    UNIQUE (SprintId, FeatureId, PageId, UserId);
            END
            """
        )
    )
