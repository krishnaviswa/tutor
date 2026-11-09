import { chain, expect, RUN_ID } from "../../src/chains";
import { hasSessionCookie } from "../../src/chain-helpers";
import { appAlerts } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import type { Page } from "@playwright/test";

/**
 * S02 — same-role, student.
 * Failure paths: an email nobody holds, and a student's email asking for the teacher role,
 * are both refused with a plain sentence and no session.
 * Happy path: the student's own email opens the dashboard; the session survives a reload
 * and the token is not readable from page script.
 * (backend/app/api/v1/auth.py magic_link; frontend StudentLoginScreen magic mode.)
 */
chain("S02", async ({ anonymous }) => {
  const page = await anonymous();

  // An email no identity holds.
  await openMagic(page);
  await page.getByRole("textbox", { name: "Email" }).fill(`nobody-${RUN_ID}@exam-prep.sim`);
  await submitMagic(page);
  await expectRefused(page, "an unknown email");

  // The student's email, but asking for the teacher role.
  await openMagic(page);
  await page.getByLabel("Demo Persona Quick-Select").selectOption("teacher");
  await page.getByRole("textbox", { name: "Email" }).fill(env.email.student);
  await submitMagic(page);
  await expectRefused(page, "a role the person does not hold");

  // The student's own email.
  await openMagic(page);
  await page.getByRole("textbox", { name: "Email" }).fill(env.email.student);
  await submitMagic(page);
  await expect(page).toHaveURL(/\/app\/student$/);
  const greeting = page.getByRole("heading", { name: /^Hi,/ });
  await expect(greeting, "greeting should name the seeded learner").toContainText(env.studentDisplayName.split(" ")[0]);
  await expect(appAlerts(page)).toHaveCount(0);
  expect(await hasSessionCookie(page), "a magic link should create a session").toBe(true);
  expect(await page.evaluate(() => window.localStorage.getItem("tutoros_token")), "token must not be in localStorage").toBeNull();

  await page.reload();
  await expect(page).toHaveURL(/\/app\/student$/);
  await expect(greeting).toContainText(env.studentDisplayName.split(" ")[0]);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
  expect(await hasSessionCookie(page), "sign-out should clear the session").toBe(false);
});

async function openMagic(page: Page) {
  await page.goto(routes.studentLogin);
  await expect(page.getByRole("heading", { name: /6-digit code|Magic link/ })).toBeVisible();
  await page.getByRole("button", { name: "Magic link" }).click();
  await expect(page.getByRole("heading", { name: "Magic link" })).toBeVisible();
  await page.getByLabel("Workspace").selectOption(env.workspaceId);
}

async function submitMagic(page: Page) {
  await page.getByRole("button", { name: "Send magic link" }).click();
}

async function expectRefused(page: Page, what: string) {
  await expect(page, `${what} must stay on student sign-in`).toHaveURL(/\/student-login$/);
  const alert = appAlerts(page);
  await expect(alert, `${what} should show a message`).toBeVisible();
  await expect(alert, "message must be a sentence, not a status code or JSON").not.toContainText(/\b[1-5][0-9]{2}\b|\{/);
  expect(await hasSessionCookie(page), `${what} must not create a session`).toBe(false);
}
