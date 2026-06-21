const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createHBTUser() {
  try {
    const fullName = "HBT Admin";
    const email = "hbt@test.com";
    const plainPassword = "hbt123";
    const role = "hbt_admin";
    const teamId = 1;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [existingUser] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);

    if (existingUser.length > 0) {
      await pool.query(
        `UPDATE users SET full_name = ?, password = ?, role = ?, team_id = ?, partnership_id = NULL, is_active = 1 WHERE email = ?`,
        [fullName, hashedPassword, role, teamId, email]
      );
      console.log("HBT user updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO users (full_name, email, password, role, team_id, is_active) VALUES (?, ?, ?, ?, ?, 1)`,
        [fullName, email, hashedPassword, role, teamId]
      );
      console.log("HBT user created successfully.");
    }

    console.log("Email: hbt@test.com");
    console.log("Password: hbt123");
    process.exit(0);
  } catch (error) {
    console.error("Failed to create HBT user:", error.message);
    process.exit(1);
  }
}

createHBTUser();
