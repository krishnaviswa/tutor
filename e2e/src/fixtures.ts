import { test as base, expect } from "@playwright/test";

type Diagnostics = {
  consoleErrors: string[];
  httpErrors: string[];
};

/**
 * Captures browser console errors and failing /api responses.
 * Attached only when a test does not match its expected status.
 * This is evidence for the defect report. It does not fail a test by itself.
 */
export const test = base.extend<{ diag: Diagnostics }>({
  diag: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [];
      const httpErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 500));
      });
      page.on("pageerror", (err) => {
        consoleErrors.push(err.message.slice(0, 500));
      });
      page.on("response", async (res) => {
        if (res.status() < 400) return;
        const url = res.url();
        if (!url.includes("/api/")) return;
        let body = "";
        try {
          body = (await res.text()).replace(/\s+/g, " ").slice(0, 220);
        } catch {
          body = "";
        }
        httpErrors.push(`${res.status()} ${res.request().method()} ${url} ${body}`);
      });
      await use({ consoleErrors, httpErrors });
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach("console-errors.txt", {
          body: consoleErrors.join("\n") || "(none)",
          contentType: "text/plain",
        });
        await testInfo.attach("http-errors.txt", {
          body: httpErrors.join("\n") || "(none)",
          contentType: "text/plain",
        });
      }
    },
    { auto: true },
  ],
});

/** Ignores the empty Next.js route announcer, which is also role=alert. */
export function appAlerts(page: import("@playwright/test").Page) {
  return page.getByRole("alert").filter({ hasText: /\S/ });
}

export { expect };
