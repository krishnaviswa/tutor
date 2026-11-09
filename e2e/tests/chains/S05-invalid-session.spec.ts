import { chain, expect } from "../../src/chains";
import { hasSessionCookie } from "../../src/chain-helpers";
import { loginViaPasswordGate } from "../../src/auth";
import { env, routes } from "../../src/env";

/**
 * S05 — same-role, student.
 * A signed-in learner whose session cookie is no longer valid is put back at the gate,
 * and the dead cookie is cleared. The API answers 401, not a server error, for a bad
 * cookie, a bad bearer header and no credentials. The learner can sign in again on the
 * same page.
 * Not covered: a token that has expired by its own clock. Minting one needs the API's
 * signing secret, which the suite does not hold.
 * (backend/app/services/auth.py decode_jwt; frontend LoginGate check.)
 */
chain("S05", async ({ asRole }) => {
  const page = await asRole("student");
  const context = page.context();
  await page.goto(routes.studentDash);
  const greeting = page.getByRole("heading", { name: /^Hi,/ });
  await expect(greeting).toBeVisible();
  const me = `${env.apiBase}/api/v1/auth/me`;
  expect((await context.request.get(me)).status(), "a valid session is accepted").toBe(200);

  // The cookie is replaced by something that is not a token.
  const [cookie] = (await context.cookies(env.apiBase)).filter((c) => c.name === "tutoros_token");
  expect(cookie, "the signed-in context should hold a session cookie").toBeTruthy();
  await context.clearCookies({ name: "tutoros_token" });
  await context.addCookies([{ ...cookie, value: "not-a-real-token" }]);

  expect((await context.request.get(me)).status(), "a bad cookie is refused as unauthorised").toBe(401);
  const bearer = await context.request.get(me, { headers: { authorization: "Bearer not-a-real-token" } });
  expect(bearer.status(), "a bad bearer token is refused as unauthorised").toBe(401);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /^Hi,/ })).toHaveCount(0);
  await expect.poll(() => hasSessionCookie(page), { message: "the dead cookie should be cleared" }).toBe(false);

  // No cookie at all: the same gate, and the API says "sign in" with a 401.
  expect((await context.request.get(me)).status(), "no credentials is refused as unauthorised").toBe(401);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  // Signing in again on the same page opens the dashboard.
  await loginViaPasswordGate(page, routes.studentDash, "student");
  await expect(greeting).toContainText(env.studentDisplayName.split(" ")[0]);
  expect((await context.request.get(me)).status(), "the new session is accepted").toBe(200);
});
