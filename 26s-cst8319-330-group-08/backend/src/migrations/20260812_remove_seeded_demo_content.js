const version = "20260812_remove_seeded_demo_content";

const tableExists = async (connection, tableName) => {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
     LIMIT 1`,
    [tableName],
  );
  return rows.length > 0;
};

const up = async (connection) => {
  if (!(await tableExists(connection, "page_sections"))) return;

  // Retire only the exact media values shipped by the old Home walkthrough seed.
  // Custom client video sections are intentionally untouched.
  await connection.query(
    `UPDATE page_sections
     SET is_active = 0,
         image_url = CASE
           WHEN image_url = 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80' THEN ''
           ELSE image_url
         END,
         button_text = CASE
           WHEN button_link = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' THEN 'Watch video'
           ELSE button_text
         END,
         button_link = CASE
           WHEN button_link = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' THEN ''
           ELSE button_link
         END,
         content = CASE
           WHEN content LIKE '%short demo showing how employees enter their employer portal%'
             THEN 'Add approved Employee Benefit Program media before publishing this section.'
           ELSE content
         END
     WHERE section_key = 'video_walkthrough'
       AND (
         button_link = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
         OR image_url = 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=1400&q=80'
         OR content LIKE '%short demo showing how employees enter their employer portal%'
       )`,
  );
};

module.exports = { version, up };
