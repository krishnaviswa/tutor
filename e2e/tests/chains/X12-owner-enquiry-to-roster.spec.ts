import { chain, expect, RUN_ID } from "../../src/chains";
import { uniquePhone } from "../../src/chain-helpers";
import { routes } from "../../src/env";

/**
 * X12 — cross-role: owner → teacher.
 * The owner saves an enquiry. The teacher, signed in separately, finds the new student on
 * the roster after opening it, with the lesson pack the owner chose.
 */
chain("X12", async ({ asRole }) => {
  const name = `E2E X12 ${RUN_ID}`;

  const owner = await asRole("owner");
  await owner.goto(routes.owner);
  await owner.getByRole("button", { name: "+ New Student Enquiry" }).click();
  const form = owner.getByRole("form", { name: "Enquiry" });
  await form.getByLabel("Student Name").fill(name);
  await form.getByLabel("Phone").fill(uniquePhone());
  await form.getByLabel("Lesson Pack Size").selectOption("8");
  await form.getByRole("button", { name: "Save enquiry" }).click();
  await expect(form.getByRole("status")).toContainText(/saved/i);

  const teacher = await asRole("teacher");
  await teacher.goto(routes.roster);
  await expect(teacher.getByRole("heading", { name: "Students" })).toBeVisible();
  const row = teacher.getByRole("row", { name: new RegExp(name) });
  await expect(row, "the teacher should see the student the owner just enrolled").toBeVisible();
  await expect(row).toContainText(/8/);
});
