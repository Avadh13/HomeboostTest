-- HomeBoost editable Home page video walkthrough section
-- Run this once in Railway MySQL / Workbench if the home video section is missing.
-- After running, edit the section from Admin → Sections and edit bullets from Admin → Cards.

USE railway;

SET @home_page_id := (SELECT id FROM pages WHERE slug = 'home' LIMIT 1);

INSERT INTO page_sections (
  page_id,
  section_key,
  title,
  subtitle,
  content,
  image_url,
  button_text,
  button_link,
  display_order,
  is_active
)
SELECT
  @home_page_id,
  'video_walkthrough',
  'Video walkthrough',
  'Show the employee journey in seconds.',
  'Use this section for the final promo video, a Loom walkthrough, or a short demo showing how employees enter their employer portal and book next steps.',
  'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80',
  'Watch demo',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  3,
  1
WHERE @home_page_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM page_sections
    WHERE page_id = @home_page_id
      AND section_key = 'video_walkthrough'
  );

SET @video_section_id := (
  SELECT id FROM page_sections
  WHERE page_id = @home_page_id
    AND section_key = 'video_walkthrough'
  LIMIT 1
);

INSERT INTO section_cards (
  section_id,
  title,
  description,
  image_url,
  button_text,
  button_link,
  display_order,
  is_active
)
SELECT @video_section_id, 'Portal walkthrough', 'Show employees how to enter their employer portal.', '', '', '', 1, 1
WHERE @video_section_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM section_cards
    WHERE section_id = @video_section_id
      AND title = 'Portal walkthrough'
  );

INSERT INTO section_cards (
  section_id,
  title,
  description,
  image_url,
  button_text,
  button_link,
  display_order,
  is_active
)
SELECT @video_section_id, 'Advisor flow', 'Explain how employees connect with a Home Buying Team advisor.', '', '', '', 2, 1
WHERE @video_section_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM section_cards
    WHERE section_id = @video_section_id
      AND title = 'Advisor flow'
  );

INSERT INTO section_cards (
  section_id,
  title,
  description,
  image_url,
  button_text,
  button_link,
  display_order,
  is_active
)
SELECT @video_section_id, 'Resource experience', 'Highlight resources, quizzes, events, messages, and appointments.', '', '', '', 3, 1
WHERE @video_section_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM section_cards
    WHERE section_id = @video_section_id
      AND title = 'Resource experience'
  );

SELECT 'Editable home video walkthrough section ready' AS status, @home_page_id AS home_page_id, @video_section_id AS video_section_id;
