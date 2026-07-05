const { execFileSync } = require("node:child_process");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const projectRoot = join(__dirname, "..");
const sourceRoot = join(projectRoot, "src");
const extraFiles = [join(projectRoot, "scripts", "check-syntax.js")];

const collectJavaScriptFiles = (directory) => {
  const entries = readdirSync(directory);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.endsWith(".js")) {
      files.push(fullPath);
    }
  }

  return files;
};

const filesToCheck = [...collectJavaScriptFiles(sourceRoot), ...extraFiles];

for (const filePath of filesToCheck) {
  execFileSync(process.execPath, ["--check", filePath], { stdio: "inherit" });
}

console.log(`Syntax check passed for ${filesToCheck.length} JavaScript files.`);
