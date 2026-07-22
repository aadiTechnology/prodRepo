-- Make homework.submission_date optional (no due date => NULL, list shows "—")
-- Target: MS SQL Server (erpdb). Safe to re-run.

USE [erpdb];
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.homework')
      AND name = N'submission_date'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.homework ALTER COLUMN submission_date DATE NULL;
    PRINT 'homework.submission_date is now NULLABLE';
END
ELSE
BEGIN
    PRINT 'homework.submission_date already NULLABLE (no change)';
END
GO

-- Verify
SELECT
    c.name AS column_name,
    t.name AS data_type,
    c.is_nullable
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE c.object_id = OBJECT_ID(N'dbo.homework')
  AND c.name = N'submission_date';
GO
