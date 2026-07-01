USE railway;

-- =========================================================
-- HomeBoost mortgage brand update - 2026-06-30
-- Updates existing footer and homepage CMS copy to the mortgage/home-buying positioning.
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

UPDATE page_sections ps
JOIN pages p ON ps.page_id = p.id
SET
  ps.title = 'Mortgage guidance built into the employee benefit experience.',
  ps.subtitle = 'Mortgage guidance for employees, homeowners, and families.',
  ps.content = 'HomeBoost connects employer partnerships to trusted mortgage advisors while giving employees and clients a clear path for buying, renewing, refinancing, debt consolidation, and complex mortgage situations.',
  ps.button_text = 'Start Mortgage Request',
  ps.button_link = '/login'
WHERE p.slug = 'home'
AND ps.section_key = 'hero';

UPDATE page_sections ps
JOIN pages p ON ps.page_id = p.id
SET
  ps.title = 'Mortgage resources',
  ps.subtitle = 'Education, service requests, messages, appointments, and progress in one guided portal.',
  ps.content = 'Give every employee and client a clear path to learn, ask questions, connect with advisors, and book the next conversation.'
WHERE p.slug = 'home'
AND ps.section_key = 'resources';

SELECT * FROM footer_settings WHERE id = 1;
SELECT * FROM footer_links ORDER BY column_key, display_order;
SELECT ps.section_key, ps.title, ps.subtitle, ps.button_text, ps.button_link
FROM page_sections ps
JOIN pages p ON ps.page_id = p.id
WHERE p.slug = 'home'
ORDER BY ps.display_order;
