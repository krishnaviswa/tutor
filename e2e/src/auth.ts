import { expect, type Page } from "@playwright/test";
import { env, routes, type DemoRole } from "./env";

const HOME: Record<DemoRole, RegExp> = {
  student: /\/app\/student$/,
  parent: /\/app\/parent$/,
  teacher: /\/app\/faculty\/teacher-dash$/,
  assistant: /\/app\/faculty\/teacher-dash$/,
  owner: /\/app\/admin$/,
};

async function fillOtpDigits(page: Page, code: string): Promise<void> {
  const digits = code.split("");
  for (let i = 0; i < 6; i += 1) {
    await page.getByLabel(`Digit ${i + 1}`).fill(digits[i] ?? "");
  }
}

/** Catalog screen `student-login`. Phone OTP, mock code from the environment. */
export async function loginViaStudentOtp(page: Page, role: DemoRole): Promise<void> {
  await page.goto(routes.studentLogin);
  await expect(page.getByRole("heading", { name: /6-digit code|Magic link/ })).toBeVisible();
  await page.getByRole("button", { name: "Phone OTP" }).click();
  await page.getByLabel("Demo Persona Quick-Select").selectOption(role);
  await page.getByLabel("Workspace").selectOption(env.workspaceId);
  // "Custom phone / email..." makes getByLabel("Phone") match the persona select too.
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone[role]);
  await fillOtpDigits(page, env.otp);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page).toHaveURL(HOME[role]);
}

/** Catalog screen `staff-login`. Single OTP field, not six digit boxes. */
export async function loginViaStaffOtp(page: Page, role: DemoRole): Promise<void> {
  await page.goto(routes.staffLogin);
  await expect(page.getByRole("heading", { name: "Staff sign-in" })).toBeVisible();
  await page.getByLabel("Role").selectOption(role);
  await page.getByLabel("Workspace").selectOption(env.workspaceId);
  await expect(page.getByRole("button", { name: "Phone OTP" })).toBeVisible();
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone[role]);
  await page.getByLabel("OTP").fill(env.otp);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(HOME[role]);
}

/**
 * Password form rendered by LoginGate on a protected route.
 * The catalog login screens do not use this form. Tests pass the username in;
 * they do not rely on the prefilled value.
 */
export async function loginViaPasswordGate(page: Page, path: string, role: DemoRole): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Username").fill(env.username[role]);
  await page.getByLabel("Password").fill(env.demoPassword);
  await page.getByLabel("Workspace").first().selectOption(env.workspaceId);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeHidden();
}

export async function readStoredToken(page: Page): Promise<string | null> {
  return page.evaluate(() => window.localStorage.getItem("tutoros_token"));
}
