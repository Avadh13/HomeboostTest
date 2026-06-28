const pool = require("../config/db");

exports.getSections = async (req, res) => {
  try {
    const [sections] = await pool.query(
      `SELECT ps.*, p.title AS page_title, p.slug AS page_slug
       FROM page_sections ps
       JOIN pages p ON ps.page_id = p.id
       WHERE ps.is_active = TRUE
       ORDER BY ps.page_id ASC, ps.display_order ASC`
    );

    res.json(sections);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load sections",
      error: error.message,
    });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      subtitle,
      content,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `UPDATE page_sections
       SET title = ?,
           subtitle = ?,
           content = ?,
           image_url = ?,
           button_text = ?,
           button_link = ?,
           display_order = ?,
           is_active = ?
       WHERE id = ?`,
      [
        title,
        subtitle,
        content,
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
      message: "Section updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update section",
      error: error.message,
    });
  }
};
exports.createSection = async (req, res) => {
  try {
    const {
      page_id,
      section_key,
      title,
      subtitle,
      content,
      image_url,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `INSERT INTO page_sections
       (page_id, section_key, title, subtitle, content, image_url, button_text, button_link, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page_id,
        section_key,
        title,
        subtitle,
        content,
        image_url,
        button_text,
        button_link,
        display_order,
        is_active,
      ]
    );

    res.status(201).json({
      status: "success",
      message: "Section created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create section",
      error: error.message,
    });
  }
};

exports.deleteSection = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const { id } = req.params;

    await connection.beginTransaction();

    await connection.query("UPDATE section_cards SET is_active = FALSE WHERE section_id = ?", [id]);
    await connection.query("UPDATE page_sections SET is_active = FALSE WHERE id = ?", [id]);

    await connection.commit();

    res.json({
      status: "success",
      message: "Section deleted successfully",
    });
  } catch (error) {
    await connection.rollback();

    res.status(500).json({
      status: "error",
      message: "Failed to delete section",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};
