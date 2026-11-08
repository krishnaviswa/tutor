import { chain, expect } from "../../src/chains";
import { appAlerts } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import { loginViaStudentOtp } from "../../src/auth";

/**
 * S01 — same-role, student.
 * Failure path: a wrong code keeps the learner on sign-in with a plain sentence.
 * Happy path: the right code opens the dashboard.
 * Persistence: the session survives a reload; after sign-out a protected page asks for
 * sign-in; signing in again in a brand-new browser context shows the same learner.
 */
chain("S01", async ({ anonymous }) => {
  const page = await anonymous();

  await test_step_wrongCode(page);

  await loginViaStudentOtp(page, "student");
  const greeting = page.getByRole("heading", { name: /^Hi,/ });
  // The heading first renders "Hi, there" and fills the name when /me/dashboard returns.
  await expect(greeting, "greeting should name the seeded learner").toContainText(env.studentDisplayName.split(" ")[0]);
  const name = ((await greeting.textContent()) || "").trim();
  await expect(appAlerts(page)).toHaveCount(0);

  // Persistence: reload keeps the session.
  await page.reload();
  await expect(page).toHaveURL(/\/app\/student$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Sign out: cookie is gone and a protected page asks for sign-in.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
  const cookies = await page.context().cookies(env.apiBase);
  // Compare presence only, so a failure never prints the token into reports.
  expect(cookies.some((c) => c.name === "tutoros_token"), "session cookie should be cleared").toBe(false);
  await page.goto(routes.studentDash);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Hi,/ })).toHaveCount(0);

  // Re-login in a fresh context: same learner, same dashboard.
  const again = await anonymous();
  await loginViaStudentOtp(again, "student");
  await expect(again.getByRole("heading", { name })).toBeVisible();
});

async function test_step_wrongCode(page: import("@playwright/test").Page) {
  await page.goto(routes.studentLogin);
  await page.getByLabel("Demo Persona Quick-Select").selectOption("student");
  await page.getByLabel("Workspace").selectOption(env.workspaceId);
  await page.getByRole("textbox", { name: "Phone", exact: true }).fill(env.phone.student);
  const wrong = env.otp === "111111" ? "222222" : "111111";
  for (let i = 0; i < 6; i += 1) await page.getByLabel(`Digit ${i + 1}`).fill(wrong[i]);
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/student\/student-login$/);
  const alert = page.getByRole("alert").filter({ hasText: /code|otp/i });
  await expect(alert).toBeVisible();
  await expect(alert, "error must be a sentence, not a status code").not.toContainText(/\b401\b|\{/);
  const cookies = await page.context().cookies(env.apiBase);
  expect(cookies.some((c) => c.name === "tutoros_token"), "a wrong code must not create a session").toBe(false);
}
