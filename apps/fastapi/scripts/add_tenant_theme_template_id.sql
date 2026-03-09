-- Tenant → Theme Template assignment: add theme_template_id to tenants
-- Run this script when Alembic cannot be applied (e.g. version mismatch).
-- Database: SQL Server (MSSQL)
-- Prerequisite: theme_templates table must exist.

-- Add column if not present
IF NOT EXISTS (
    SELECT 1 FROM sys.columns c
    INNER JOIN sys.tables t ON c.object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND t.name = 'tenants' AND c.name = 'theme_template_id'
)
BEGIN
    ALTER TABLE dbo.tenants
    ADD theme_template_id INT NULL;

    PRINT 'Column dbo.tenants.theme_template_id added.';
END
ELSE
BEGIN
    PRINT 'Column dbo.tenants.theme_template_id already exists.';
END
GO

-- Create index if not present
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes i
    INNER JOIN sys.tables t ON i.object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND t.name = 'tenants' AND i.name = 'ix_tenants_theme_template_id'
)
BEGIN
    CREATE NONCLUSTERED INDEX ix_tenants_theme_template_id
    ON dbo.tenants (theme_template_id);

    PRINT 'Index ix_tenants_theme_template_id created.';
END
ELSE
BEGIN
    PRINT 'Index ix_tenants_theme_template_id already exists.';
END
GO

-- Create foreign key if not present
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys f
    INNER JOIN sys.tables t ON f.parent_object_id = t.object_id
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND t.name = 'tenants' AND f.name = 'fk_tenants_theme_template_id'
)
BEGIN
    ALTER TABLE dbo.tenants
    ADD CONSTRAINT fk_tenants_theme_template_id
    FOREIGN KEY (theme_template_id) REFERENCES dbo.theme_templates (id)
    ON DELETE SET NULL;

    PRINT 'Foreign key fk_tenants_theme_template_id created.';
END
ELSE
BEGIN
    PRINT 'Foreign key fk_tenants_theme_template_id already exists.';
END
GO
