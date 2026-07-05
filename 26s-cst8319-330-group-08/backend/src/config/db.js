const mysql = require("mysql2/promise");
require("dotenv").config();

const requiredEnv = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required database environment variables: ${missingEnv.join(", ")}`);
}

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number.isFinite(connectionLimit) && connectionLimit > 0 ? connectionLimit : 10,
  queueLimit: 0,
});

module.exports = pool;
