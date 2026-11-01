import { test, expect } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import { loginViaStaffOtp, loginViaStudentOtp } from "../../src/auth";

test.describe("@smoke Sign-in", () => {
  test("student phone OTP lands on the student dashboard", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Student app" })).toBeVisible();
  });

  test("student magic link lands on the student dashboard", async ({ page }) => {
    await page.goto(routes.studentLogin);
    await page.getByRole("button", { name: "Magic link" }).click();
    await expect(page.getByRole("heading", { name: "Magic link" })).toBeVisible();
    await page.getByLabel("Demo Persona Quick-Select").selectOption("student");
    await page.getByLabel("Workspace").selectOption(env.workspaceId);
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(env.email.student);
    await page.getByRole("button", { name: "Send magic link" }).click();
    await expect(page).toHaveURL(/\/app\/student$/);
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
  });

  test("wrong OTP stays on student sign-in and explains the failure in plain language", async ({ page }) => {
    await page.goto(routes.studentLogin);
    await page.getByLabel("Demo Persona Quick-Select").selectOption("student");
    await page.getByLabel("Workspace").selectOption(env.workspaceId);
    await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone.student);
    const wrong = "111111";
    for (let i = 0; i < 6; i += 1) {
      await page.getByLabel(`Digit ${i + 1}`).fill(wrong[i]);
    }
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/student\/student-login$/);
    const alert = page.getByRole("alert").filter({ hasText: /code|otp/i });
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText(/\b401\b/);
  });

  test("empty OTP is rejected before a network call", async ({ page }) => {
    await page.goto(routes.studentLogin);
    for (let i = 0; i < 6; i += 1) {
      await page.getByLabel(`Digit ${i + 1}`).fill("");
    }
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Enter the 6-digit code." })).toBeVisible();
    await expect(page).toHaveURL(/\/app\/student\/student-login$/);
  });

  test("teacher staff OTP lands on the teaching hub", async ({ page }) => {
    await loginViaStaffOtp(page, "teacher");
    await expect(page.getByText("Class Attendance")).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Faculty console" })).toBeVisible();
  });

  test("owner staff OTP lands on the owner console", async ({ page }) => {
    await loginViaStaffOtp(page, "owner");
    await expect(page.getByRole("heading", { name: "Faculty access" })).toBeVisible();
    await expect(page.getByText("Active students")).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Owner console" })).toBeVisible();
  });

  test("assistant staff OTP lands on the teaching hub", async ({ page }) => {
    await loginViaStaffOtp(page, "assistant");
    await expect(page.getByText("Class Attendance")).toBeVisible();
  });

  test("parent OTP from student sign-in lands on family overview", async ({ page }) => {
    await loginViaStudentOtp(page, "parent");
    await expect(page.getByRole("heading", { name: "Family Overview" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Parent app" })).toBeVisible();
  });

  test("wrong password on the owner gate stays on Sign in", async ({ page }) => {
    await page.goto(routes.owner);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Username").fill(env.username.owner);
    await page.getByLabel("Password").fill("not-the-demo-password");
    await page.getByLabel("Workspace").first().selectOption(env.workspaceId);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    const message = page.getByText(/unknown username or password/i).first();
    await expect(message).toBeVisible();
    await expect(message).not.toContainText(/\b401\b/);
    await expect(page.getByText("Active students")).toHaveCount(0);
  });
});
