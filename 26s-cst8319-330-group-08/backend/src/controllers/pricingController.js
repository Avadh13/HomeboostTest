const pool = require("../config/db");

exports.getPricingPlans = async (req, res) => {
  try {
    const [plans] = await pool.query(
      `SELECT * FROM pricing_plans
       WHERE is_active = TRUE
       ORDER BY display_order ASC, id DESC`
    );

    res.json(plans);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load pricing plans",
      error: error.message,
    });
  }
};

exports.createPricingPlan = async (req, res) => {
  try {
    const {
      title,
      price,
      description,
      features,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `INSERT INTO pricing_plans
       (title, price, description, features, button_text, button_link, display_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        price,
        description,
        features,
        button_text,
        button_link,
        display_order,
        is_active,
      ]
    );

    res.status(201).json({
      status: "success",
      message: "Pricing plan created successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create pricing plan",
      error: error.message,
    });
  }
};

exports.updatePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      price,
      description,
      features,
      button_text,
      button_link,
      display_order,
      is_active,
    } = req.body;

    await pool.query(
      `UPDATE pricing_plans
       SET title = ?,
           price = ?,
           description = ?,
           features = ?,
           button_text = ?,
           button_link = ?,
           display_order = ?,
           is_active = ?
       WHERE id = ?`,
      [
        title,
        price,
        description,
        features,
        button_text,
        button_link,
        display_order,
        is_active,
        id,
      ]
    );

    res.json({
      status: "success",
      message: "Pricing plan updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update pricing plan",
      error: error.message,
    });
  }
};

exports.deletePricingPlan = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("UPDATE pricing_plans SET is_active = FALSE WHERE id = ?", [
      id,
    ]);

    res.json({
      status: "success",
      message: "Pricing plan deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete pricing plan",
      error: error.message,
    });
  }
};