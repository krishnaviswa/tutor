import { chain, expect, RUN_ID } from "../../src/chains";
import { createOneOnOne, escapeRe, NOTICE_TIMEOUT, openBell } from "../../src/chain-helpers";
import { appAlerts } from "../../src/fixtures";
import { routes } from "../../src/env";

/**
 * X02 — cross-role: teacher → student and parent.
 * The teacher creates a 1-on-1 for the seeded learner two weeks ahead, then cancels it.
 * The student and parent are already signed in on their own home screens in separate
 * browsers. Without a reload, each bell must show the cancel notice
 * (ShellControls polls the inbox every 15s; backend/app/services/sessions.py:445).
 */

chain("X02", async ({ asRole }) => {
  const title = `E2E X02 ${RUN_ID}`;
  const body = `Session cancelled: ${title}`;

  // Other roles first: signed in, on their home screens, bell open.
  const student = await asRole("student");
  await student.goto(routes.studentDash);
  await expect(student.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
  const studentBell = await openBell(student);
  await expect(studentBell).not.toContainText(body);

  const parent = await asRole("parent");
  await parent.goto(routes.parentHome);
  await expect(parent.getByRole("heading", { name: "Family Overview" })).toBeVisible();
  const parentBell = await openBell(parent);
  await expect(parentBell).not.toContainText(body);

  // Teacher acts.
  const teacher = await asRole("teacher");
  await teacher.goto(routes.schedule);
  await expect(teacher.getByRole("heading", { name: "This week" })).toBeVisible();
  // Two weeks ahead: past the date-relative seed sessions (now−3d … now+2d).
  await teacher.getByRole("button", { name: "next week ›" }).click();
  await teacher.getByRole("button", { name: "next week ›" }).click();
  await createOneOnOne(teacher, title);

  const link = teacher.getByRole("link", { name: new RegExp(escapeRe(title)) });
  const row = teacher.locator("div").filter({ has: link }).filter({ has: teacher.getByRole("button", { name: "Cancel" }) }).last();
  teacher.once("dialog", (dialog) => void dialog.accept());
  // Judge the cancel by the screen's own request, not by the row: once the row changes, a
  // looser container can match and still hold another session's Cancel button.
  const patched = teacher.waitForResponse(
    (r) => r.request().method() === "PATCH" && /^\/api\/v1\/sessions\/[^/]+$/.test(new URL(r.url()).pathname),
  );
  await row.getByRole("button", { name: "Cancel" }).click();
  expect((await patched).ok(), "cancel should be accepted").toBe(true);
  await expect(appAlerts(teacher)).toHaveCount(0);

  // The other roles are told without reloading.
  await expect(studentBell, "student bell should show the cancel notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
  await expect(parentBell, "parent bell should show the cancel notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
  await expect(student.getByRole("button", { name: /^[1-9]\d* unread$/ })).toBeVisible();
  await expect(parent.getByRole("button", { name: /^[1-9]\d* unread$/ })).toBeVisible();
});
