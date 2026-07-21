-- Hindi/Marathi and other Unicode text support for homework + notices
-- Target: MS SQL Server (erpdb). Safe to re-run after columns are already NVARCHAR.

USE [erpdb];
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.homework')
      AND c.name = N'title'
      AND t.name = N'varchar'
)
BEGIN
    ALTER TABLE dbo.homework ALTER COLUMN title NVARCHAR(255) NOT NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.homework')
      AND c.name = N'instructions'
      AND t.name = N'varchar'
)
BEGIN
    ALTER TABLE dbo.homework ALTER COLUMN instructions NVARCHAR(MAX) NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.homework_attachments')
      AND c.name = N'file_name'
      AND t.name = N'varchar'
)
BEGIN
    ALTER TABLE dbo.homework_attachments ALTER COLUMN file_name NVARCHAR(255) NOT NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.communication_notices')
      AND c.name = N'title'
      AND t.name = N'varchar'
)
BEGIN
    ALTER TABLE dbo.communication_notices ALTER COLUMN title NVARCHAR(255) NOT NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
    WHERE c.object_id = OBJECT_ID(N'dbo.communication_notices')
      AND c.name = N'description'
      AND t.name = N'varchar'
)
BEGIN
    ALTER TABLE dbo.communication_notices ALTER COLUMN description NVARCHAR(MAX) NOT NULL;
END
GO

-- Verify
SELECT
    OBJECT_NAME(c.object_id) AS table_name,
    c.name AS column_name,
    t.name AS data_type,
    c.max_length
FROM sys.columns c
JOIN sys.types t ON c.user_type_id = t.user_type_id
WHERE OBJECT_NAME(c.object_id) IN (N'homework', N'homework_attachments', N'communication_notices')
  AND c.name IN (N'title', N'instructions', N'description', N'file_name')
ORDER BY table_name, column_name;
GO
