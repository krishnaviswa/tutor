import fs from "fs";
import path from "path";
import { test, expect, CHAIN_MAP, type ChainRole } from "../../src/chains";
import { auditLayout } from "../../src/layout";

/**
 * Layout check on every page route: phone 375, tablet 768, desktop 1280.
 * Routes come from frontend/app page files (the framework's own list), minus the
 * excluded routes in chain-map.json. Each route is opened as the role its catalog bucket
 * names (admin → owner, faculty → teacher, parent → parent, student → student). Public
 * sign-in screens and pages not in the catalog are opened signed out.
 * Report-only unless LAYOUT_STRICT=1.
 */

const REPO = path.join(__dirname, "..", "..", "..");
const catalog: { id: string; route: string; role: string }[] = JSON.parse(
  fs.readFileSync(path.join(REPO, "catalog", "screens.json"), "utf8"),
);
const PUBLIC = new Set(["router", "student-login", "staff-login"]);
const BUCKET: Record<string, ChainRole> = { admin: "owner", faculty: "teacher", parent: "parent", student: "student" };

function pageRoutes(): string[] {
  const appDir = path.join(REPO, "frontend", "app");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === "page.tsx") {
        const rel = path.relative(appDir, dir).split(path.sep).join("/");
        out.push(rel ? `/${rel}` : "/");
      }
    }
  };
  walk(appDir);
  return out.sort();
}

const excluded = CHAIN_MAP.layout.excludedRoutes;
for (const route of pageRoutes().filter((r) => !(r in excluded))) {
  const screen = catalog.find((s) => s.route === route);
  const role: ChainRole | null = screen && !PUBLIC.has(screen.id) ? BUCKET[screen.role] ?? null : null;
  const label = screen ? screen.id : route;
  test(`layout ${label} (${route}) as ${role ?? "signed out"}`, { tag: ["@layout"] }, async ({ asRole, anonymous, tracker }, testInfo) => {
    const page = role ? await asRole(role) : await anonymous();
    const res = await page.goto(route);
    expect(res?.status() ?? 200, `${route} should load`).toBeLessThan(400);
    // A server redirect (for example `/` → router) never fires framenavigated for the
    // requested path, so record the route this test was asked to cover.
    tracker.pathsSeen.add(route);
    // Pages that poll never go idle; settle briefly instead of waiting for networkidle.
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    await auditLayout(page, testInfo, label);
  });
}
