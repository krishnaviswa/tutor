import { chain, expect, RUN_ID } from "../../src/chains";
import { askDoubt, escapeRe, NOTICE_TIMEOUT, openBell } from "../../src/chain-helpers";
import { appAlerts } from "../../src/fixtures";

/**
 * X08 — cross-role: teacher → student.
 * The student asks a doubt, then waits on the doubts screen with the bell open. The teacher
 * answers that doubt from the queue. Without a reload the student's bell gains the
 * "clarified" notice (services/doubts.py:46); after a reload the answer is on the card and the
 * student can mark it helpful.
 */
const CLARIFIED = "The doubt was clarified";

chain("X08", async ({ asRole }) => {
  const question = `E2E X08 ${RUN_ID}: how do I resolve forces on an incline?`;
  const answer = `E2E X08 answer ${RUN_ID}: draw the free-body diagram first.`;

  const student = await asRole("student");
  await askDoubt(student, question);
  const bell = await openBell(student);
  const before = await bell.getByText(CLARIFIED).count();

  const teacher = await asRole("teacher");
  await teacher.goto("/app/faculty/doubt-teacher");
  await expect(teacher.getByRole("heading", { name: "Student Doubts Queue" })).toBeVisible();
  await teacher.getByRole("button", { name: new RegExp(escapeRe(question)) }).click();
  await teacher.getByLabel("Step-by-Step Clarification").fill(answer);
  await teacher.getByRole("button", { name: "Mark Clarified & Notify Student" }).click();
  await expect(teacher.getByText(`Clarification sent: ${answer}`)).toBeVisible();
  await expect(appAlerts(teacher)).toHaveCount(0);

  // Told without a reload.
  await expect(bell.getByText(CLARIFIED), "student bell should gain the clarified notice").toHaveCount(before + 1, {
    timeout: NOTICE_TIMEOUT,
  });

  // And the answer is there on the card.
  await student.reload();
  const card = student.locator(".card").filter({ hasText: question });
  await expect(card).toContainText("Clarified by Teacher");
  await expect(card).toContainText(answer);
  await card.getByRole("button", { name: "Accept Clarification" }).click();
  await expect(card).toContainText("Marked Helpful");
});
