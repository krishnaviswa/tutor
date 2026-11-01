import { appAlerts, test, expect } from "../../src/fixtures";
import { env, routes } from "../../src/env";
import { loginViaStaffOtp, loginViaStudentOtp } from "../../src/auth";

test.describe("@flow Enrollment, schedule, attendance, payment, admin", () => {
  test("teacher adds a student and sees them on the roster", async ({ page }) => {
    const name = `E2E Student ${Date.now()}`;
    await loginViaStaffOtp(page, "teacher");
    await page.goto(routes.roster);
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    await page.getByRole("button", { name: "+ Add student" }).click();
    await expect(page.getByRole("heading", { name: "Add student" })).toBeVisible();
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Save student" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
    await expect(appAlerts(page)).toHaveCount(0);
  });

  test("teacher creates a session and sees it on the week calendar", async ({ page }) => {
    const title = `E2E session ${Date.now()}`;
    await loginViaStaffOtp(page, "teacher");
    await page.goto(routes.schedule);
    await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
    await page.getByRole("button", { name: "+ New session" }).click();
    await expect(page.getByRole("heading", { name: "New session" })).toBeVisible();
    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    // The shared database keeps every session this suite creates, so a fixed
    // clock time eventually collides. Walk slots until one is free.
    const slot = page.getByLabel("15-min time slot (IST)");
    const values = await slot.locator("option").evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value).filter((value) => value.length > 0),
    );
    const start = Date.now() % values.length;
    let placed = false;
    for (let attempt = 0; attempt < values.length && attempt < 16; attempt += 1) {
      await slot.selectOption(values[(start + attempt) % values.length]);
      await page.getByRole("button", { name: "Create session" }).click();
      const conflict = page.getByText("That slot conflicts with another class.");
      const created = page.getByText(title);
      await expect(conflict.or(created)).toBeVisible();
      if (await created.isVisible()) {
        placed = true;
        break;
      }
    }
    expect(placed).toBe(true);
    await expect(appAlerts(page)).toHaveCount(0);
  });

  test("teacher marks attendance and saves the class record", async ({ page }) => {
    await loginViaStaffOtp(page, "teacher");
    await page.goto(routes.record);
    await expect(page.getByRole("heading", { name: /Attendance & Class Record/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Mark Attendance Roll/ })).toBeVisible();
    await expect(page.getByText("(0/0 marked)")).toHaveCount(0);
    const markAll = page.getByRole("button", { name: "Mark All Attended" });
    await expect(markAll).toBeEnabled();
    await markAll.click();
    const save = page.getByRole("button", { name: "Save Class Record" });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText(/Saved · Published to \d+ student feeds/)).toBeVisible();
    await expect(appAlerts(page)).toHaveCount(0);
  });

  test("roster shows when a seeded student joined", async ({ page }) => {
    await loginViaStaffOtp(page, "teacher");
    await page.goto(routes.roster);
    await expect(page.getByRole("heading", { name: "Students" })).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(env.studentDisplayName) });
    await expect(row).toBeVisible();
    await expect(row.getByRole("cell").nth(3)).not.toHaveText("—");
  });

  test("student pays an invoice the owner just issued", async ({ page }) => {
    await loginViaStaffOtp(page, "owner");
    await page.goto(routes.billing);
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await page.getByLabel("Student").selectOption({ label: env.studentDisplayName });
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByText("Invoice created.")).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Choose a door" })).toBeVisible();

    await loginViaStudentOtp(page, "student");
    await page.goto(routes.payments);
    await expect(page.getByRole("heading", { name: "Tuition Fees, Lesson Pack & Receipts" })).toBeVisible();
    const pay = page.getByRole("button", { name: /^Pay / });
    await expect(pay.first()).toBeVisible();
    await expect(page.getByText("Payment Consequence Preview")).toBeVisible();
    await pay.first().click();
    await expect(appAlerts(page)).toHaveCount(0);
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();
    await expect(pay).toHaveCount(0);
  });

  test("owner saves a new student enquiry", async ({ page }) => {
    const name = `E2E Enquiry ${Date.now()}`;
    const phone = `+9198${String(Date.now()).slice(-8)}`;
    await loginViaStaffOtp(page, "owner");
    await page.getByRole("button", { name: "+ New Student Enquiry" }).click();
    const form = page.getByRole("form", { name: "Enquiry" });
    await expect(form.getByRole("heading", { name: /New Student Enquiry/ })).toBeVisible();
    await form.getByLabel("Student Name").fill(name);
    await form.getByLabel("Phone").fill(phone);
    await form.getByLabel("Lesson Pack Size").selectOption("8");
    await form.getByRole("button", { name: "Save enquiry" }).click();
    await expect(form.getByRole("status")).toContainText(/saved/i);
    await expect(appAlerts(page)).toHaveCount(0);
  });

  test("owner enquiry form blocks an empty submit", async ({ page }) => {
    await loginViaStaffOtp(page, "owner");
    await page.getByRole("button", { name: "+ New Student Enquiry" }).click();
    const form = page.getByRole("form", { name: "Enquiry" });
    await form.getByRole("button", { name: "Save enquiry" }).click();
    await expect(form.getByRole("status")).toHaveCount(0);
    await expect(form.getByLabel("Student Name")).toBeVisible();
  });
});
