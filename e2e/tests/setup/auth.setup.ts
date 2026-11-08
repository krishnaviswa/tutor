import fs from "fs";
import path from "path";
import { test as setup } from "@playwright/test";
import { loginViaStaffOtp, loginViaStudentOtp } from "../../src/auth";
import { authFile, contextOptions, type ChainRole } from "../../src/chains";

/**
 * Signs each role in once per run through the real sign-in screens, then saves the
 * session (httpOnly cookie) for the chain and layout projects. Students and parents use
 * `student-login`; staff use `staff-login`.
 */
const ROLES: ChainRole[] = ["student", "parent", "teacher", "assistant", "owner"];

for (const role of ROLES) {
  setup(`sign in ${role} through the real sign-in screen`, async ({ browser }) => {
    const context = await browser.newContext(contextOptions());
    const page = await context.newPage();
    if (role === "student" || role === "parent") await loginViaStudentOtp(page, role);
    else await loginViaStaffOtp(page, role);
    const file = authFile(role);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await context.storageState({ path: file });
    await context.close();
  });
}
