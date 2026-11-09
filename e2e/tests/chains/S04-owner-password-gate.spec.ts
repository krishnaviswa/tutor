import { chain, expect, RUN_ID } from "../../src/chains";
import { hasSessionCookie } from "../../src/chain-helpers";
import { appAlerts } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import type { Page } from "@playwright/test";

/**
 * S04 — same-role, owner.
 * The owner console sits behind a gate with a username and password form.
 * Failure paths: a wrong password and an unknown username give the same plain sentence
 * (so the form does not say which usernames exist), and the assistant's own account is
 * told it is a different role and does not open the console.
 * Happy path: the owner's account opens the console; it survives a reload; sign-out puts
 * the gate back.
 * (backend/app/api/v1/auth.py password_login; frontend LoginGate onPassword.)
 */
chain("S04", async ({ anonymous }) => {
  const page = await anonymous();
  await page.goto(routes.owner);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faculty access" })).toHaveCount(0);

  // Wrong password for a real username.
  await submit(page, env.username.owner, `not-the-password-${RUN_ID}`);
  const wrong = appAlerts(page);
  await expect(wrong).toContainText("Unknown username or password");
  await expect(wrong, "message must be a sentence, not a status code or JSON").not.toContainText(/\b[1-5][0-9]{2}\b|\{/);
  const wrongText = ((await wrong.textContent()) || "").trim();
  expect(await hasSessionCookie(page), "a wrong password must not create a session").toBe(false);

  // A username nobody holds: the same sentence.
  await submit(page, `nobody-${RUN_ID}`, env.demoPassword);
  await expect(appAlerts(page)).toHaveText(wrongText);
  expect(await hasSessionCookie(page), "an unknown username must not create a session").toBe(false);

  // The assistant's own account on the owner gate.
  await submit(page, env.username.assistant, env.demoPassword);
  await expect(appAlerts(page)).toContainText("different role");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faculty access" })).toHaveCount(0);

  // The owner's account.
  await submit(page, env.username.owner, env.demoPassword);
  await expect(page.getByRole("heading", { name: "Faculty access" })).toBeVisible();
  await expect(page.getByLabel("Username")).toHaveCount(0);
  await expect(appAlerts(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Faculty access" })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).first().click();
  await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();
  expect(await hasSessionCookie(page), "sign-out should clear the session").toBe(false);
  await page.goto(routes.owner);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faculty access" })).toHaveCount(0);
});

async function submit(page: Page, username: string, password: string) {
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
