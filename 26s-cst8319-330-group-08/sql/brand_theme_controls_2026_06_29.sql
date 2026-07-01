USE railway;

-- Add brand_primary_color safely
SET @has_brand_primary := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'employers'
    AND column_name = 'brand_primary_color'
);

SET @sql_brand_primary := IF(
  @has_brand_primary = 0,
  'ALTER TABLE employers ADD COLUMN brand_primary_color VARCHAR(20) DEFAULT ''#2563eb''',
  'SELECT ''brand_primary_color already exists'' AS status'
);

PREPARE stmt_brand_primary FROM @sql_brand_primary;
EXECUTE stmt_brand_primary;
DEALLOCATE PREPARE stmt_brand_primary;

-- Add brand_secondary_color safely
SET @has_brand_secondary := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'employers'
    AND column_name = 'brand_secondary_color'
);

SET @sql_brand_secondary := IF(
  @has_brand_secondary = 0,
  'ALTER TABLE employers ADD COLUMN brand_secondary_color VARCHAR(20) DEFAULT ''#eff6ff''',
  'SELECT ''brand_secondary_color already exists'' AS status'
);

PREPARE stmt_brand_secondary FROM @sql_brand_secondary;
EXECUTE stmt_brand_secondary;
DEALLOCATE PREPARE stmt_brand_secondary;

UPDATE employers
SET
  brand_primary_color = COALESCE(NULLIF(brand_primary_color, ''), '#2563eb'),
  brand_secondary_color = COALESCE(NULLIF(brand_secondary_color, ''), '#eff6ff');

SELECT
  id,
  name,
  slug,
  brand_primary_color,
  brand_secondary_color
FROM employers
ORDER BY id DESC;
