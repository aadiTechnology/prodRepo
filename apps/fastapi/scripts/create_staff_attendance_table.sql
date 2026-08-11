-- Staff / Teacher attendance (Mark Attendance screen)
-- Target: MS SQL Server (erpdb). Idempotent — safe to re-run.
-- Do NOT use Alembic for this change; apply via SSMS / sqlcmd.

USE [erpdb];
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'staff_attendance' AND schema_id = SCHEMA_ID(N'dbo'))
BEGIN
    CREATE TABLE [dbo].[staff_attendance] (
        [id]                     INT IDENTITY(1,1) NOT NULL,
        [tenant_id]              INT               NOT NULL,
        [teacher_id]             INT               NOT NULL,
        [attendance_date]        DATE              NOT NULL,
        [status]                 VARCHAR(20)       NOT NULL,
        [check_in_time]          VARCHAR(5)        NULL,
        [check_out_time]         VARCHAR(5)        NULL,
        [remarks]                VARCHAR(50)       NULL,
        [working_hours_minutes]  INT               NULL,
        [overtime_minutes]       INT               NULL,
        [is_submitted]           BIT               NOT NULL
            CONSTRAINT [DF_staff_attendance_is_submitted] DEFAULT ((0)),
        [approval_status]        VARCHAR(30)       NOT NULL
            CONSTRAINT [DF_staff_attendance_approval_status] DEFAULT ('Waiting for Approval'),
        [rejection_reason]       VARCHAR(500)      NULL,
        [created_at]             DATETIME          NOT NULL
            CONSTRAINT [DF_staff_attendance_created_at] DEFAULT (GETUTCDATE()),
        [created_by]             INT               NULL,
        [updated_at]             DATETIME          NULL,
        [updated_by]             INT               NULL,
        [is_deleted]             BIT               NOT NULL
            CONSTRAINT [DF_staff_attendance_is_deleted] DEFAULT ((0)),
        [deleted_at]             DATETIME          NULL,
        [deleted_by]             INT               NULL,
        CONSTRAINT [PK_staff_attendance] PRIMARY KEY CLUSTERED ([id] ASC),
        CONSTRAINT [FK_staff_attendance_tenant]
            FOREIGN KEY ([tenant_id]) REFERENCES [dbo].[tenants]([id]),
        CONSTRAINT [FK_staff_attendance_teacher]
            FOREIGN KEY ([teacher_id]) REFERENCES [dbo].[teachers]([id]),
        CONSTRAINT [FK_staff_attendance_created_by]
            FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_staff_attendance_updated_by]
            FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [FK_staff_attendance_deleted_by]
            FOREIGN KEY ([deleted_by]) REFERENCES [dbo].[users]([id]),
        CONSTRAINT [UQ_staff_attendance_tenant_teacher_date]
            UNIQUE ([tenant_id], [teacher_id], [attendance_date])
    );

    CREATE NONCLUSTERED INDEX [IX_staff_attendance_tenant_date]
        ON [dbo].[staff_attendance] ([tenant_id], [attendance_date], [is_deleted]);
    CREATE NONCLUSTERED INDEX [IX_staff_attendance_teacher_date]
        ON [dbo].[staff_attendance] ([tenant_id], [teacher_id], [attendance_date], [is_deleted]);

    PRINT 'CREATED: dbo.staff_attendance';
END
ELSE PRINT 'SKIP: dbo.staff_attendance already exists';
GO

PRINT '---- VERIFY ----';
SELECT name FROM sys.tables WHERE name = N'staff_attendance';
GO
