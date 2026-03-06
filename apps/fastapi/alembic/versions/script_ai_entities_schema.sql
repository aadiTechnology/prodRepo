-- AI entities schema (requirements, user_stories, test_cases)
-- No schema change from AI-models refactor; this script reflects current DB schema.
-- Target: MS SQL Server. Prefer: alembic upgrade head

-- requirements
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'requirements')
BEGIN
    CREATE TABLE requirements (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        title NVARCHAR(500) NOT NULL,
        description NVARCHAR(MAX) NOT NULL,
        tenant_id INT NULL,
        is_super_admin_accessible BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT (GETUTCDATE()),
        created_by INT NULL,
        updated_at DATETIME2 NULL,
        updated_by INT NULL,
        CONSTRAINT fk_requirements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );
    CREATE INDEX ix_requirements_tenant_id ON requirements(tenant_id);
END
GO

-- user_stories
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'user_stories')
BEGIN
    CREATE TABLE user_stories (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        requirement_id INT NOT NULL,
        title NVARCHAR(500) NOT NULL,
        prerequisite NVARCHAR(MAX) NULL,
        story NVARCHAR(MAX) NOT NULL,
        acceptance_criteria NVARCHAR(MAX) NULL,
        tenant_id INT NULL,
        is_super_admin_accessible BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT (GETUTCDATE()),
        created_by INT NULL,
        updated_at DATETIME2 NULL,
        updated_by INT NULL,
        CONSTRAINT fk_user_stories_requirement FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_stories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );
    CREATE INDEX ix_user_stories_requirement_id ON user_stories(requirement_id);
    CREATE INDEX ix_user_stories_tenant_id ON user_stories(tenant_id);
END
GO

-- test_cases
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_cases')
BEGIN
    CREATE TABLE test_cases (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_story_id INT NOT NULL,
        test_case_id NVARCHAR(100) NOT NULL,
        scenario NVARCHAR(1000) NOT NULL,
        pre_requisite NVARCHAR(MAX) NULL,
        test_data NVARCHAR(MAX) NULL,
        steps NVARCHAR(MAX) NULL,
        expected_result NVARCHAR(MAX) NOT NULL,
        tenant_id INT NULL,
        is_super_admin_accessible BIT NOT NULL DEFAULT 0,
        created_at DATETIME2 NOT NULL DEFAULT (GETUTCDATE()),
        created_by INT NULL,
        updated_at DATETIME2 NULL,
        updated_by INT NULL,
        CONSTRAINT fk_test_cases_user_story FOREIGN KEY (user_story_id) REFERENCES user_stories(id) ON DELETE CASCADE,
        CONSTRAINT fk_test_cases_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
    );
    CREATE INDEX ix_test_cases_user_story_id ON test_cases(user_story_id);
    CREATE INDEX ix_test_cases_tenant_id ON test_cases(tenant_id);
END
GO
