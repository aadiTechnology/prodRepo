-- Tenant admin configuration for Holiday/Exam scheduled reminder & day notifications.
-- Target: MS SQL Server (erpdb). Run once in SSMS.
-- Supports events only: holiday.reminder, holiday.day, exam.reminder, exam.day

USE [erpdb];
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.tables
    WHERE name = N'tenant_notification_schedule_config'
      AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[tenant_notification_schedule_config] (
        [tenant_id]                       INT            NOT NULL,
        [holiday_reminder_enabled]        BIT            NOT NULL
            CONSTRAINT [DF_tns_config_holiday_reminder_enabled] DEFAULT (1),
        [holiday_reminder_days_before]    INT            NOT NULL
            CONSTRAINT [DF_tns_config_holiday_reminder_days] DEFAULT (1),
        [holiday_day_enabled]             BIT            NOT NULL
            CONSTRAINT [DF_tns_config_holiday_day_enabled] DEFAULT (1),
        [holiday_push_enabled]            BIT            NOT NULL
            CONSTRAINT [DF_tns_config_holiday_push_enabled] DEFAULT (1),
        [exam_reminder_enabled]           BIT            NOT NULL
            CONSTRAINT [DF_tns_config_exam_reminder_enabled] DEFAULT (1),
        [exam_reminder_days_before]       INT            NOT NULL
            CONSTRAINT [DF_tns_config_exam_reminder_days] DEFAULT (1),
        [exam_day_enabled]                BIT            NOT NULL
            CONSTRAINT [DF_tns_config_exam_day_enabled] DEFAULT (1),
        [exam_push_enabled]               BIT            NOT NULL
            CONSTRAINT [DF_tns_config_exam_push_enabled] DEFAULT (1),
        [created_at]                      DATETIME2(7)   NOT NULL
            CONSTRAINT [DF_tns_config_created_at] DEFAULT (SYSUTCDATETIME()),
        [created_by]                      INT            NULL,
        [updated_at]                      DATETIME2(7)   NULL,
        [updated_by]                      INT            NULL,
        CONSTRAINT [PK_tenant_notification_schedule_config]
            PRIMARY KEY CLUSTERED ([tenant_id] ASC),
        CONSTRAINT [FK_tns_config_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [CK_tns_config_holiday_days_before]
            CHECK ([holiday_reminder_days_before] BETWEEN 0 AND 30),
        CONSTRAINT [CK_tns_config_exam_days_before]
            CHECK ([exam_reminder_days_before] BETWEEN 0 AND 30)
    );
END
GO
