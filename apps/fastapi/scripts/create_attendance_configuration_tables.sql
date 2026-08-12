-- Attendance Configuration (General, Working Days, Holidays, Shifts, Office Timing,
-- Grace Time, Statuses, Check-in Rules, Notifications)
-- Target: MS SQL Server (erpdb). Idempotent — safe to re-run.
-- Do NOT use Alembic for this change; apply via SSMS / sqlcmd.

USE [erpdb];
GO

/* -------------------------------------------------------------------------- */
/* 1. attendance_configurations (1 row per tenant + academic year)            */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables
    WHERE name = N'attendance_configurations' AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[attendance_configurations] (
        [id]                              INT IDENTITY(1,1) NOT NULL,
        [tenant_id]                       INT               NOT NULL,
        [academic_year_id]                INT               NOT NULL,
        [configuration_scope]             VARCHAR(30)       NOT NULL
            CONSTRAINT [DF_att_cfg_configuration_scope] DEFAULT ('entire-school'),
        [allow_editing_after_marked]      BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_allow_editing_after_marked] DEFAULT ((1)),
        [apply_changes_to]                VARCHAR(30)       NOT NULL
            CONSTRAINT [DF_att_cfg_apply_changes_to] DEFAULT ('future-only'),
        [marked_by_teacher]               BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_marked_by_teacher] DEFAULT ((1)),
        [marked_by_school_admin]          BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_marked_by_school_admin] DEFAULT ((1)),
        [working_monday]                  BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_monday] DEFAULT ((1)),
        [working_tuesday]                 BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_tuesday] DEFAULT ((1)),
        [working_wednesday]               BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_wednesday] DEFAULT ((1)),
        [working_thursday]                BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_thursday] DEFAULT ((1)),
        [working_friday]                  BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_friday] DEFAULT ((1)),
        [working_saturday]                BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_saturday] DEFAULT ((0)),
        [working_sunday]                  BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_working_sunday] DEFAULT ((0)),
        [office_start_time]               VARCHAR(5)        NOT NULL
            CONSTRAINT [DF_att_cfg_office_start_time] DEFAULT ('09:00'),
        [office_end_time]                 VARCHAR(5)        NOT NULL
            CONSTRAINT [DF_att_cfg_office_end_time] DEFAULT ('17:00'),
        [minimum_working_hours]           INT               NOT NULL
            CONSTRAINT [DF_att_cfg_minimum_working_hours] DEFAULT ((6)),
        [grace_enabled]                   BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_grace_enabled] DEFAULT ((1)),
        [grace_minutes]                   INT               NOT NULL
            CONSTRAINT [DF_att_cfg_grace_minutes] DEFAULT ((15)),
        [status_after_grace]              VARCHAR(30)       NOT NULL
            CONSTRAINT [DF_att_cfg_status_after_grace] DEFAULT ('Late'),
        [check_in_mandatory]              BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_check_in_mandatory] DEFAULT ((1)),
        [check_out_mandatory]             BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_check_out_mandatory] DEFAULT ((1)),
        [allow_attendance_without_check_out] BIT            NOT NULL
            CONSTRAINT [DF_att_cfg_allow_without_checkout] DEFAULT ((0)),
        [allow_multiple_check_in]         BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_allow_multiple_check_in] DEFAULT ((0)),
        [allow_next_day_check_out]        BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_allow_next_day_check_out] DEFAULT ((0)),
        [auto_calculate_working_hours]    BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_auto_calc_working_hours] DEFAULT ((1)),
        [created_at]                      DATETIME          NOT NULL
            CONSTRAINT [DF_att_cfg_created_at] DEFAULT (GETUTCDATE()),
        [created_by]                      INT               NULL,
        [updated_at]                      DATETIME          NULL,
        [updated_by]                      INT               NULL,
        [is_deleted]                      BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_is_deleted] DEFAULT ((0)),
        [deleted_at]                      DATETIME          NULL,
        [deleted_by]                      INT               NULL,
        CONSTRAINT [PK_attendance_configurations] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_att_cfg_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_att_cfg_academic_year]
            FOREIGN KEY ([academic_year_id]) REFERENCES [dbo].[academic_years]([id]),
        CONSTRAINT [FK_att_cfg_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [UQ_att_cfg_tenant_academic_year]
            UNIQUE ([tenant_id], [academic_year_id])
    );

    CREATE NONCLUSTERED INDEX [IX_att_cfg_tenant_year]
        ON [dbo].[attendance_configurations] ([tenant_id], [academic_year_id], [is_deleted]);

    PRINT 'CREATED: dbo.attendance_configurations';
END
ELSE PRINT 'SKIP: dbo.attendance_configurations already exists';
GO

/* -------------------------------------------------------------------------- */
/* 2. attendance_config_holidays                                              */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables
    WHERE name = N'attendance_config_holidays' AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[attendance_config_holidays] (
        [id]                    INT IDENTITY(1,1) NOT NULL,
        [tenant_id]             INT               NOT NULL,
        [configuration_id]      INT               NOT NULL,
        [name]                  NVARCHAR(150)     NOT NULL,
        [holiday_date]          DATE              NOT NULL,
        [description]           NVARCHAR(500)     NULL,
        [status]                VARCHAR(20)       NOT NULL
            CONSTRAINT [DF_att_cfg_hol_status] DEFAULT ('active'),
        [created_at]            DATETIME          NOT NULL
            CONSTRAINT [DF_att_cfg_hol_created_at] DEFAULT (GETUTCDATE()),
        [created_by]            INT               NULL,
        [updated_at]            DATETIME          NULL,
        [updated_by]            INT               NULL,
        [is_deleted]            BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_hol_is_deleted] DEFAULT ((0)),
        [deleted_at]            DATETIME          NULL,
        [deleted_by]            INT               NULL,
        CONSTRAINT [PK_attendance_config_holidays] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_att_cfg_hol_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_att_cfg_hol_configuration]
            FOREIGN KEY ([configuration_id]) REFERENCES [dbo].[attendance_configurations]([id]),
        CONSTRAINT [FK_att_cfg_hol_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_hol_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_hol_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );

    CREATE NONCLUSTERED INDEX [IX_att_cfg_hol_config]
        ON [dbo].[attendance_config_holidays] ([configuration_id], [is_deleted]);

    PRINT 'CREATED: dbo.attendance_config_holidays';
END
ELSE PRINT 'SKIP: dbo.attendance_config_holidays already exists';
GO

/* -------------------------------------------------------------------------- */
/* 3. attendance_config_shifts                                                */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables
    WHERE name = N'attendance_config_shifts' AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[attendance_config_shifts] (
        [id]                    INT IDENTITY(1,1) NOT NULL,
        [tenant_id]             INT               NOT NULL,
        [configuration_id]      INT               NOT NULL,
        [name]                  NVARCHAR(100)     NOT NULL,
        [start_time]            VARCHAR(5)        NOT NULL,
        [end_time]              VARCHAR(5)        NOT NULL,
        [status]                VARCHAR(20)       NOT NULL
            CONSTRAINT [DF_att_cfg_shift_status] DEFAULT ('active'),
        [created_at]            DATETIME          NOT NULL
            CONSTRAINT [DF_att_cfg_shift_created_at] DEFAULT (GETUTCDATE()),
        [created_by]            INT               NULL,
        [updated_at]            DATETIME          NULL,
        [updated_by]            INT               NULL,
        [is_deleted]            BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_shift_is_deleted] DEFAULT ((0)),
        [deleted_at]            DATETIME          NULL,
        [deleted_by]            INT               NULL,
        CONSTRAINT [PK_attendance_config_shifts] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_att_cfg_shift_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_att_cfg_shift_configuration]
            FOREIGN KEY ([configuration_id]) REFERENCES [dbo].[attendance_configurations]([id]),
        CONSTRAINT [FK_att_cfg_shift_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_shift_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_shift_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );

    CREATE NONCLUSTERED INDEX [IX_att_cfg_shift_config]
        ON [dbo].[attendance_config_shifts] ([configuration_id], [is_deleted]);

    PRINT 'CREATED: dbo.attendance_config_shifts';
END
ELSE PRINT 'SKIP: dbo.attendance_config_shifts already exists';
GO

/* -------------------------------------------------------------------------- */
/* 4. attendance_config_statuses                                              */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables
    WHERE name = N'attendance_config_statuses' AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[attendance_config_statuses] (
        [id]                    INT IDENTITY(1,1) NOT NULL,
        [tenant_id]             INT               NOT NULL,
        [configuration_id]      INT               NOT NULL,
        [name]                  NVARCHAR(50)      NOT NULL,
        [color]                 VARCHAR(20)       NOT NULL,
        [is_active]             BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_status_is_active] DEFAULT ((1)),
        [sort_order]            INT               NOT NULL
            CONSTRAINT [DF_att_cfg_status_sort_order] DEFAULT ((0)),
        [created_at]            DATETIME          NOT NULL
            CONSTRAINT [DF_att_cfg_status_created_at] DEFAULT (GETUTCDATE()),
        [created_by]            INT               NULL,
        [updated_at]            DATETIME          NULL,
        [updated_by]            INT               NULL,
        [is_deleted]            BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_status_is_deleted] DEFAULT ((0)),
        [deleted_at]            DATETIME          NULL,
        [deleted_by]            INT               NULL,
        CONSTRAINT [PK_attendance_config_statuses] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_att_cfg_status_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_att_cfg_status_configuration]
            FOREIGN KEY ([configuration_id]) REFERENCES [dbo].[attendance_configurations]([id]),
        CONSTRAINT [FK_att_cfg_status_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_status_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_status_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );

    CREATE NONCLUSTERED INDEX [IX_att_cfg_status_config]
        ON [dbo].[attendance_config_statuses] ([configuration_id], [is_deleted], [sort_order]);

    PRINT 'CREATED: dbo.attendance_config_statuses';
END
ELSE PRINT 'SKIP: dbo.attendance_config_statuses already exists';
GO

/* -------------------------------------------------------------------------- */
/* 5. attendance_config_notifications                                         */
/* -------------------------------------------------------------------------- */
IF NOT EXISTS (
    SELECT 1 FROM sys.tables
    WHERE name = N'attendance_config_notifications' AND schema_id = SCHEMA_ID(N'dbo')
)
BEGIN
    CREATE TABLE [dbo].[attendance_config_notifications] (
        [id]                    INT IDENTITY(1,1) NOT NULL,
        [tenant_id]             INT               NOT NULL,
        [configuration_id]      INT               NOT NULL,
        [label]                 NVARCHAR(150)     NOT NULL,
        [recipients]            VARCHAR(100)      NOT NULL,
        [triggers]              VARCHAR(100)      NOT NULL,
        [channels]              VARCHAR(50)       NOT NULL,
        [is_enabled]            BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_notif_is_enabled] DEFAULT ((1)),
        [created_at]            DATETIME          NOT NULL
            CONSTRAINT [DF_att_cfg_notif_created_at] DEFAULT (GETUTCDATE()),
        [created_by]            INT               NULL,
        [updated_at]            DATETIME          NULL,
        [updated_by]            INT               NULL,
        [is_deleted]            BIT               NOT NULL
            CONSTRAINT [DF_att_cfg_notif_is_deleted] DEFAULT ((0)),
        [deleted_at]            DATETIME          NULL,
        [deleted_by]            INT               NULL,
        CONSTRAINT [PK_attendance_config_notifications] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_att_cfg_notif_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_att_cfg_notif_configuration]
            FOREIGN KEY ([configuration_id]) REFERENCES [dbo].[attendance_configurations]([id]),
        CONSTRAINT [FK_att_cfg_notif_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_notif_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_att_cfg_notif_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id])
    );

    CREATE NONCLUSTERED INDEX [IX_att_cfg_notif_config]
        ON [dbo].[attendance_config_notifications] ([configuration_id], [is_deleted]);

    PRINT 'CREATED: dbo.attendance_config_notifications';
END
ELSE PRINT 'SKIP: dbo.attendance_config_notifications already exists';
GO

PRINT '---- VERIFY ----';
SELECT name FROM sys.tables
WHERE name IN (
    N'attendance_configurations',
    N'attendance_config_holidays',
    N'attendance_config_shifts',
    N'attendance_config_statuses',
    N'attendance_config_notifications'
)
ORDER BY name;
GO
