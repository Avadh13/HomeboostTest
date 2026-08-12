const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");

const backendRoot = join(__dirname, "..");
const testsDir = join(backendRoot, "tests");
const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".integration.js"))
  .sort()
  .map((name) => join(testsDir, name));

const escapeAnnotation = (value) => String(value || "")
  .replace(/%/g, "%25")
  .replace(/\r/g, "%0D")
  .replace(/\n/g, "%0A");

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  cwd: backendRoot,
  env: process.env,
  encoding: "utf8",
});

if (result.error) throw result.error;
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if ((result.status ?? 1) !== 0) {
  const diagnostic = `${result.stdout || ""}\n${result.stderr || ""}`.slice(-3500);
  console.log(`::error title=Disposable MySQL security tests failed::${escapeAnnotation(diagnostic)}`);
}

process.exitCode = result.status ?? 1;
