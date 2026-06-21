const pool = require("../config/db");

exports.getPages = async (req, res) => {
  try {
    const [pages] = await pool.query(
      `SELECT * FROM pages
       ORDER BY id ASC`
    );

    res.json(pages);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load pages",
      error: error.message,
    });
  }
};
exports.updatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active } = req.body;

    await pool.query(
      `UPDATE pages
       SET title = ?,
           description = ?,
           is_active = ?
       WHERE id = ?`,
      [title, description, is_active, id]
    );

    res.json({
      status: "success",
      message: "Page updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update page",
      error: error.message,
    });
  }
};
exports.getPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [pages] = await pool.query(
      `SELECT * FROM pages
       WHERE slug = ? AND is_active = TRUE`,
      [slug]
    );

    if (pages.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Page not found",
      });
    }

    const page = pages[0];

    const [sections] = await pool.query(
      `SELECT * FROM page_sections
       WHERE page_id = ? AND is_active = TRUE
       ORDER BY display_order ASC`,
      [page.id]
    );

    for (const section of sections) {
      const [cards] = await pool.query(
        `SELECT * FROM section_cards
         WHERE section_id = ? AND is_active = TRUE
         ORDER BY display_order ASC`,
        [section.id]
      );

      section.cards = cards;
    }

    res.json({
      ...page,
      sections,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load page",
      error: error.message,
    });
  }
};