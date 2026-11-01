import { appAlerts, test, expect } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import { loginViaPasswordGate, loginViaStaffOtp, loginViaStudentOtp, readStoredToken } from "../../src/auth";

test.describe("@flow Permissions and session", () => {
  test("student who opens the owner console stays signed in on their own dashboard", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    await page.goto(routes.owner);
    await expect(page.getByRole("heading", { name: "Faculty access" })).toHaveCount(0);
    await expect(page.getByText("Active students")).toHaveCount(0);
    expect(await readStoredToken(page)).toBeNull();
    const cookies = await page.context().cookies(env.apiBase);
    const session = cookies.find((cookie) => cookie.name === "tutoros_token");
    expect(session, "opening the owner console cleared the student session").toBeTruthy();
    expect(session?.httpOnly).toBe(true);
    await page.goto(routes.studentDash);
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
  });

  test("assistant cannot open the owner console", async ({ page }) => {
    await loginViaStaffOtp(page, "assistant");
    await page.goto(routes.owner);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Faculty access" })).toHaveCount(0);
    await page.goto(routes.teacherDash);
    await expect(page.getByText("Class Attendance")).toBeVisible();
  });

  test("owner admitted to the teaching hub sees class attendance", async ({ page }) => {
    await loginViaStaffOtp(page, "owner");
    await page.goto(routes.teacherDash);
    await expect(appAlerts(page)).toHaveCount(0);
    await expect(page.getByText("Class Attendance")).toBeVisible();
  });

  test("protected pages lead with the one-time code, not a filled password", async ({ page }) => {
    await page.goto(routes.teacherDash);
    await expect(page.getByLabel("Password")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Verify & Continue" })).toBeVisible();
  });

  test("unmodified sign-in on reports does not enter a console", async ({ page }) => {
    await page.goto(routes.reports);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Faculty console" })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Owner console" })).toHaveCount(0);
  });

  test("session token is an httpOnly cookie, not localStorage", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    expect(await readStoredToken(page)).toBeNull();
  });

  test("password gate signs the owner in when the password is typed", async ({ page }) => {
    await loginViaPasswordGate(page, routes.owner, "owner");
    await expect(page.getByRole("heading", { name: "Faculty access" })).toBeVisible();
    await expect(page.getByLabel("Username")).toHaveCount(0);
  });

  test("profile presets are subject-neutral", async ({ page }) => {
    await loginViaStaffOtp(page, "teacher");
    await page.goto(routes.profile);
    await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Expertise" })).toBeVisible();
    await expect(page.getByRole("button", { name: "NEET UG" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "JEE Advanced" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Biology" })).toHaveCount(0);
  });
});
