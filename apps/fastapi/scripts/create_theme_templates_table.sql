-- Theme Template Manager: create theme_templates table
-- Run this script on your database when Alembic cannot be applied (e.g. version mismatch).
-- Database: SQL Server (MSSQL)

-- Create table
IF NOT EXISTS (
    SELECT * FROM sys.tables t
    INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
    WHERE s.name = 'dbo' AND t.name = 'theme_templates'
)
BEGIN
    CREATE TABLE dbo.theme_templates (
        id              INT             NOT NULL IDENTITY(1,1),
        name            NVARCHAR(200)   NOT NULL,
        description     NVARCHAR(1000)  NULL,
        config          NVARCHAR(MAX)   NOT NULL,
        created_at      DATETIME        NOT NULL CONSTRAINT DF_theme_templates_created_at DEFAULT (GETUTCDATE()),
        updated_at      DATETIME        NULL,
        created_by      INT             NULL,
        updated_by      INT             NULL,
        CONSTRAINT PK_theme_templates PRIMARY KEY (id)
    );

    CREATE NONCLUSTERED INDEX ix_theme_templates_id   ON dbo.theme_templates (id);
    CREATE NONCLUSTERED INDEX ix_theme_templates_name ON dbo.theme_templates (name);

    PRINT 'Table dbo.theme_templates created.';
END
ELSE
BEGIN
    PRINT 'Table dbo.theme_templates already exists.';
END
GO
