import fs from "fs";
import path from "path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Writes a Markdown summary: pass/fail per chain (grouped by type and role), the other
 * projects, layout findings, and the route-coverage guard. Output goes to
 * $GITHUB_STEP_SUMMARY when set, and always to test-results/summary.md.
 *
 * Labels:
 *  - pass / fail / skipped / flaky
 *  - known gap: chain has `knownGap` in chain-map.json (the test is marked test.fail)
 *  - pre-existing: failure listed in baseline.json
 *
 * Route guard (E2E_ROUTE_GUARD=1): every page file under frontend/app, minus the excluded
 * routes in chain-map.json, must appear in test-results/.visited. A miss fails the run.
 */

const E2E_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(E2E_ROOT, "..");

type Row = {
  project: string;
  title: string;
  chain?: string;
  type?: string;
  roles?: string;
  label: string;
  duration: number;
  error?: string;
};

type Layout = { kind: string; page: string; width: number; a: string; b?: string; detail?: string };

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function esc(s: string): string {
  return s.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function pageFiles(): string[] {
  const appDir = path.join(REPO_ROOT, "frontend", "app");
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
  if (fs.existsSync(appDir)) walk(appDir);
  return out.sort();
}

export default class SummaryReporter implements Reporter {
  private rows: Row[] = [];
  private layout: Layout[] = [];
  private baseline = readJson<{ preExisting: Record<string, string> }>(path.join(E2E_ROOT, "baseline.json"), {
    preExisting: {},
  }).preExisting;
  private chainMap = readJson<{ layout?: { excludedRoutes?: Record<string, string> } }>(
    path.join(E2E_ROOT, "chain-map.json"),
    {},
  );

  printsToStdio() {
    return false;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Called once per attempt. Each attempt replaces the row below, so the last attempt wins.
    const ann = (type: string) => test.annotations.find((a) => a.type === type)?.description;
    const project = test.parent.project()?.name || "";
    const title = test.titlePath().slice(3).join(" › ") || test.title;
    const outcome = test.outcome();
    const chainId = ann("chain");
    let label: string;
    if (outcome === "skipped") label = "skipped";
    else if (outcome === "flaky") label = "flaky";
    else if (outcome === "expected") label = ann("known-gap") ? "known gap" : "pass";
    else if (this.baseline[test.title] || (chainId && this.baseline[chainId])) label = "pre-existing";
    else label = ann("known-gap") ? "fail (gap closed? update chain-map)" : "fail";
    const error = result.error?.message?.split("\n").find((l) => l.trim())?.slice(0, 200);
    const prior = this.rows.findIndex((r) => r.project === project && r.title === title);
    const row: Row = {
      project,
      title,
      chain: chainId,
      type: ann("chain-type"),
      roles: ann("chain-roles"),
      label,
      duration: result.duration,
      error: label.startsWith("fail") || label === "pre-existing" ? error : undefined,
    };
    if (prior >= 0) this.rows[prior] = row;
    else this.rows.push(row);
    for (const a of result.annotations ?? []) this.collectLayout(a);
    for (const a of test.annotations) this.collectLayout(a);
  }

  private collectLayout(a: { type: string; description?: string }) {
    if (a.type !== "layout" || !a.description) return;
    try {
      const f = JSON.parse(a.description) as Layout;
      const key = `${f.page}|${f.width}|${f.kind}|${f.a}|${f.b || ""}`;
      if (!this.layout.some((x) => `${x.page}|${x.width}|${x.kind}|${x.a}|${x.b || ""}` === key)) this.layout.push(f);
    } catch {
      /* ignore */
    }
  }

  private routeGuard(): { lines: string[]; failed: boolean } {
    if (process.env.E2E_ROUTE_GUARD !== "1") return { lines: ["Route guard off (runs with suite `all` or `layout-only`)."], failed: false };
    const excluded = this.chainMap.layout?.excludedRoutes || {};
    const dir = path.join(E2E_ROOT, "test-results", ".visited");
    const seen = new Set<string>();
    if (fs.existsSync(dir)) {
      for (const f of fs.readdirSync(dir)) for (const p of readJson<string[]>(path.join(dir, f), [])) seen.add(p);
    }
    const required = pageFiles().filter((r) => !(r in excluded));
    const missing = required.filter((r) => !seen.has(r));
    const lines = [
      `Discovered page routes: ${required.length + Object.keys(excluded).length} (excluded: ${Object.keys(excluded).join(", ") || "none"}).`,
      `Visited: ${required.length - missing.length} / ${required.length}.`,
    ];
    if (missing.length) lines.push(`**Never visited (fails the run):** ${missing.map((m) => `\`${m}\``).join(", ")}`);
    return { lines, failed: missing.length > 0 };
  }

  async onEnd(result: FullResult) {
    const out: string[] = [];
    const guard = this.routeGuard();
    const counts = (rows: Row[]) => {
      const c: Record<string, number> = {};
      for (const r of rows) c[r.label] = (c[r.label] || 0) + 1;
      return Object.entries(c)
        .map(([k, v]) => `${v} ${k}`)
        .join(", ");
    };
    const finalStatus = guard.failed && result.status === "passed" ? "failed" : result.status;
    out.push(`## E2E chains — ${finalStatus}${guard.failed ? " (route guard: pages never visited)" : ""}`);
    out.push("");
    out.push(`Run status from Playwright: **${result.status}**. Totals: ${counts(this.rows) || "no tests"}.`);
    out.push("");

    const chains = this.rows.filter((r) => r.chain);
    for (const type of ["same-role", "cross-role"]) {
      const group = chains.filter((r) => r.type === type).sort((a, b) => (a.roles || "").localeCompare(b.roles || "") || (a.chain || "").localeCompare(b.chain || ""));
      if (!group.length) continue;
      out.push(`### ${type} chains`);
      out.push("");
      out.push("| chain | roles | result | title | time | error |");
      out.push("|---|---|---|---|---|---|");
      for (const r of group) {
        out.push(`| ${r.chain} | ${r.roles || ""} | ${r.label} | ${esc(r.title)} | ${(r.duration / 1000).toFixed(1)}s | ${esc(r.error || "")} |`);
      }
      out.push("");
    }

    const others = this.rows.filter((r) => !r.chain);
    if (others.length) {
      out.push("### Other tests");
      out.push("");
      out.push("| project | result | title | error |");
      out.push("|---|---|---|---|");
      for (const r of others.sort((a, b) => a.project.localeCompare(b.project))) {
        out.push(`| ${r.project} | ${r.label} | ${esc(r.title)} | ${esc(r.error || "")} |`);
      }
      out.push("");
    }

    out.push("### Layout findings");
    out.push("");
    out.push(process.env.LAYOUT_STRICT === "1" ? "Mode: strict (findings fail the page)." : "Mode: report only (findings do not fail).");
    out.push("");
    if (!this.layout.length) out.push("None.");
    else {
      out.push("| page | width | kind | element | other element | detail |");
      out.push("|---|---|---|---|---|---|");
      for (const f of this.layout.sort((a, b) => a.page.localeCompare(b.page) || a.width - b.width)) {
        out.push(`| ${esc(f.page)} | ${f.width} | ${f.kind} | ${esc(f.a)} | ${esc(f.b || "")} | ${esc(f.detail || "")} |`);
      }
    }
    out.push("");
    out.push("### Route coverage");
    out.push("");
    out.push(...guard.lines);
    out.push("");

    const md = out.join("\n");
    const local = path.join(E2E_ROOT, "test-results", "summary.md");
    fs.mkdirSync(path.dirname(local), { recursive: true });
    fs.writeFileSync(local, md);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
    if (guard.failed && result.status === "passed") return { status: "failed" as const };
    return undefined;
  }
}
