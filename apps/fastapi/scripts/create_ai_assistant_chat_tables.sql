-- AI Navigation Assistant chat history (per-user sessions + messages)
-- Target: MS SQL Server (erpdb). Run once in SSMS.

USE [erpdb];
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ai_assistant_sessions' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ai_assistant_sessions] (
        [id]                  INT IDENTITY(1,1) NOT NULL,
        [user_id]             INT               NOT NULL,
        [tenant_id]           INT               NULL,
        [title]               NVARCHAR(200)     NOT NULL
                              CONSTRAINT [DF_ai_assistant_sessions_title] DEFAULT (N'Navigation Assistant'),
        [is_active]           BIT               NOT NULL
                              CONSTRAINT [DF_ai_assistant_sessions_is_active] DEFAULT (1),
        [last_message_at]     DATETIME2(7)      NULL,
        [message_count]       INT               NOT NULL
                              CONSTRAINT [DF_ai_assistant_sessions_message_count] DEFAULT (0),
        [impersonated_by]     INT               NULL,
        [created_at]          DATETIME2(7)      NOT NULL
                              CONSTRAINT [DF_ai_assistant_sessions_created_at] DEFAULT (SYSUTCDATETIME()),
        [created_by]          INT               NULL,
        [updated_at]          DATETIME2(7)      NULL,
        [updated_by]          INT               NULL,
        [is_deleted]          BIT               NOT NULL
                              CONSTRAINT [DF_ai_assistant_sessions_is_deleted] DEFAULT (0),
        [deleted_at]          DATETIME2(7)      NULL,
        [deleted_by]          INT               NULL,
        CONSTRAINT [PK_ai_assistant_sessions] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_ai_assistant_sessions_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_ai_assistant_sessions_tenant] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_ai_assistant_sessions_impersonated_by] FOREIGN KEY ([impersonated_by]) REFERENCES [dbo].[users]([id])
    );
    CREATE NONCLUSTERED INDEX [IX_ai_assistant_sessions_user_active]
        ON [dbo].[ai_assistant_sessions] ([user_id], [is_active], [is_deleted], [last_message_at] DESC);
    CREATE UNIQUE NONCLUSTERED INDEX [UX_ai_assistant_sessions_one_active_per_user]
        ON [dbo].[ai_assistant_sessions] ([user_id])
        WHERE [is_active] = 1 AND [is_deleted] = 0;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ai_assistant_messages' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE [dbo].[ai_assistant_messages] (
        [id]                      BIGINT IDENTITY(1,1) NOT NULL,
        [session_id]              INT                  NOT NULL,
        [user_id]                 INT                  NOT NULL,
        [tenant_id]               INT                  NULL,
        [role]                    NVARCHAR(20)         NOT NULL,
        [message_text]            NVARCHAR(MAX)        NOT NULL,
        [is_error]                BIT                  NOT NULL
                                  CONSTRAINT [DF_ai_assistant_messages_is_error] DEFAULT (0),
        [input_source]            NVARCHAR(30)         NULL,
        [client_message_id]       NVARCHAR(64)         NULL,
        [action]                  NVARCHAR(20)         NULL,
        [menu_id]                 INT                  NULL,
        [menu_name]               NVARCHAR(200)        NULL,
        [parent_menu_id]          INT                  NULL,
        [parent_menu_name]        NVARCHAR(200)        NULL,
        [route]                   NVARCHAR(500)        NULL,
        [error_type]              NVARCHAR(50)         NULL,
        [error_message]           NVARCHAR(1000)       NULL,
        [interpret_response_json] NVARCHAR(MAX)        NULL,
        [llm_provider]            NVARCHAR(50)         NULL,
        [tokens_prompt]           INT                  NULL,
        [tokens_completion]       INT                  NULL,
        [tokens_total]            INT                  NULL,
        [created_at]              DATETIME2(7)         NOT NULL
                                  CONSTRAINT [DF_ai_assistant_messages_created_at] DEFAULT (SYSUTCDATETIME()),
        [created_by]              INT                  NULL,
        [is_deleted]              BIT                  NOT NULL
                                  CONSTRAINT [DF_ai_assistant_messages_is_deleted] DEFAULT (0),
        [deleted_at]              DATETIME2(7)         NULL,
        [deleted_by]              INT                  NULL,
        CONSTRAINT [PK_ai_assistant_messages] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_ai_assistant_messages_session]
            FOREIGN KEY ([session_id]) REFERENCES [dbo].[ai_assistant_sessions]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ai_assistant_messages_user] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_ai_assistant_messages_tenant] FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [CK_ai_assistant_messages_role] CHECK ([role] IN (N'user', N'assistant', N'system'))
    );
    CREATE NONCLUSTERED INDEX [IX_ai_assistant_messages_session_created]
        ON [dbo].[ai_assistant_messages] ([session_id], [created_at] ASC);
    CREATE NONCLUSTERED INDEX [IX_ai_assistant_messages_user_created]
        ON [dbo].[ai_assistant_messages] ([user_id], [created_at] DESC);
    CREATE UNIQUE NONCLUSTERED INDEX [UX_ai_assistant_messages_client_id]
        ON [dbo].[ai_assistant_messages] ([session_id], [client_message_id])
        WHERE [client_message_id] IS NOT NULL AND [is_deleted] = 0;
END
GO
