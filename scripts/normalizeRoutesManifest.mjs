import fs from "fs";
import path from "path";

const distDir = path.join(process.cwd(), ".next");
const manifestPath = path.join(distDir, "routes-manifest.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

if (!fs.existsSync(manifestPath)) {
  process.exit(0);
}

const manifest = readJson(manifestPath);

let changed = false;

if (!Array.isArray(manifest.staticRoutes)) {
  manifest.staticRoutes = [];
  changed = true;
}

if (!Array.isArray(manifest.dynamicRoutes)) {
  manifest.dynamicRoutes = [];
  changed = true;
}

if (!Array.isArray(manifest.dataRoutes)) {
  manifest.dataRoutes = [];
  changed = true;
}

if (changed) {
  writeJson(manifestPath, manifest);
  console.log("Normalized .next/routes-manifest.json");
}
