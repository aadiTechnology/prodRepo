-- Add Fee Due reminder / day columns to tenant_notification_schedule_config.
-- Target: MS SQL Server (erpdb). Run once in SSMS after create_tenant_notification_schedule_config.sql.
-- Safe to re-run: every column / constraint is added only when missing.
-- NOTE: CHECK constraint is in a separate batch (after GO) so SQL Server can see new columns.

USE [erpdb];
GO

IF EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = N'tenant_notification_schedule_config'
      AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    IF COL_LENGTH(N'dbo.tenant_notification_schedule_config', N'fee_reminder_enabled') IS NULL
    BEGIN
        ALTER TABLE [dbo].[tenant_notification_schedule_config]
            ADD [fee_reminder_enabled] BIT NOT NULL
                CONSTRAINT [DF_tns_config_fee_reminder_enabled] DEFAULT (1);
    END

    IF COL_LENGTH(N'dbo.tenant_notification_schedule_config', N'fee_reminder_days_before') IS NULL
    BEGIN
        ALTER TABLE [dbo].[tenant_notification_schedule_config]
            ADD [fee_reminder_days_before] INT NOT NULL
                CONSTRAINT [DF_tns_config_fee_reminder_days] DEFAULT (1);
    END

    IF COL_LENGTH(N'dbo.tenant_notification_schedule_config', N'fee_day_enabled') IS NULL
    BEGIN
        ALTER TABLE [dbo].[tenant_notification_schedule_config]
            ADD [fee_day_enabled] BIT NOT NULL
                CONSTRAINT [DF_tns_config_fee_day_enabled] DEFAULT (1);
    END

    IF COL_LENGTH(N'dbo.tenant_notification_schedule_config', N'fee_push_enabled') IS NULL
    BEGIN
        ALTER TABLE [dbo].[tenant_notification_schedule_config]
            ADD [fee_push_enabled] BIT NOT NULL
                CONSTRAINT [DF_tns_config_fee_push_enabled] DEFAULT (1);
    END
END
GO

-- Separate batch: column must exist before CHECK is compiled
IF EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = N'tenant_notification_schedule_config'
      AND schema_id = SCHEMA_ID(N'dbo')
)
AND COL_LENGTH(N'dbo.tenant_notification_schedule_config', N'fee_reminder_days_before') IS NOT NULL
AND NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_tns_config_fee_days_before'
      AND parent_object_id = OBJECT_ID(N'dbo.tenant_notification_schedule_config')
)
BEGIN
    ALTER TABLE [dbo].[tenant_notification_schedule_config]
        ADD CONSTRAINT [CK_tns_config_fee_days_before]
            CHECK ([fee_reminder_days_before] BETWEEN 0 AND 30);
END
GO
