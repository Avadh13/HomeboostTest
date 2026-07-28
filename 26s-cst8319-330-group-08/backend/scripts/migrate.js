const fs = require("fs");
const path = require("path");
const pool = require("../src/config/db");

const migrationsDir = path.join(__dirname, "..", "src", "migrations");

const loadMigrations = () => fs
  .readdirSync(migrationsDir)
  .filter((name) => /^\d+.*\.js$/.test(name))
  .sort()
  .map((name) => {
    const migration = require(path.join(migrationsDir, name));
    if (!migration?.version || typeof migration.up !== "function") {
      throw new Error(`Invalid migration module: ${name}`);
    }
    return { name, ...migration };
  });

const run = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(180) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);

    const [appliedRows] = await connection.query("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.version));

    for (const migration of loadMigrations()) {
      if (applied.has(migration.version)) {
        console.log(`Skipping ${migration.version}; already applied.`);
        continue;
      }

      console.log(`Applying ${migration.version}...`);
      await connection.beginTransaction();
      try {
        await migration.up(connection);
        await connection.query(
          "INSERT INTO schema_migrations (version, filename) VALUES (?, ?)",
          [migration.version, migration.name],
        );
        await connection.commit();
        console.log(`Applied ${migration.version}.`);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    connection.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
