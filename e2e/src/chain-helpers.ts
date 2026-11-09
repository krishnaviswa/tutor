import type { Page } from "@playwright/test";
import { expect } from "./chains";
import { env } from "./env";

/** Shared steps for chain specs. Selectors follow the screens' own labels. */

/** Seeded teacher windows are Mon–Fri 16:00–17:30 and 18:00–20:00 IST (seed_internal_v2.py:153). */
export const SLOTS = ["16:00", "16:15", "16:30", "16:45", "17:00", "18:00", "18:15", "18:30", "18:45", "19:00", "19:15", "19:30"];
export const WEEKDAYS = /^(Mon|Tue|Wed|Thu|Fri)\b/;
/** ShellControls polls the inbox every 15s; this is one poll plus slack. */
export const NOTICE_TIMEOUT = 45_000;

export function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whether the browser holds a session cookie. Presence only, so a report never prints the token. */
export async function hasSessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies(env.apiBase);
  return cookies.some((c) => c.name === "tutoros_token");
}

/** A phone number no earlier run has used. */
export function uniquePhone(): string {
  return `+9198${String(Date.now()).slice(-8)}`;
}

/** Opens the shell bell and returns its popup. The popup re-renders on each inbox poll. */
export async function openBell(page: Page) {
  const bell = page.getByRole("button", { name: /unread$/ }).first();
  await expect(bell, "notices bell should be on this screen").toBeVisible();
  await bell.click();
  const pop = page.locator(".notice-pop");
  await expect(pop).toBeVisible();
  return pop;
}

/** Walks weekday slots inside the teacher's windows until one is free, then creates a 1-on-1. */
export async function createOneOnOne(teacher: Page, title: string) {
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

/** The student asks a doubt through the screen; returns once it shows in their own list. */
export async function askDoubt(student: Page, body: string) {
  await student.goto("/app/student/doubt-student");
  await expect(student.getByRole("heading", { name: "Ask Your Teacher & Track Clarifications" })).toBeVisible();
  // The form opens by default; the toggle reads "+ Ask a Question" only when it is closed.
  const open = student.getByRole("button", { name: "+ Ask a Question" });
  if ((await open.count()) > 0) await open.click();
  await student.getByLabel("Your Question").fill(body);
  await student.getByRole("button", { name: "Send to Teacher Queue" }).click();
  await expect(student.getByText(body)).toBeVisible();
}
