import { chain, expect, RUN_ID } from "../../src/chains";
import { askDoubt, NOTICE_TIMEOUT, openBell } from "../../src/chain-helpers";
import { routes } from "../../src/env";

/**
 * X07 — cross-role: student → teacher. KNOWN GAP (chain-map.json).
 * The student asks a doubt. The teacher is on their dashboard in another browser. Today the
 * doubt reaches the teacher only through role-level mock WhatsApp, which no screen reads
 * (backend/app/services/comms.py doubts; notify.dispatch_after_timeline). No in-app notice
 * is written, so the teacher's bell stays as it was and the last assertion fails. The test is
 * marked expected-to-fail; when the product writes the notice it flips to
 * "fail (gap closed? update chain-map)" in the job summary.
 */
chain("X07", async ({ asRole }) => {
  const teacher = await asRole("teacher");
  await teacher.goto(routes.teacherDash);
  const bell = await openBell(teacher);
  // Let the first inbox load land, so older notices are part of the baseline.
  await expect(bell.locator("p").first()).toBeVisible();
  const lines = () => bell.locator("p").allTextContents();
  const before = new Set(await lines());

  const student = await asRole("student");
  await askDoubt(student, `E2E X07 ${RUN_ID}: why does the incline change the normal force?`);

  // A new line about a doubt that was not there before. "The doubt was clarified" lines come
  // from other chains answering doubts and are not the notice this chain is about.
  await expect
    .poll(async () => (await lines()).filter((t) => !before.has(t) && /doubt/i.test(t) && !/clarified/i.test(t)).length, {
      message: "teacher bell should gain a notice for the new doubt",
      timeout: NOTICE_TIMEOUT,
    })
    .toBeGreaterThan(0);
});
