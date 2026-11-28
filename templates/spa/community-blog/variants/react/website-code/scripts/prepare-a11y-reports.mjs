import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteCodePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportsDirectory = path.join(websiteCodePath, "docs", "a11y-reports");
fs.mkdirSync(reportsDirectory, { recursive: true });

for (const entry of fs.readdirSync(reportsDirectory, { withFileTypes: true })) {
  if (
    entry.name === ".generated" ||
    entry.name === "accessibility-summary.json" ||
    /^automated-.+\.html$/i.test(entry.name)
  ) {
    fs.rmSync(path.join(reportsDirectory, entry.name), {
      force: true,
      recursive: entry.isDirectory()
    });
  }
}

fs.mkdirSync(path.join(reportsDirectory, ".generated"), { recursive: true });
