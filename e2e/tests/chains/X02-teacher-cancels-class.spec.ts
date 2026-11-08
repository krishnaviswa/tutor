import type { Page } from "@playwright/test";
import { chain, expect, RUN_ID } from "../../src/chains";
import { appAlerts } from "../../src/fixtures";
import { env, routes } from "../../src/env";

/**
 * X02 — cross-role: teacher → student and parent.
 * The teacher creates a 1-on-1 for the seeded learner two weeks ahead, then cancels it.
 * The student and parent are already signed in on their own home screens in separate
 * browsers. Without a reload, each bell must show the cancel notice
 * (ShellControls polls the inbox every 15s; backend/app/services/sessions.py:445).
 */

/** Seeded teacher windows are Mon–Fri 16:00–17:30 and 18:00–20:00 IST (seed_internal_v2.py:153). */
const SLOTS = ["16:00", "16:15", "16:30", "16:45", "17:00", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30"];
const WEEKDAYS = /^(Mon|Tue|Wed|Thu|Fri)\b/;
/** Poll interval plus slack. */
const NOTICE_TIMEOUT = 45_000;

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
  await row.getByRole("button", { name: "Cancel" }).click();
  await expect(row.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  await expect(appAlerts(teacher)).toHaveCount(0);

  // The other roles are told without reloading.
  await expect(studentBell, "student bell should show the cancel notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
  await expect(parentBell, "parent bell should show the cancel notice").toContainText(body, { timeout: NOTICE_TIMEOUT });
  await expect(student.getByRole("button", { name: /^[1-9]\d* unread$/ })).toBeVisible();
  await expect(parent.getByRole("button", { name: /^[1-9]\d* unread$/ })).toBeVisible();
});

/** Opens the shell bell and returns its popup. The popup re-renders on each inbox poll. */
async function openBell(page: Page) {
  const bell = page.getByRole("button", { name: /unread$/ }).first();
  await expect(bell, "notices bell should be on this screen").toBeVisible();
  await bell.click();
  const pop = page.locator(".notice-pop");
  await expect(pop).toBeVisible();
  return pop;
}

/** Walks weekday slots inside the teacher's windows until one is free. */
async function createOneOnOne(teacher: Page, title: string) {
  await teacher.getByRole("button", { name: "+ New session" }).click();
  await expect(teacher.getByRole("heading", { name: "New session" })).toBeVisible();
  await teacher.getByRole("textbox", { name: "Title", exact: true }).fill(title);
  await teacher.getByRole("button", { name: "1-on-1 student" }).click();
  // The wrapping label's name also carries the selected option ("Student Pick a student…").
  await teacher.getByRole("combobox", { name: /^Student\b/ }).selectOption({ label: env.studentDisplayName });

  const day = teacher.getByLabel("Day of week");
  const days = (
    await day.locator("option").evaluateAll((nodes) =>
      nodes.map((n) => ({ value: (n as HTMLOptionElement).value, label: n.textContent || "" })),
    )
  ).filter((d) => WEEKDAYS.test(d.label));
  expect(days.length, "the compose form should list weekdays").toBeGreaterThan(0);

  const created = teacher.getByRole("link", { name: new RegExp(escapeRe(title)) });
  const refused = teacher.getByText(/That slot conflicts with another class\.|That time is outside the teacher's availability\./);
  for (const d of days) {
    for (const slot of SLOTS) {
      await day.selectOption(d.value);
      await teacher.getByLabel("15-min time slot (IST)").selectOption(slot);
      // Observe the screen's own POST, so a stale refusal from the last try is not misread.
      const posted = teacher.waitForResponse(
        (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/v1/sessions",
      );
      await teacher.getByRole("button", { name: "Create session" }).click();
      const res = await posted;
      if (res.ok()) {
        await expect(created).toBeVisible();
        return;
      }
      expect([400, 409], `unexpected create refusal ${res.status()}`).toContain(res.status());
      await expect(refused).toBeVisible();
    }
  }
  throw new Error("No free slot in the teacher's availability two weeks ahead.");
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
