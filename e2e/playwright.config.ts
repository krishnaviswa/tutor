import path from "path";
import { defineConfig, devices } from "@playwright/test";
import { loadEnvFile } from "./src/env";

loadEnvFile();

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const apiURL = process.env.E2E_API_BASE || "http://127.0.0.1:8000";

/**
 * One worker: every test shares the seeded Postgres database.
 * reuseExistingServer: local frontend (3000) and API (8000) are left running.
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
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
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
