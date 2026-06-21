const pool = require("../config/db");

exports.getFAQs = async (req, res) => {
  try {
    const [faqs] = await pool.query(
      `SELECT * FROM faqs
       WHERE is_active = TRUE
       ORDER BY display_order ASC, id DESC`
    );

    res.json(faqs);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load FAQs",
      error: error.message,
    });
  }
};

exports.createFAQ = async (req, res) => {
  try {
    const { question, answer, page_slug, display_order, is_active } = req.body;

    await pool.query(
      `INSERT INTO faqs
       (question, answer, page_slug, display_order, is_active)
       VALUES (?, ?, ?, ?, ?)`,
      [question, answer, page_slug, display_order, is_active]
    );

    res.status(201).json({
      status: "success",
      message: "FAQ created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create FAQ",
      error: error.message,
    });
  }
};

exports.updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, page_slug, display_order, is_active } = req.body;

    await pool.query(
      `UPDATE faqs
       SET question = ?,
           answer = ?,
           page_slug = ?,
           display_order = ?,
           is_active = ?
       WHERE id = ?`,
      [question, answer, page_slug, display_order, is_active, id]
    );

    res.json({
      status: "success",
      message: "FAQ updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update FAQ",
      error: error.message,
    });
  }
};

exports.deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE faqs SET is_active = FALSE WHERE id = ?", [id]);

    res.json({
      status: "success",
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete FAQ",
      error: error.message,
    });
  }
};