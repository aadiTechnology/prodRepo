/*
  PT_SprintPageUsers — role, primary flag, audit columns, unique constraint (SQL Server / dbo)

  Equivalent to Alembic revision: add_pt_sprint_page_users_role_audit
  Run once per database where dbo.PT_SprintPageUsers already exists.

  AssignmentRole: 1 = Developer, 2 = Tester (legacy NULL rows set to 1).
  IsPrimary: 1 = primary for that role on the page (0 otherwise).
*/

SET NOCOUNT ON;

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
ELSE
    PRINT 'Skipped: dbo.PT_SprintPageUsers does not exist.';

PRINT 'PT_SprintPageUsers role/audit migration script finished.';
