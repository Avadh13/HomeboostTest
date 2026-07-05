const mysql = require("mysql2/promise");
require("dotenv").config();

const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);
const sharedPoolOptions = {
  waitForConnections: true,
  connectionLimit: Number.isFinite(connectionLimit) && connectionLimit > 0 ? connectionLimit : 10,
  queueLimit: 0,
};

const decode = (value = "") => decodeURIComponent(value || "");

const parseDatabaseUrl = (databaseUrl) => {
  try {
    const parsed = new URL(databaseUrl);
    const database = parsed.pathname.replace(/^\//, "");

    if (!parsed.hostname || !parsed.username || !database) {
      throw new Error("Database URL must include host, username, and database name");
    }

    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decode(parsed.username),
      password: decode(parsed.password),
      database,
    };
  } catch (error) {
    throw new Error(`Invalid database connection URL: ${error.message}`);
  }
};

const isRailwayRuntime = Boolean(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_PROJECT_ID
);

const assertReachableHost = (host) => {
  if (String(host || "").includes(".railway.internal") && !isRailwayRuntime) {
    throw new Error(
      "DB_HOST is set to a Railway internal host. mysql.railway.internal only works inside Railway. " +
        "For Codespaces/local backend testing, use Railway's public TCP proxy host/port or set DB_URL/MYSQL_PUBLIC_URL. " +
        "For normal demo, use the Railway backend URL from the frontend instead of the Codespaces backend."
    );
  }
};

const getPoolConfig = () => {
  const databaseUrl =
    process.env.DB_URL ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    process.env.MYSQL_URL ||
    "";

  if (databaseUrl) {
    const config = parseDatabaseUrl(databaseUrl);
    assertReachableHost(config.host);
    return config;
  }

  const requiredEnv = ["DB_HOST", "DB_USER", "DB_NAME"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    throw new Error(`Missing required database environment variables: ${missingEnv.join(", ")}`);
  }

  assertReachableHost(process.env.DB_HOST);

  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
  };
};

const pool = mysql.createPool({
  ...getPoolConfig(),
  ...sharedPoolOptions,
});

module.exports = pool;
