-- Support module tables (FAQs + product updates)
-- Target: MS SQL Server (erpdb). Idempotent — safe to re-run.
-- Do NOT use Alembic for this change; apply via SSMS / sqlcmd.

USE [erpdb];
GO

/* --------------------------------------------------------------------------
   support_faqs
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_faqs' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_faqs] (
        [id]            INT IDENTITY(1,1) NOT NULL,
        [tenant_id]     INT               NOT NULL,
        [title]         VARCHAR(255)      NOT NULL,
        [question]      VARCHAR(1000)     NOT NULL,
        [answer]        VARCHAR(MAX)      NOT NULL,
        [module_name]   VARCHAR(100)      NOT NULL,
        [category_id]   VARCHAR(100)      NOT NULL,
        [category_path] VARCHAR(255)      NOT NULL,
        [status]        VARCHAR(20)       NOT NULL,
        [owner]         VARCHAR(100)      NOT NULL,
        [language]      VARCHAR(20)       NOT NULL,
        [created_at]    DATETIME          NOT NULL
            CONSTRAINT [DF_support_faqs_created_at] DEFAULT (GETUTCDATE()),
        [created_by]    INT               NOT NULL,
        [updated_at]    DATETIME          NULL,
        [updated_by]    INT               NULL,
        [is_deleted]    BIT               NOT NULL
            CONSTRAINT [DF_support_faqs_is_deleted] DEFAULT ((0)),
        [deleted_at]    DATETIME          NULL,
        [deleted_by]    INT               NULL,
        CONSTRAINT [PK_support_faqs] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_faqs_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_faqs_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_faqs_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_faqs_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [ix_support_faqs_id] ON [dbo].[support_faqs] ([id]);
    CREATE NONCLUSTERED INDEX [IX_support_faqs_tenant_deleted]
        ON [dbo].[support_faqs] ([tenant_id], [is_deleted], [updated_at] DESC);
    PRINT 'CREATED: dbo.support_faqs';
END
ELSE PRINT 'SKIP: dbo.support_faqs already exists';
GO

/* --------------------------------------------------------------------------
   support_faq_attachments
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_faq_attachments' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_faq_attachments] (
        [id]            INT IDENTITY(1,1) NOT NULL,
        [tenant_id]     INT               NOT NULL,
        [faq_id]        INT               NOT NULL,
        [file_name]     VARCHAR(255)      NOT NULL,
        [file_path]     VARCHAR(500)      NOT NULL,
        [file_type]     VARCHAR(50)       NOT NULL,
        [file_size_kb]  INT               NULL,
        [uploaded_at]   DATETIME          NOT NULL
            CONSTRAINT [DF_support_faq_attachments_uploaded_at] DEFAULT (GETUTCDATE()),
        [uploaded_by]   INT               NULL,
        [is_deleted]    BIT               NOT NULL
            CONSTRAINT [DF_support_faq_attachments_is_deleted] DEFAULT ((0)),
        [deleted_at]    DATETIME          NULL,
        [deleted_by]    INT               NULL,
        CONSTRAINT [PK_support_faq_attachments] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_faq_attachments_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_faq_attachments_faq]
            FOREIGN KEY ([faq_id]) REFERENCES [dbo].[support_faqs]([id]),
        CONSTRAINT [FK_support_faq_attachments_uploaded_by]
            FOREIGN KEY ([uploaded_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_faq_attachments_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [ix_support_faq_attachments_id]
        ON [dbo].[support_faq_attachments] ([id]);
    CREATE NONCLUSTERED INDEX [IX_support_faq_attachments_faq]
        ON [dbo].[support_faq_attachments] ([faq_id], [is_deleted]);
    PRINT 'CREATED: dbo.support_faq_attachments';
END
ELSE PRINT 'SKIP: dbo.support_faq_attachments already exists';
GO

/* --------------------------------------------------------------------------
   support_faq_feedback
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_faq_feedback' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_faq_feedback] (
        [id]         INT IDENTITY(1,1) NOT NULL,
        [faq_id]     INT               NOT NULL,
        [tenant_id]  INT               NOT NULL,
        [user_id]    INT               NOT NULL,
        [is_helpful] BIT               NOT NULL,
        [comment]    VARCHAR(2000)     NULL,
        [created_at] DATETIME          NOT NULL
            CONSTRAINT [DF_support_faq_feedback_created_at] DEFAULT (GETUTCDATE()),
        CONSTRAINT [PK_support_faq_feedback] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_faq_feedback_faq]
            FOREIGN KEY ([faq_id]) REFERENCES [dbo].[support_faqs]([id]),
        CONSTRAINT [FK_support_faq_feedback_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_support_faq_feedback_user]
            FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [ix_support_faq_feedback_id]
        ON [dbo].[support_faq_feedback] ([id]);
    CREATE NONCLUSTERED INDEX [IX_support_faq_feedback_faq]
        ON [dbo].[support_faq_feedback] ([faq_id], [tenant_id]);
    PRINT 'CREATED: dbo.support_faq_feedback';
END
ELSE PRINT 'SKIP: dbo.support_faq_feedback already exists';
GO

/* --------------------------------------------------------------------------
   support_product_updates (global — no tenant_id)
   -------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'support_product_updates' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[support_product_updates] (
        [id]           INT IDENTITY(1,1) NOT NULL,
        [title]        VARCHAR(255)      NOT NULL,
        [version]      VARCHAR(50)       NOT NULL,
        [release_date] DATE              NOT NULL,
        [description]  VARCHAR(MAX)      NOT NULL,
        [status]       VARCHAR(20)       NOT NULL,
        [file_name]    VARCHAR(255)      NULL,
        [file_path]    VARCHAR(500)      NULL,
        [file_type]    VARCHAR(20)       NULL,
        [file_size_kb] INT               NULL,
        [created_at]   DATETIME          NOT NULL
            CONSTRAINT [DF_support_product_updates_created_at] DEFAULT (GETUTCDATE()),
        [created_by]   INT               NOT NULL,
        [updated_at]   DATETIME          NULL,
        [updated_by]   INT               NULL,
        [is_deleted]   BIT               NOT NULL
            CONSTRAINT [DF_support_product_updates_is_deleted] DEFAULT ((0)),
        [deleted_at]   DATETIME          NULL,
        [deleted_by]   INT               NULL,
        CONSTRAINT [PK_support_product_updates] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_support_product_updates_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_product_updates_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_support_product_updates_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [ix_support_product_updates_id]
        ON [dbo].[support_product_updates] ([id]);
    CREATE NONCLUSTERED INDEX [IX_support_product_updates_release]
        ON [dbo].[support_product_updates] ([is_deleted], [release_date] DESC);
    PRINT 'CREATED: dbo.support_product_updates';
END
ELSE PRINT 'SKIP: dbo.support_product_updates already exists';
GO

PRINT '---- VERIFY: support tables ----';
SELECT t.name AS table_name, t.create_date
FROM sys.tables t
WHERE t.name IN (
    N'support_faqs',
    N'support_faq_attachments',
    N'support_faq_feedback',
    N'support_product_updates'
)
ORDER BY t.name;
GO

PRINT 'Support tables script finished.';
GO
