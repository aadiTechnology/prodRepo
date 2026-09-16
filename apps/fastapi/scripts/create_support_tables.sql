-- Support module tables (My Queries + Release Notes)
-- Target: MS SQL Server (erpdb). Idempotent — safe to re-run.
-- Do NOT use Alembic for this change; apply via SSMS / sqlcmd.

USE [erpdb];
GO

/* --------------------------------------------------------------------------
   support_queries
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_queries' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_queries] (
        [id]                       INT IDENTITY(1,1) NOT NULL,
        [tenant_id]                INT               NOT NULL,
        [query_ref]                VARCHAR(20)       NOT NULL,
        [category]                 NVARCHAR(100)     NOT NULL,
        [subject]                  NVARCHAR(500)     NOT NULL,
        [description]              NVARCHAR(MAX)     NOT NULL,
        [status]                   VARCHAR(20)       NOT NULL,
        [created_by_role]          VARCHAR(20)       NOT NULL,
        [attachment_file_name]     NVARCHAR(255)     NULL,
        [attachment_file_path]     VARCHAR(500)      NULL,
        [attachment_file_type]     VARCHAR(20)       NULL,
        [attachment_file_size_kb]  INT               NULL,
        [forwarded_to_super_admin] BIT               NOT NULL
            CONSTRAINT [DF_support_queries_forwarded] DEFAULT ((0)),
        [forwarded_by]             INT               NULL,
        [forwarded_at]             DATETIME          NULL,
        [created_at]               DATETIME          NOT NULL
            CONSTRAINT [DF_support_queries_created_at] DEFAULT (GETUTCDATE()),
        [created_by]               INT               NOT NULL,
        [updated_at]               DATETIME          NULL,
        [updated_by]               INT               NULL,
        [is_deleted]               BIT               NOT NULL
            CONSTRAINT [DF_support_queries_is_deleted] DEFAULT ((0)),
        [deleted_at]               DATETIME          NULL,
        [deleted_by]               INT               NULL,
        CONSTRAINT [PK_support_queries] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_queries_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_queries_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_queries_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_queries_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_queries_forwarded_by]
            FOREIGN KEY ([forwarded_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE UNIQUE NONCLUSTERED INDEX [UX_support_queries_tenant_ref]
        ON [dbo].[support_queries] ([tenant_id], [query_ref])
        WHERE [is_deleted] = 0;
    CREATE NONCLUSTERED INDEX [IX_support_queries_tenant_list]
        ON [dbo].[support_queries] ([tenant_id], [is_deleted], [created_at] DESC);
    PRINT 'CREATED: dbo.support_queries';
END
ELSE PRINT 'SKIP: dbo.support_queries already exists';
GO

/* --------------------------------------------------------------------------
   support_query_messages
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_query_messages' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_query_messages] (
        [id]           INT IDENTITY(1,1) NOT NULL,
        [tenant_id]    INT               NOT NULL,
        [query_id]     INT               NOT NULL,
        [author_user_id] INT             NOT NULL,
        [author_role]  VARCHAR(20)       NOT NULL,
        [body]         NVARCHAR(MAX)     NOT NULL,
        [created_at]   DATETIME          NOT NULL
            CONSTRAINT [DF_support_query_messages_created_at] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_support_query_messages] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_query_messages_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_query_messages_query]
            FOREIGN KEY ([query_id]) REFERENCES [dbo].[support_queries]([id]),
        CONSTRAINT [FK_support_query_messages_author]
            FOREIGN KEY ([author_user_id]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [IX_support_query_messages_query]
        ON [dbo].[support_query_messages] ([query_id], [created_at] ASC);
    PRINT 'CREATED: dbo.support_query_messages';
END
ELSE PRINT 'SKIP: dbo.support_query_messages already exists';
GO

/* --------------------------------------------------------------------------
   support_release_notes (global — no tenant_id)
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_release_notes' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_release_notes] (
        [id]                      INT IDENTITY(1,1) NOT NULL,
        [title]                   NVARCHAR(255)     NOT NULL,
        [version]                 VARCHAR(50)       NOT NULL,
        [release_date]            DATE              NOT NULL,
        [description]             NVARCHAR(MAX)     NOT NULL,
        [status]                  VARCHAR(20)       NOT NULL,
        [show_to_admin]           BIT               NOT NULL
            CONSTRAINT [DF_support_release_notes_show_admin] DEFAULT ((1)),
        [show_to_teacher]         BIT               NOT NULL
            CONSTRAINT [DF_support_release_notes_show_teacher] DEFAULT ((1)),
        [show_to_student]         BIT               NOT NULL
            CONSTRAINT [DF_support_release_notes_show_student] DEFAULT ((1)),
        [file_name]               NVARCHAR(255)     NULL,
        [file_path]               VARCHAR(500)      NULL,
        [file_type]               VARCHAR(20)       NULL,
        [file_size_kb]            INT               NULL,
        [created_at]              DATETIME          NOT NULL
            CONSTRAINT [DF_support_release_notes_created_at] DEFAULT (GETUTCDATE()),
        [created_by]              INT               NOT NULL,
        [updated_at]              DATETIME          NULL,
        [updated_by]              INT               NULL,
        [is_deleted]              BIT               NOT NULL
            CONSTRAINT [DF_support_release_notes_is_deleted] DEFAULT ((0)),
        [deleted_at]              DATETIME          NULL,
        [deleted_by]              INT               NULL,
        CONSTRAINT [PK_support_release_notes] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_release_notes_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_release_notes_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_release_notes_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [IX_support_release_notes_list]
        ON [dbo].[support_release_notes] ([is_deleted], [release_date] DESC);
    PRINT 'CREATED: dbo.support_release_notes';
END
ELSE PRINT 'SKIP: dbo.support_release_notes already exists';
GO

/* --------------------------------------------------------------------------
   support_query_reads (per-user read tracking for sidebar unread badge)
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_query_reads' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_query_reads] (
        [id]         INT IDENTITY(1,1) NOT NULL,
        [tenant_id]  INT               NOT NULL,
        [query_id]   INT               NOT NULL,
        [user_id]    INT               NOT NULL,
        [read_at]    DATETIME          NOT NULL
            CONSTRAINT [DF_support_query_reads_read_at] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_support_query_reads] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_query_reads_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_query_reads_query]
            FOREIGN KEY ([query_id]) REFERENCES [dbo].[support_queries]([id]),
        CONSTRAINT [FK_support_query_reads_user]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
    );
    CREATE UNIQUE NONCLUSTERED INDEX [UX_support_query_reads_query_user]
        ON [dbo].[support_query_reads] ([query_id], [user_id]);
    CREATE NONCLUSTERED INDEX [IX_support_query_reads_user]
        ON [dbo].[support_query_reads] ([user_id], [read_at] DESC);
    PRINT 'CREATED: dbo.support_query_reads';
END
ELSE PRINT 'SKIP: dbo.support_query_reads already exists';
GO

PRINT '---- VERIFY: support tables ----';
SELECT t.name AS table_name, t.create_date
FROM sys.tables t
WHERE t.name IN (
    N'support_queries',
    N'support_query_messages',
    N'support_release_notes',
    N'support_query_reads'
)
ORDER BY t.name;
GO

PRINT 'Support tables script finished.';
GO
