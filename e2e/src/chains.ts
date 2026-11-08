import fs from "fs";
import path from "path";
import type {
  Browser,
  BrowserContext,
  Page,
  PlaywrightTestArgs,
  PlaywrightWorkerArgs,
  TestInfo,
} from "@playwright/test";
import { test as base, expect } from "./fixtures";
import { env } from "./env";

export type ChainRole = "owner" | "teacher" | "assistant" | "student" | "parent";

type ChainEntry = {
  title: string;
  type: "same-role" | "cross-role";
  roles: ChainRole[];
  features: string[];
  files: string[];
  spec: string | null;
  knownGap: string | null;
};

const E2E_ROOT = path.join(__dirname, "..");
export const CHAIN_MAP: { chains: Record<string, ChainEntry>; layout: { excludedRoutes: Record<string, string> } } =
  JSON.parse(fs.readFileSync(path.join(E2E_ROOT, "chain-map.json"), "utf8"));

/** Storage state written by tests/setup/auth.setup.ts after a real UI sign-in. Gitignored. */
export function authFile(role: ChainRole): string {
  return path.join(E2E_ROOT, ".auth", `${role}.json`);
}

/** Every test writes the paths it opened here. The summary reporter's route guard reads them. */
export const VISITED_DIR = path.join(E2E_ROOT, "test-results", ".visited");

/** Unique per run so names never collide with seed data or an earlier local run. */
export const RUN_ID = process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
  : String(Date.now());

/** Same options for every context the chain suite opens, so cross-role pages match the config. */
export function contextOptions(extra: Parameters<Browser["newContext"]>[0] = {}) {
  return {
    baseURL: env.baseURL,
    timezoneId: "Asia/Kolkata",
    viewport: { width: 1280, height: 800 },
    ...extra,
  };
}

type Tracker = { track(page: Page): void; pathsSeen: Set<string> };

function makeTracker(): Tracker {
  const pathsSeen = new Set<string>();
  return {
    pathsSeen,
    track(page: Page) {
      const note = (url: string) => {
        try {
          const u = new URL(url);
          if (u.origin === new URL(env.baseURL).origin) pathsSeen.add(u.pathname.replace(/\/$/, "") || "/");
        } catch {
          /* about:blank */
        }
      };
      page.on("framenavigated", (frame) => {
        if (frame === page.mainFrame()) note(frame.url());
      });
    },
  };
}

function writeVisited(testInfo: TestInfo, seen: Set<string>) {
  if (!seen.size) return;
  fs.mkdirSync(VISITED_DIR, { recursive: true });
  const file = path.join(VISITED_DIR, `${testInfo.testId}.json`);
  fs.writeFileSync(file, JSON.stringify([...seen].sort()));
}

type ChainFixtures = {
  /** Opens a new browser context signed in as `role` (storage state from the setup project). */
  asRole: (role: ChainRole) => Promise<Page>;
  /** Opens a new browser context with no session, for chains that test sign-in itself. */
  anonymous: () => Promise<Page>;
  tracker: Tracker;
};

export const test = base.extend<ChainFixtures>({
  tracker: async ({ page }, use, testInfo) => {
    const tracker = makeTracker();
    tracker.track(page);
    await use(tracker);
    writeVisited(testInfo, tracker.pathsSeen);
  },
  asRole: async ({ browser, tracker }, use, testInfo) => {
    const opened: BrowserContext[] = [];
    await use(async (role) => {
      const file = authFile(role);
      if (!fs.existsSync(file)) throw new Error(`No signed-in state for ${role}. The setup project must run first.`);
      const context = await browser.newContext(contextOptions({ storageState: file }));
      opened.push(context);
      const page = await context.newPage();
      tracker.track(page);
      attachConsole(page, role, testInfo);
      return page;
    });
    for (const context of opened) await context.close();
  },
  anonymous: async ({ browser, tracker }, use, testInfo) => {
    const opened: BrowserContext[] = [];
    await use(async () => {
      const context = await browser.newContext(contextOptions());
      opened.push(context);
      const page = await context.newPage();
      tracker.track(page);
      attachConsole(page, "anonymous", testInfo);
      return page;
    });
    for (const context of opened) await context.close();
  },
});

/** Console errors from extra contexts, attached only when the test does not end as expected. */
function attachConsole(page: Page, label: string, testInfo: TestInfo) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text().slice(0, 500));
  });
  page.on("pageerror", (err) => errors.push(err.message.slice(0, 500)));
  page.on("close", () => {
    if (errors.length && testInfo.status !== testInfo.expectedStatus) {
      void testInfo.attach(`console-${label}.txt`, { body: errors.join("\n"), contentType: "text/plain" });
    }
  });
}

/**
 * Declares the test for one chain id. Title, tags, and annotations come from chain-map.json,
 * so `--grep @S01`, `--grep @cross-role`, and `--grep @role:student` select it.
 * A chain with `knownGap` is expected to fail: the summary shows "known gap", and if the
 * product later closes the gap the test fails as "unexpectedly passed" until the map is updated.
 */
/** Fixtures a chain body may use. Playwright reads fixture names from the destructuring below. */
type ChainArgs = Pick<PlaywrightTestArgs, "page" | "context"> &
  Pick<PlaywrightWorkerArgs, "browser"> &
  ChainFixtures;
type ChainBody = (args: ChainArgs, testInfo: TestInfo) => Promise<void>;

export function chain(id: string, body: ChainBody) {
  const entry = CHAIN_MAP.chains[id];
  if (!entry) throw new Error(`Chain ${id} is not in chain-map.json`);
  const tag = ["@chain", `@${id}`, `@${entry.type}`, ...entry.roles.map((r) => `@role:${r}`)];
  test(
    `${id} ${entry.title}`,
    {
      tag,
      annotation: [
        { type: "chain", description: id },
        { type: "chain-type", description: entry.type },
        { type: "chain-roles", description: entry.roles.join(",") },
        ...(entry.knownGap ? [{ type: "known-gap", description: entry.knownGap }] : []),
      ],
    },
    async ({ page, context, browser, asRole, anonymous, tracker }, testInfo) => {
      if (entry.knownGap) test.fail(true, `known gap: ${entry.knownGap}`);
      await body({ page, context, browser, asRole, anonymous, tracker }, testInfo);
    },
  );
}

export { expect };
