import { chain, expect, RUN_ID } from "../../src/chains";
import { createOneOnOne, NOTICE_TIMEOUT, openBell } from "../../src/chain-helpers";
import { appAlerts } from "../../src/fixtures";
import { routes } from "../../src/env";

/**
 * X03 — cross-role: teacher → student and parent.
 * The teacher creates a 1-on-1 two weeks ahead, opens it on the live console and starts the
 * class. The student and parent are on their home screens with the bell open. Without a reload
 * each bell gains "Class started: <title>" (backend/app/services/sessions.py:494).
 */
chain("X03", async ({ asRole }) => {
  const title = `E2E X03 ${RUN_ID}`;
  const body = `Class started: ${title}`;

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

  const teacher = await asRole("teacher");
  await teacher.goto(routes.schedule);
  await expect(teacher.getByRole("heading", { name: "This week" })).toBeVisible();
  await teacher.getByRole("button", { name: "next week ›" }).click();
  await teacher.getByRole("button", { name: "next week ›" }).click();
  await createOneOnOne(teacher, title);

  await teacher.goto("/app/faculty/live-teacher");
  // Find our session's id in the console's own list, then open the console on it with the
  // `?session=` link the screen supports. Picking from the list right after load can be
  // overwritten by the screen's own first-session default.
  const option = teacher.getByLabel("Session").locator("option", { hasText: title });
  await expect(option).toHaveCount(1);
  const sessionId = (await option.getAttribute("value")) ?? "";
  expect(sessionId, "the new session should be in the console's list").not.toBe("");
  await teacher.goto(`/app/faculty/live-teacher?session=${sessionId}`);
  await expect(teacher.getByRole("heading", { name: title })).toBeVisible();
  await expect(teacher.getByLabel("Session")).toHaveValue(sessionId);
  const started = teacher.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === `/api/v1/sessions/${sessionId}/start`,
  );
  await teacher.getByRole("button", { name: "Start class" }).click();
  expect((await started).ok(), "start should succeed for the chosen session").toBe(true);
  await expect(teacher.getByText(/^Class started\./)).toBeVisible();
  await expect(appAlerts(teacher)).toHaveCount(0);

  await expect(studentBell, "student bell should show the class-started notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
  await expect(parentBell, "parent bell should show the class-started notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
});
