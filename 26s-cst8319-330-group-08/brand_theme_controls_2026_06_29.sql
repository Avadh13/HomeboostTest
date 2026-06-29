USE railway;

ALTER TABLE employers
  ADD COLUMN IF NOT EXISTS brand_primary_color VARCHAR(20) DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS brand_secondary_color VARCHAR(20) DEFAULT '#eff6ff';

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
