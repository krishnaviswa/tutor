import { chain, expect } from "../../src/chains";
import { env, routes } from "../../src/env";
import type { Page } from "@playwright/test";

/**
 * S25 — same-role, assistant and student.
 * Pages: the assistant and the student are put at the sign-in gate on the owner console
 * and on the teacher-only Doubts and Records pages, and they keep their own session
 * (their own home still opens afterwards).
 * Menu: the assistant's teaching menu has no Doubts or Records entry.
 * API: an owner-only endpoint answers 403 "forbidden" to both, not a server error.
 * (frontend LoginGate accept lists, lib/nav.ts roles; backend deps.py require_roles,
 * owner.py console.)
 */
chain("S25", async ({ asRole }) => {
  const gated = [
    { name: "owner console", path: routes.owner },
    { name: "teacher Doubts", path: "/app/faculty/doubt-teacher" },
    { name: "teacher Records", path: routes.record },
  ];

  // Assistant.
  const assistant = await asRole("assistant");
  await assistant.goto(routes.teacherDash);
  await expect(assistant.getByText("Class Attendance")).toBeVisible();
  await expect(assistant.getByRole("link", { name: "Schedule", exact: true }).first(), "the menu should list the pages the assistant may use").toBeVisible();
  await expect(assistant.getByRole("link", { name: "Doubts", exact: true }), "no Doubts entry for an assistant").toHaveCount(0);
  await expect(assistant.getByRole("link", { name: "Records", exact: true }), "no Records entry for an assistant").toHaveCount(0);
  for (const g of gated) await expectGate(assistant, g.name, g.path);
  await assistant.goto(routes.teacherDash);
  await expect(assistant.getByText("Class Attendance"), "the assistant keeps their own session").toBeVisible();
  await expectOwnerApiRefused(assistant, "assistant");

  // Student.
  const student = await asRole("student");
  for (const g of gated) await expectGate(student, g.name, g.path);
  await student.goto(routes.studentDash);
  await expect(student.getByRole("heading", { name: /^Hi,/ }), "the student keeps their own session").toBeVisible();
  await expectOwnerApiRefused(student, "student");
});

async function expectGate(page: Page, name: string, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { name: "Sign in" }), `${name} should show the sign-in gate`).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faculty access" }), `${name} must not open`).toHaveCount(0);
  await expect(page.getByText("Class Attendance"), `${name} must not open the teaching hub`).toHaveCount(0);
}

async function expectOwnerApiRefused(page: Page, who: string) {
  const res = await page.context().request.get(`${env.apiBase}/api/v1/owner/console`);
  expect(res.status(), `${who} must be refused by the owner-only endpoint`).toBe(403);
  expect(((await res.json()) as { detail?: string }).detail).toBe("forbidden");
}
