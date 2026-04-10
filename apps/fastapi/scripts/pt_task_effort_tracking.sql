/*
  User Task Effort Entry — schema additions for PT_* timesheet workflow.

  Run against the application database (SQL Server) before using effort APIs.

  - PT_TaskStatus: Not Started, In Progress, Closed
  - PT_Timesheets: lifecycle + cumulative effort (widens Efforts)
  - PT_TimesheetEffortLogs: incremental effort lines
*/

SET NOCOUNT ON;

/* ── Status master ─────────────────────────────────────────────────────── */
IF OBJECT_ID(N'dbo.PT_TaskStatus', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PT_TaskStatus (
        StatusId   INT          NOT NULL CONSTRAINT PK_PT_TaskStatus PRIMARY KEY,
        StatusName NVARCHAR(50) NOT NULL,
        SortOrder  INT          NOT NULL CONSTRAINT DF_PT_TaskStatus_Sort DEFAULT (0)
    );

    INSERT INTO dbo.PT_TaskStatus (StatusId, StatusName, SortOrder) VALUES
        (1, N'Not Started', 1),
        (2, N'In Progress', 2),
        (3, N'Closed', 3);
END;

/* ── Widen cumulative effort column (was NUMERIC(5,2), too small for totals) ── */
IF COL_LENGTH(N'dbo.PT_Timesheets', N'Efforts') IS NOT NULL
BEGIN
    ALTER TABLE dbo.PT_Timesheets ALTER COLUMN Efforts DECIMAL(12, 2) NULL;
END;

/* ── PT_Timesheets lifecycle columns ───────────────────────────────────── */
IF COL_LENGTH(N'dbo.PT_Timesheets', N'StatusId') IS NULL
    ALTER TABLE dbo.PT_Timesheets ADD StatusId INT NULL;

IF COL_LENGTH(N'dbo.PT_Timesheets', N'TaskStartDate') IS NULL
    ALTER TABLE dbo.PT_Timesheets ADD TaskStartDate DATE NULL;

IF COL_LENGTH(N'dbo.PT_Timesheets', N'TaskEndDate') IS NULL
    ALTER TABLE dbo.PT_Timesheets ADD TaskEndDate DATE NULL;

IF COL_LENGTH(N'dbo.PT_Timesheets', N'LastUpdated') IS NULL
    ALTER TABLE dbo.PT_Timesheets ADD LastUpdated DATETIME2(0) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_PT_Timesheets_PT_TaskStatus'
)
BEGIN
    ALTER TABLE dbo.PT_Timesheets ADD CONSTRAINT FK_PT_Timesheets_PT_TaskStatus
        FOREIGN KEY (StatusId) REFERENCES dbo.PT_TaskStatus (StatusId);
END;

/* Default existing rows to Not Started when unknown */
UPDATE dbo.PT_Timesheets
SET StatusId = 1
WHERE StatusId IS NULL;

/* ── Effort log lines ──────────────────────────────────────────────────── */
IF OBJECT_ID(N'dbo.PT_TimesheetEffortLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PT_TimesheetEffortLogs (
        LogId        INT IDENTITY(1, 1) NOT NULL,
        TimesheetId  INT                NOT NULL,
        WorkingDate  DATE               NOT NULL,
        EffortHours  DECIMAL(10, 2)     NOT NULL,
        CreatedOn    DATETIME2(0)       NOT NULL CONSTRAINT DF_PT_TEL_Created DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_PT_TimesheetEffortLogs PRIMARY KEY (LogId),
        CONSTRAINT FK_PT_TimesheetEffortLogs_PT_Timesheets
            FOREIGN KEY (TimesheetId) REFERENCES dbo.PT_Timesheets (TimesheetId)
    );

    CREATE INDEX IX_PT_TimesheetEffortLogs_TimesheetId
        ON dbo.PT_TimesheetEffortLogs (TimesheetId);
END;

PRINT N'pt_task_effort_tracking.sql completed.';
