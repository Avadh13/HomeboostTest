const pool = require("../config/db");

exports.getCards = async (req, res) => {
  try {
    const [cards] = await pool.query(
      `SELECT sc.*, ps.title AS section_title, ps.section_key
       FROM section_cards sc
       JOIN page_sections ps ON sc.section_id = ps.id
       ORDER BY sc.section_id ASC, sc.display_order ASC`
    );

    res.json(cards);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load cards",
      error: error.message,
    });
  }
};

exports.createCard = async (req, res) => {
  try {
    const {
      section_id,
      title,
      description,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `INSERT INTO section_cards
       (section_id, title, description, image_url, button_text, button_link, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        section_id,
        title,
        description,
        image_url,
        button_text,
        button_link,
        display_order,
        is_active,
      ]
    );

    res.status(201).json({
      status: "success",
      message: "Card created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create card",
      error: error.message,
    });
  }
};
exports.updateCard = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      section_id,
      title,
      description,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `UPDATE section_cards
       SET section_id = ?,
           title = ?,
           description = ?,
           image_url = ?,
           button_text = ?,
           button_link = ?,
           display_order = ?,
           is_active = ?
       WHERE id = ?`,
      [
        section_id,
        title,
        description,
        image_url,
        button_text,
        button_link,
        display_order,
        is_active,
        id,
      ]
    );

    res.json({
      status: "success",
      message: "Card updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update card",
      error: error.message,
    });
  }
};

exports.deleteCard = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE section_cards SET is_active = FALSE WHERE id = ?", [
      id,
    ]);

    res.json({
      status: "success",
      message: "Card deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete card",
      error: error.message,
    });
  }
};