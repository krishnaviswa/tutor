import { chain, expect } from "../../src/chains";
import { loginViaStaffOtp } from "../../src/auth";
import { appAlerts } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import type { Page } from "@playwright/test";

/**
 * S03 — same-role, staff (teacher, assistant, owner).
 * Failure paths: a wrong code and a role the person does not hold are both refused with a
 * plain sentence and no session. Happy path: each staff role signs in and reaches its home;
 * signing out clears the session.
 */
chain("S03", async ({ anonymous }) => {
  const page = await anonymous();

  // Wrong code.
  await openStaffForm(page, "teacher");
  const wrong = env.otp === "111111" ? "222222" : "111111";
  await page.getByLabel("OTP").fill(wrong);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expectRefused(page, "a wrong code");

  // A teacher's phone asking for the student role.
  await openStaffForm(page, "student");
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone.teacher);
  await page.getByLabel("OTP").fill(env.otp);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expectRefused(page, "a role the person does not hold");

  // Each staff role signs in, keeps the session on reload, and signs out.
  for (const role of ["teacher", "assistant", "owner"] as const) {
    const fresh = await anonymous();
    await loginViaStaffOtp(fresh, role);
    const home = fresh.url();
    await fresh.reload();
    await expect(fresh, `${role} session should survive a reload`).toHaveURL(home);
    await fresh.getByRole("button", { name: "Sign out" }).first().click();
    await expect(fresh.getByRole("heading", { name: "Choose a door" })).toBeVisible();
    const cookies = await fresh.context().cookies(env.apiBase);
    // Presence only, so a failure never prints the token into reports.
    expect(cookies.some((c) => c.name === "tutoros_token"), `${role} cookie should be cleared`).toBe(false);
  }
});

async function openStaffForm(page: Page, role: string) {
  await page.goto(routes.staffLogin);
  await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
  await page.getByLabel("Role").selectOption(role);
  await page.getByLabel("Workspace").selectOption(env.workspaceId);
  await expect(page.getByRole("button", { name: "Phone OTP" })).toBeVisible();
  if (role !== "student") await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone[role as "teacher"]);
}

async function expectRefused(page: Page, what: string) {
  await expect(page, `${what} must stay on staff sign-in`).toHaveURL(/\/staff-login$/);
  const alert = appAlerts(page);
  await expect(alert, `${what} should show a message`).toBeVisible();
  await expect(alert, "message must be a sentence, not a status code or JSON").not.toContainText(/\b40[0-9]\b|\{/);
  const cookies = await page.context().cookies(env.apiBase);
  expect(cookies.some((c) => c.name === "tutoros_token"), `${what} must not create a session`).toBe(false);
}
