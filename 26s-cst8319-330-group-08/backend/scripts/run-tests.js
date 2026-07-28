const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const backendRoot = join(__dirname, "..");
const testsDir = join(backendRoot, "tests");
const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".test.js"))
  .sort()
  .map((name) => join(testsDir, name));

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || "test",
  DB_HOST: process.env.DB_HOST || "127.0.0.1",
  DB_PORT: process.env.DB_PORT || "3306",
  DB_USER: process.env.DB_USER || "test_user",
  DB_PASSWORD: process.env.DB_PASSWORD || "test_password",
  DB_NAME: process.env.DB_NAME || "homeboost_test",
  JWT_SECRET: process.env.JWT_SECRET || "test-only-jwt-secret-not-for-production",
};

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: backendRoot,
  env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
