const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.join(__dirname, "..");
const TARGET_DIRS = ["frontend/src", "scripts", "test"];
const EXTRA_FILES = ["hardhat.config.js"];

function collectFiles(dir) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(rel));
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) {
      results.push(rel);
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      throw new Error(`TypeScript files are disallowed: ${rel}`);
    }
  }
  return results;
}

async function run() {
  const files = [...EXTRA_FILES.filter((f) => fs.existsSync(path.join(ROOT, f)))];
  for (const dir of TARGET_DIRS) {
    files.push(...collectFiles(dir));
  }

  let errorCount = 0;
  for (const file of files) {
    const abs = path.join(ROOT, file);
    const code = fs.readFileSync(abs, "utf8");
    const loader = file.endsWith(".jsx") ? "jsx" : "js";
    try {
      await esbuild.transform(code, { loader, sourcefile: file });
    } catch (err) {
      errorCount++;
      console.error(`Lint error in ${file}:`, err.message);
    }
  }

  if (errorCount > 0) {
    process.exit(1);
  }
  console.log(`Validated ${files.length} pure JavaScript/JSX files with zero syntax errors.`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
