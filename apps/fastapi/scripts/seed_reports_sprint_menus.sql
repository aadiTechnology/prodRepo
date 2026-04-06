/*
  Refresh Reports menu catalog (Sprint + Sprintwise + General Reports child rows).
  Equivalent to the "Reports" block in: python scripts/seed_rbac.py

  Target: SQL Server (matches Alembic defaults: getutcdate, bit flags).

  Prerequisites:
    - Tables: features, menus
    - Column menus.feature_id must exist (ORM model); if missing, add via migration first.

  After running: optionally run scripts/backfill_role_menu_permissions.py (or your sync)
  so tenant ADMIN roles get role_menus + role_menu_permissions for new menu ids.
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @fid INT;

SELECT @fid = id
FROM features
WHERE code = N'REPORTS_MGMT' AND is_deleted = 0;

IF @fid IS NULL
BEGIN
    INSERT INTO features (code, name, category, is_active, is_deleted, created_at)
    VALUES (N'REPORTS_MGMT', N'Reports Management', N'Reports', 1, 0, SYSUTCDATETIME());

    SET @fid = CAST(SCOPE_IDENTITY() AS INT);
END;

DECLARE @parentId INT;

SELECT TOP (1)
    @parentId = id
FROM menus
WHERE name = N'Reports'
  AND level = 1
  AND parent_id IS NULL
  AND (tenant_id IS NULL)
  AND is_deleted = 0
ORDER BY id;

IF @parentId IS NULL
BEGIN
    INSERT INTO menus (
        tenant_id, parent_id, name, path, icon, sort_order, level,
        is_active, is_deleted, created_at, feature_id
    )
    VALUES (
        NULL, NULL, N'Reports', NULL, N'reportsIcon', 6, 1,
        1, 0, SYSUTCDATETIME(), NULL
    );

    SET @parentId = CAST(SCOPE_IDENTITY() AS INT);
END
ELSE
BEGIN
    UPDATE menus
    SET icon = N'reportsIcon',
        sort_order = 6,
        is_active = 1,
        updated_at = SYSUTCDATETIME()
    WHERE id = @parentId;
END;

/* --- Child menus (same feature as seed_rbac.py) --- */

IF NOT EXISTS (
    SELECT 1 FROM menus
    WHERE parent_id = @parentId AND name = N'General Reports' AND is_deleted = 0
)
BEGIN
    INSERT INTO menus (
        tenant_id, parent_id, name, path, icon, sort_order, level,
        is_active, is_deleted, created_at, feature_id
    )
    VALUES (
        NULL, @parentId, N'General Reports', N'/reports/general', NULL, 0, 2,
        1, 0, SYSUTCDATETIME(), @fid
    );
END
ELSE
BEGIN
    UPDATE menus
    SET path = N'/reports/general',
        feature_id = @fid,
        level = 2,
        is_active = 1,
        updated_at = SYSUTCDATETIME()
    WHERE parent_id = @parentId AND name = N'General Reports' AND is_deleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM menus
    WHERE parent_id = @parentId AND name = N'Sprint Performance' AND is_deleted = 0
)
BEGIN
    INSERT INTO menus (
        tenant_id, parent_id, name, path, icon, sort_order, level,
        is_active, is_deleted, created_at, feature_id
    )
    VALUES (
        NULL, @parentId, N'Sprint Performance', N'/reports/sprint-performance', NULL, 0, 2,
        1, 0, SYSUTCDATETIME(), @fid
    );
END
ELSE
BEGIN
    UPDATE menus
    SET path = N'/reports/sprint-performance',
        feature_id = @fid,
        level = 2,
        is_active = 1,
        updated_at = SYSUTCDATETIME()
    WHERE parent_id = @parentId AND name = N'Sprint Performance' AND is_deleted = 0;
END;

IF NOT EXISTS (
    SELECT 1 FROM menus
    WHERE parent_id = @parentId AND name = N'Sprintwise Performance' AND is_deleted = 0
)
BEGIN
    INSERT INTO menus (
        tenant_id, parent_id, name, path, icon, sort_order, level,
        is_active, is_deleted, created_at, feature_id
    )
    VALUES (
        NULL, @parentId, N'Sprintwise Performance', N'/reports/sprintwise-performance', NULL, 0, 2,
        1, 0, SYSUTCDATETIME(), @fid
    );
END
ELSE
BEGIN
    UPDATE menus
    SET path = N'/reports/sprintwise-performance',
        feature_id = @fid,
        level = 2,
        is_active = 1,
        updated_at = SYSUTCDATETIME()
    WHERE parent_id = @parentId AND name = N'Sprintwise Performance' AND is_deleted = 0;
END;

COMMIT TRANSACTION;

PRINT N'Reports menu catalog refresh completed (General + Sprint + Sprintwise).';
