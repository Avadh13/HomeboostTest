USE railway;

-- =========================================================
-- HomeBoost mortgage brand update - 2026-06-30
-- Updates existing footer settings to the mortgage/home-buying positioning.
-- Safe to run after footer_builder_2026_06_30.sql.
-- =========================================================

UPDATE footer_settings
SET
  brand_name = 'HomeBoost Mortgage Benefit',
  tagline = 'Mortgage & home buying benefit platform.',
  description = 'Modern employer portals, advisor communication, mortgage service intake, resources, appointments, and guided home-buying support in one place.',
  cta_text = 'Start Mortgage Request',
  cta_link = '/login',
  newsletter_title = 'Need mortgage guidance?',
  newsletter_text = 'Choose a service, share your details, and connect with the right advisor through HomeBoost.'
WHERE id = 1;

INSERT INTO footer_links (label, href, column_key, display_order, is_active, opens_new_tab)
SELECT 'Mortgage Services', '/', 'left', 2, 1, 0
WHERE NOT EXISTS (SELECT 1 FROM footer_links WHERE label = 'Mortgage Services');

SELECT * FROM footer_settings WHERE id = 1;
SELECT * FROM footer_links ORDER BY column_key, display_order;
