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

const failureExcerpt = (output) => {
  const lines = String(output || "").split(/\r?\n/);
  const failedIndex = lines.findIndex((line) => /^not ok\b/.test(line.trim()));
  if (failedIndex < 0) return lines.slice(-50).join("\n");
  return lines.slice(Math.max(0, failedIndex - 4), Math.min(lines.length, failedIndex + 32)).join("\n");
};

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: backendRoot,
  env,
  encoding: "utf8",
});

if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if ((result.status ?? 1) !== 0) {
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  console.log(`::error title=Backend tests failed::${escapeAnnotation(failureExcerpt(output))}`);
}

process.exitCode = result.status ?? 1;
