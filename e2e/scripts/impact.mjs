#!/usr/bin/env node
/**
 * Lists the chains a change touches, using chain-map.json `files`.
 *
 *   node scripts/impact.mjs                 # diff against origin/main
 *   node scripts/impact.mjs feat/local-complete
 *   node scripts/impact.mjs --files backend/app/services/notify.py frontend/lib/nav.ts
 *
 * Prints each matched chain, whether it has a spec yet, and a --grep for Playwright
 * (or the workflow's extra_args) that runs only the built ones.
 */
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const e2eRoot = path.join(here, "..");
const map = JSON.parse(fs.readFileSync(path.join(e2eRoot, "chain-map.json"), "utf8"));

function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      re += ".*";
      i += 1;
      if (glob[i + 1] === "/") i += 1;
    } else if (c === "*") re += "[^/]*";
    else if ("\\^$+?.()|{}[]".includes(c)) re += `\\${c}`;
    else re += c;
  }
  return new RegExp(`^${re}$`);
}

function changedFiles(argv) {
  const i = argv.indexOf("--files");
  if (i >= 0) return argv.slice(i + 1);
  const base = argv[0] || "origin/main";
  const out = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: path.join(e2eRoot, ".."), encoding: "utf8" });
  return out.split(/\r?\n/).filter(Boolean);
}

const files = changedFiles(process.argv.slice(2)).map((f) => f.replace(/\\/g, "/"));
const hits = [];
for (const [id, entry] of Object.entries(map.chains)) {
  const patterns = entry.files.map(globToRegExp);
  const touched = files.filter((f) => patterns.some((p) => p.test(f)));
  if (touched.length) hits.push({ id, entry, touched });
}
const layoutPatterns = (map.layout?.files || []).map(globToRegExp);
const layoutTouched = files.some((f) => layoutPatterns.some((p) => p.test(f)));

if (!files.length) console.log("No changed files.");
console.log(`Changed files: ${files.length}`);
for (const h of hits) {
  const state = h.entry.spec ? "spec" : "no spec yet";
  const gap = h.entry.knownGap ? " · known gap" : "";
  console.log(`${h.id}  ${h.entry.type}  [${state}${gap}]  ${h.entry.title}`);
  for (const t of h.touched) console.log(`      ${t}`);
}
if (layoutTouched) console.log("Layout: UI files changed; run the layout suite.");
const runnable = hits.filter((h) => h.entry.spec).map((h) => `@${h.id}`);
if (runnable.length) console.log(`\nRun: npx playwright test --project=chains --grep "${runnable.join("|")}"`);
else console.log("\nNo built chain specs touched.");
