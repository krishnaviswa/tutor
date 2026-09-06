import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const catalog = JSON.parse(fs.readFileSync(path.join(root, "catalog/screens.json"), "utf8"));
const appDir = path.join(__dirname, "../app");
const missing = [];
for (const screen of catalog) {
  const rel = screen.route.replace(/^\//, "") + "/page.tsx";
  const file = path.join(appDir, rel);
  if (!fs.existsSync(file)) missing.push(screen.route);
}
if (missing.length) {
  console.error("Missing catalog routes:", missing.join(", "));
  process.exit(1);
}
if (catalog.length !== 47) {
  console.error("Expected 47 screens, got", catalog.length);
  process.exit(1);
}
console.log("47 catalog routes present");
