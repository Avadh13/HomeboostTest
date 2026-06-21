const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function createAdminUser() {
  try {
    const fullName = "Super Admin";
    const email = "admin@test.com";
    const plainPassword = "admin123";
    const role = "super_admin";

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const [existingUser] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      await pool.query(
        `UPDATE users 
         SET full_name = ?, password = ?, role = ?, is_active = 1
         WHERE email = ?`,
        [fullName, hashedPassword, role, email]
      );

      console.log("Admin user already existed. Updated successfully.");
    } else {
      await pool.query(
        `INSERT INTO users 
         (full_name, email, password, role, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [fullName, email, hashedPassword, role]
      );

      console.log("Admin user created successfully.");
    }

    console.log("Email: admin@test.com");
    console.log("Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error("Failed to create admin user:", error.message);
    process.exit(1);
  }
}

createAdminUser();