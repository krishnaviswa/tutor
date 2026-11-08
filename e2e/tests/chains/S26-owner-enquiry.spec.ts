import { chain, expect, RUN_ID } from "../../src/chains";
import { uniquePhone } from "../../src/chain-helpers";
import { routes } from "../../src/env";

/**
 * S26 — same-role, owner.
 * An empty submit is blocked. A new enquiry saves and the student shows on the roster.
 * Reusing the phone is refused, with no second student and no change to the first.
 */
chain("S26", async ({ asRole }) => {
  const owner = await asRole("owner");
  const name = `E2E S26 ${RUN_ID}`;
  const other = `E2E S26 dup ${RUN_ID}`;
  const phone = uniquePhone();

  await owner.goto(routes.owner);
  await owner.getByRole("button", { name: "+ New Student Enquiry" }).click();
  const form = owner.getByRole("form", { name: "Enquiry" });
  await expect(form.getByRole("heading", { name: /New Student Enquiry/ })).toBeVisible();

  // Empty: blocked in the form, nothing saved.
  await form.getByRole("button", { name: "Save enquiry" }).click();
  await expect(form.getByRole("status")).toHaveCount(0);
  await expect(form.getByLabel("Student Name")).toBeVisible();

  // Save.
  await form.getByLabel("Student Name").fill(name);
  await form.getByLabel("Phone").fill(phone);
  await form.getByLabel("Lesson Pack Size").selectOption("8");
  await form.getByRole("button", { name: "Save enquiry" }).click();
  await expect(form.getByRole("status")).toContainText(/saved/i);

  // Same phone, different name: refused in words.
  await form.getByLabel("Student Name").fill(other);
  await form.getByLabel("Phone").fill(phone);
  const posted = owner.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/v1/owner/enquiries",
  );
  await form.getByRole("button", { name: "Save enquiry" }).click();
  expect((await posted).status(), "reused phone should be refused by the API").toBe(400);
  await expect(form.getByRole("status")).toHaveCount(0);
  await expect(form.getByRole("alert")).toContainText(/phone/i);
  await expect(form.getByRole("alert")).not.toContainText(/\b400\b|\{/);

  // Roster: the first student once, the refused one never.
  await owner.goto(routes.roster);
  await expect(owner.getByRole("heading", { name: "Students" })).toBeVisible();
  await expect(owner.getByRole("row", { name: new RegExp(name) })).toHaveCount(1);
  await expect(owner.getByRole("row", { name: new RegExp(other) })).toHaveCount(0);
});
