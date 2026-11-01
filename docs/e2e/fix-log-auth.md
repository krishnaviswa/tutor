# Auth and access fix log

Date: 2026-11-01. Product fixes for the ids assigned to this track. `docs/e2e/defect-report.md` was not edited. No commit.

None of these ids are deferred. D-008 is implemented with the existing JWT stored as an httpOnly cookie. Spec 002 does not define a refresh endpoint, and the constitution does not require the bearer in `localStorage`, so a second refresh token was not added. The cookie is the same session JWT. Login JSON still returns `token` for API clients and pytest; the browser does not keep it.

## D-001 — fixed

Assistant OTP on the teaching hub shows “Class Attendance” and no raw alert. The seeded assistant list omitted module `E2`, which gates `GET /api/v1/teacher/dashboard`, and that route allowed only `teacher`.

- Files: `backend/app/services/seed_internal_v2.py`, `backend/app/services/seed.py` (`repair_existing_seed`), `backend/app/api/v1/extras.py`, `backend/app/api/v1/deps.py`, `frontend/lib/nav.ts`, `frontend/components/AppChrome.tsx`, `frontend/components/wired/TeacherDashScreen.tsx`
- UI now proves: with the hub on, the assistant sees “Class Attendance”. If `E2` is off for that person, Dashboard is not in the sidebar and the page says “The teaching hub is turned off for this account.”
- Existing databases pick up `E2` on the next API process start when the assistant’s module list is still the old published list. An owner who later removes `E2` is left alone.

## D-002 — fixed

An assistant JWT on `/app/admin` does not render the owner console.

- Files: `frontend/components/LoginGate.tsx` (`ACCEPT.owner` is only `owner`)
- UI now proves: the page shows Sign in. “Faculty access” is absent. Opening `/app/faculty/teacher-dash` afterward still shows “Class Attendance”. The session is not cleared.

## D-003 — fixed

The owner is admitted to the teaching hub, matching the gate that already let them open the URL.

- Files: `backend/app/api/v1/extras.py` (`teacher`, `assistant`, and `owner`)
- UI now proves: `/app/faculty/teacher-dash` shows “Class Attendance” and no alert. The owner session stays on that page.

## D-004 — fixed

The running database was created before usernames and `password_hash` were filled. `seed_all` returns once the exam workspace exists, so those fields stayed empty and password sign-in answered “unknown username or password”. OTP already worked.

- Files: `backend/app/services/seed.py` (`repair_existing_seed`, and new seeds use `DEMO_PASSWORD`), `backend/app/factory.py` (runs the repair on startup), `backend/app/services/auth.py` (length-safe compare)
- UI now proves: the published exam-prep owner username plus the documented demo password (`DEMO_PASSWORD` in `backend/app/services/auth.py`) opens the owner console. A wrong password stays on Sign in with the sentence “Unknown username or password.”
- The repair sets that password only for the seeded demo people, and only when the stored hash does not already match it.

## D-005 — fixed

Bad OTP and a bad password are sentences. The status code and JSON body are not rendered. The empty-code check is unchanged.

- Files: `frontend/components/wired/bits.tsx` (`signInError`), `frontend/components/wired/StudentLoginScreen.tsx`, `frontend/components/wired/StaffLoginScreen.tsx`, `frontend/components/LoginGate.tsx`
- UI now proves: a bad code says “That code is not valid. Check the digits and try again.” A bad password says “Unknown username or password.” Each appears once. An empty code still says “Enter the 6-digit code.”
- API `detail` strings are unchanged so existing pytest assertions still match.

## D-006 — fixed

Logged-out protected pages lead with the one-time code. The password field starts empty. The username is not prefilled, including on parent Reports.

- Files: `frontend/components/LoginGate.tsx`
- UI now proves: “Verify & Continue” is visible without opening a disclosure. The password value is empty. One click on Sign in does not send a prefilled teacher password. Reports does not default the username to the teacher.

## D-007 — fixed

A role that cannot open the page no longer clears the session.

- Files: `frontend/components/LoginGate.tsx`
- UI now proves: a student who opens `/app/admin` does not see the owner scorecard, and `/app/student` shows “Hi,” again without another code.
- E2E assertion updated in `e2e/tests/flows/permissions.spec.ts`. The old check required `localStorage` `tutoros_token` to be truthy, which contradicts D-008. It now requires that key to be null and the httpOnly cookie to still be present. The greeting assertion is unchanged.

## D-008 — fixed

The browser session is the httpOnly cookie `tutoros_token`. Page script does not write or read the JWT.

- Files: `backend/app/api/v1/auth.py` (cookie on OTP, password, and magic link when the client sends `X-TutorOS-Cookie: 1`; `POST /auth/logout`), `backend/app/api/v1/deps.py` (cookie or `Authorization`), `backend/app/factory.py` (credentialed CORS for localhost), `frontend/lib/session.ts`, `frontend/lib/api.ts`, `frontend/components/SignOutButton.tsx`, `frontend/components/AppChrome.tsx`, sign-in screens that call `/auth/me` without reading `localStorage`
- UI now proves: after student OTP, `localStorage` has no token, a reload still shows “Hi,”, and Sign out leads to Sign in on `/app/student`.
- Pytest keeps using the JSON bearer. The cookie is opt-in so those clients do not pick up a cookie jar by accident.

## D-013 — fixed

The notification inbox is module `D5`. A saved teaching-tool list does not include `D5`, so the per-person gate was turning notices off for every teacher who had a list. `D5` now follows the workspace flag only, same idea as the owner-console exception for `F2`. The shell does not call the inbox when `D5` is off.

- Files: `backend/app/api/v1/deps.py`, `backend/app/api/v1/auth.py` (`workspace_modules` on `/auth/me`), `frontend/lib/notices.ts`, `frontend/components/ShellControls.tsx`, `frontend/components/studio/ClassNotices.tsx`
- UI now proves: a teacher or assistant page does not log a 404 for `/api/v1/notifications/inbox`. When notices are off, the bell is absent and the shell says “No notices.” Class notices that cannot be loaded stay on the empty sentence, not a raw 404 body.
- Other modules still 404 from the per-person list. Assistant invoices stay 404, which `test_auth_methods_and_assistant_module_404` requires.

## D-016 — fixed

Records and Doubts stay owner/teacher on the API. The assistant is not offered those actions.

- Files: `frontend/lib/nav.ts`, `frontend/components/AppChrome.tsx`, `frontend/components/wired/TeacherDashScreen.tsx`, `frontend/app/app/faculty/record/page.tsx`, `frontend/app/app/faculty/doubt-teacher/page.tsx`
- UI now proves: the assistant sidebar has no Records or Doubts link, and the hub does not show “Mark Attendance Roll” or “Answer Doubts”. Opening `/app/faculty/record` shows Sign in, not a raw 403. The teaching session remains valid. The attendance roll itself was not changed.

## D-017 — fixed

A failed `/auth/me` is signed out.

- Files: `frontend/components/RoleChrome.tsx`, `frontend/components/wired/ParentLinkScreen.tsx`, `frontend/components/LoginGate.tsx`
- UI now proves: a token `/auth/me` rejects on `library` and `parent-link` shows Sign in. It does not show the student shell or the guardian accept form.

## Tests

Commands (in-memory SQLite; `DATABASE_URL` is set by `backend/tests/conftest.py`):

1. `python -m pytest tests/test_auth_session_defects.py tests/test_password_faculty_slides.py tests/test_006_internal_v2.py tests/test_quotas_rbac.py tests/test_005_density.py -q --tb=short`  
   Result: 25 passed, 1 failed. The failure was `test_auth_methods_and_assistant_module_404` (assistant `GET /api/v1/invoices/mine` returned 403). The per-person gate had been narrowed too far. It was put back for every module except `D5` and `F2`.

2. `python -m pytest tests/test_auth_session_defects.py tests/test_006_internal_v2.py::test_auth_methods_and_assistant_module_404 -q --tb=short`  
   Result: 7 passed.

3. `python -m pytest tests/test_auth_session_defects.py tests/test_password_faculty_slides.py tests/test_006_internal_v2.py::test_auth_methods_and_assistant_module_404 tests/test_quotas_rbac.py::test_assistant_roster_not_owner_or_record -q --tb=line`  
   Result: 11 passed.

4. Live API on `127.0.0.1:8000` (the reloaded uvicorn process, not pytest): owner password returns 200; a wrong password returns 401 with detail `unknown username or password`; assistant dashboard returns 200 with `attendance_pct`; assistant permissions include `E2`; inbox returns 200. The cookie header is `HttpOnly`.

5. Short Chromium script against `http://127.0.0.1:3000` (not `npx playwright test`): assistant hub, owner hub, owner password, student `/app/admin` then greeting, httpOnly cookie, reload, sign-out, bad OTP, and bad password all passed. A rejected token on library and parent-link shows Sign in.

No targeted test failures remain. The full Playwright suite was not run.
