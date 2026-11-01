import { test, expect } from "../../src/fixtures";
import { loginViaStaffOtp, loginViaStudentOtp } from "../../src/auth";

test.describe("@smoke Role journeys", () => {
  test("student opens practice from the app nav", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    await page.getByRole("navigation", { name: "Student app" }).getByRole("link", { name: "Practice" }).click();
    await expect(page).toHaveURL(/\/app\/student\/practice-play$/);
    await expect(page.getByRole("heading", { name: "Daily Practice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Topic Practice Sets" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/app\/student$/);
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
  });

  test("student dashboard survives a reload", async ({ page }) => {
    await loginViaStudentOtp(page, "student");
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/app\/student$/);
    await expect(page.getByRole("heading", { name: /^Hi,/ })).toBeVisible();
  });

  test("teacher opens the week calendar from the faculty nav", async ({ page }) => {
    await loginViaStaffOtp(page, "teacher");
    await page.getByRole("complementary", { name: "Faculty console" }).getByRole("link", { name: "Schedule", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/faculty\/schedule$/);
    await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ New session" })).toBeVisible();
  });

  test("owner opens billing from the owner nav", async ({ page }) => {
    await loginViaStaffOtp(page, "owner");
    await page.getByRole("complementary", { name: "Owner console" }).getByRole("link", { name: "Billing", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/admin\/billing$/);
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Issue invoice" })).toBeVisible();
  });

  test("parent opens fees from the parent nav", async ({ page }) => {
    await loginViaStudentOtp(page, "parent");
    await page.getByRole("navigation", { name: "Parent app" }).getByRole("link", { name: "Fees" }).click();
    await expect(page).toHaveURL(/\/app\/student\/payments$/);
    await expect(page.getByRole("heading", { name: "Tuition Fees, Lesson Pack & Receipts" })).toBeVisible();
  });

  test("assistant opens the sessions register", async ({ page }) => {
    await loginViaStaffOtp(page, "assistant");
    await page.goto("/app/faculty/schedule");
    await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
    await page.getByRole("link", { name: "Sessions list" }).click();
    await expect(page).toHaveURL(/\/app\/faculty\/sessions$/);
    await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Sessions Register" })).toBeVisible();
  });
});
