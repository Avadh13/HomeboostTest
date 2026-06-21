const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createEmployeeUser() {
  try {
    const fullName = "QA Employee";
    const email = "employee@test.com";
    const plainPassword = "employee123";
    const role = "employee";
    const partnershipId = 1;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      await pool.query(
        `UPDATE users SET full_name = ?, password = ?, role = ?, team_id = NULL, partnership_id = ?, is_active = 1 WHERE email = ?`,
        [fullName, hashedPassword, role, partnershipId, email]
      );
      console.log("Employee user updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO users (full_name, email, password, role, partnership_id, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
        [fullName, email, hashedPassword, role, partnershipId]
      );
      console.log("Employee user created successfully.");
    }

    console.log("Email: employee@test.com");
    console.log("Password: employee123");
    process.exit(0);
  } catch (error) {
    console.error("Failed to create employee user:", error.message);
    process.exit(1);
  }
}

createEmployeeUser();
