-- Store photo bytes in SQL Server instead of static JPG files.
IF COL_LENGTH('dbo.activity_gallery_media', 'file_content') IS NULL
BEGIN
    ALTER TABLE dbo.activity_gallery_media
        ADD file_content VARBINARY(MAX) NULL;
END;
