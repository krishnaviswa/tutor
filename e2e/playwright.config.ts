import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "./src/env";

loadEnvFile();

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const apiURL = process.env.E2E_API_BASE || "http://127.0.0.1:8000";
/** Optional: run on an installed browser (for example `chrome`) when Playwright's own build is not downloaded. */
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

/**
 * One worker: every test shares the seeded Postgres database.
 * reuseExistingServer: local frontend (3000) and API (8000) are left running.
 *
 * Projects:
 * - chromium: the original smoke + flow suite (tests/smoke, tests/flows). Unchanged.
 * - setup: signs each role in once through the real sign-in screens (tests/setup).
 * - chains: one test per workflow chain (tests/chains, ids in chain-map.json).
 * - layout: overlap / clipping / overflow check on every page route at 375, 768, 1280.
 * New projects never retry, so a failure is never hidden by a lucky second attempt.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  outputDir: "test-results",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
    ["json", { outputFile: "test-results/results.json" }],
    ["./src/summary-reporter.ts"],
  ],
  use: {
    ...(channel ? { channel } : {}),
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Video needs Playwright's ffmpeg, which comes with `npx playwright install`, not with an installed browser.
    video: channel ? "off" : "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      testMatch: /[\\/](smoke|flows)[\\/].*\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /[\\/]setup[\\/].*\.setup\.ts$/,
      // On CI a sign-in sometimes gets "bad challenge" from /auth/otp/verify straight after
      // /auth/otp/start (seen in 2 of 3 runs). One failed sign-in would skip every chain, so
      // retry it; the job summary labels a retried pass as "flaky", so it stays visible.
      retries: 2,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chains",
      testMatch: /[\\/]chains[\\/].*\.spec\.ts$/,
      dependencies: ["setup"],
      retries: 0,
      timeout: 180_000,
      use: { ...devices["Desktop Chrome"], timezoneId: "Asia/Kolkata" },
    },
    {
      name: "layout",
      testMatch: /[\\/]layout[\\/].*\.spec\.ts$/,
      dependencies: ["setup"],
      retries: 0,
      timeout: 90_000,
      use: { ...devices["Desktop Chrome"], timezoneId: "Asia/Kolkata" },
    },
  ],
  webServer: [
    {
      command: "python -m uvicorn app.main:app --port 8000",
      cwd: path.join(__dirname, "../backend"),
      url: `${apiURL}/openapi.json`,
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: path.join(__dirname, "../frontend"),
      url: baseURL,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
