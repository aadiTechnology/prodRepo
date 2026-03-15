-- Development tasks table (for AI-generated dev tasks per user story)
-- Target: MS SQL Server. Alternative to: alembic upgrade head

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'development_tasks')
BEGIN
    CREATE TABLE development_tasks (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_story_id INT NOT NULL,
        task_id NVARCHAR(50) NOT NULL,
        category NVARCHAR(20) NOT NULL,
        title NVARCHAR(500) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        related_scenario NVARCHAR(500) NOT NULL,
        component NVARCHAR(200) NOT NULL,
        priority NVARCHAR(20) NOT NULL,
        estimated_effort NVARCHAR(50) NOT NULL,
        depends_on_task_id NVARCHAR(50) NULL,
        tenant_id INT NULL,
        created_at DATETIME2 NOT NULL DEFAULT (GETUTCDATE()),
        created_by INT NULL,
        CONSTRAINT fk_development_tasks_user_story FOREIGN KEY (user_story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
        CONSTRAINT fk_development_tasks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );
    CREATE INDEX ix_development_tasks_user_story_id ON development_tasks(user_story_id);
    CREATE INDEX ix_development_tasks_tenant_id ON development_tasks(tenant_id);
END
GO
