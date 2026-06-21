const pool = require("../config/db");

exports.getResources = async (req, res) => {
  try {
    const [resources] = await pool.query(
      `SELECT * FROM resources
       WHERE is_active = 1
       ORDER BY display_order ASC, id DESC`
    );
    res.json(resources);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resources", error: error.message });
  }
};

exports.createResource = async (req, res) => {
  try {
    const { title, description, category, resource_type, resource_url, image_url, display_order, is_active } = req.body;
    await pool.query(
      `INSERT INTO resources (title, description, category, resource_type, resource_url, image_url, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description, category, resource_type, resource_url, image_url, display_order || 0, is_active ?? 1]
    );
    res.status(201).json({ status: "success", message: "Resource created successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to create resource", error: error.message });
  }
};

exports.updateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, resource_type, resource_url, image_url, display_order, is_active } = req.body;
    await pool.query(
      `UPDATE resources SET title = ?, description = ?, category = ?, resource_type = ?, resource_url = ?, image_url = ?, display_order = ?, is_active = ? WHERE id = ?`,
      [title, description, category, resource_type, resource_url, image_url, display_order || 0, is_active ?? 1, id]
    );
    res.json({ status: "success", message: "Resource updated successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to update resource", error: error.message });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("UPDATE resources SET is_active = 0 WHERE id = ?", [id]);
    res.json({ status: "success", message: "Resource deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to delete resource", error: error.message });
  }
};

exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;
    const [resources] = await pool.query(`SELECT * FROM resources WHERE id = ? AND is_active = 1`, [id]);
    if (resources.length === 0) return res.status(404).json({ status: "error", message: "Resource not found" });
    res.json(resources[0]);
  } catch (error) {
    res.status(500).json({ status: "error", message: "Failed to load resource", error: error.message });
  }
};
