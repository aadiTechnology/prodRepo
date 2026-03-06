-- Add requirement_hash to requirements (for duplicate detection)
-- Target: MS SQL Server. Run after requirements table exists.

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('requirements') AND name = 'requirement_hash'
)
BEGIN
    ALTER TABLE requirements ADD requirement_hash NVARCHAR(64) NULL;
    CREATE INDEX ix_requirements_requirement_hash ON requirements(requirement_hash);
END
GO
