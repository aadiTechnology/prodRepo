-- Allow the same discount name in different academic years (per tenant).
-- Run once on SQL Server against your ERP database.

IF NOT EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.fee_discounts')
      AND name = N'academic_year_id'
)
BEGIN
    ALTER TABLE dbo.fee_discounts ADD academic_year_id INT NULL;
END
GO

UPDATE fd
SET fd.academic_year_id = fc.academic_year_id
FROM dbo.fee_discounts AS fd
INNER JOIN dbo.fee_categories AS fc
    ON fc.tenant_id = fd.tenant_id
   AND fc.name = fd.fee_category
WHERE fd.academic_year_id IS NULL
  AND fc.academic_year_id IS NOT NULL;
GO

UPDATE fd
SET fd.academic_year_id = sc.academic_year_id
FROM dbo.fee_discounts AS fd
INNER JOIN dbo.classes AS sc
    ON sc.tenant_id = fd.tenant_id
   AND sc.name = fd.applicable_class
WHERE fd.academic_year_id IS NULL
  AND sc.academic_year_id IS NOT NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE name = N'uq_discount_name_tenant'
      AND parent_object_id = OBJECT_ID(N'dbo.fee_discounts')
)
BEGIN
    ALTER TABLE dbo.fee_discounts DROP CONSTRAINT uq_discount_name_tenant;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'uq_fee_discount_name_tenant_year'
      AND object_id = OBJECT_ID(N'dbo.fee_discounts')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX uq_fee_discount_name_tenant_year
    ON dbo.fee_discounts (tenant_id, discount_name, academic_year_id)
    WHERE academic_year_id IS NOT NULL;
END
GO
