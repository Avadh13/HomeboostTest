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

const escapeAnnotation = (value) => String(value || "")
  .replace(/%/g, "%25")
  .replace(/\r/g, "%0D")
  .replace(/\n/g, "%0A");

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: backendRoot,
  env,
  encoding: "utf8",
});

if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if ((result.status ?? 1) !== 0) {
  const diagnostic = `${result.stdout || ""}\n${result.stderr || ""}`.slice(-3500);
  console.log(`::error title=Backend tests failed::${escapeAnnotation(diagnostic)}`);
}

process.exitCode = result.status ?? 1;
