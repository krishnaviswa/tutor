# Defect report — handoff

Date of the first run: 2026-11-01. The findings below are the original evidence. They are **addressed** in the product as of the same day. Fix notes: `docs/e2e/fix-log-auth.md` (D-001–D-008, D-013, D-016, D-017) and `docs/e2e/fix-log-content.md` (D-009–D-012, D-014, D-015, D-018).

Verification after those fixes: `npx playwright test` was **31 passed, 3 failed**. The three failures were the suite, not the app: 07:15 was already taken (the screen showed “That slot conflicts with another class.”), the class-record save matched two “Saved” texts, and the seed invoice was already paid. Those tests were corrected. A rerun of the three passed. Full-suite total after that correction: **34 passed**.

One console note, not a failed test: saving the class record logs a React warning about two children with the same key. The save still shows “Saved · Published to N student feeds”.

## Handoff

1. Read `docs/e2e/application-flow-map.md` for roles, catalog ids, and routes. Intended behavior is catalog + demo gold. Wired divergence is a defect.
2. Each id below is stable (`D-001` …). Severity is P0 / P1 / P2.
3. **Runtime** findings were executed in Playwright (Chromium). Paths are under `e2e/test-results/` and `e2e/playwright-report/`. Do not commit those folders. They can contain a bearer token in a trace; do not paste tokens into commits or chat.
4. **Code inspection** findings are marked **not yet executed**. They are not failed tests.
5. “Test defects fixed during authoring” are locator and timing mistakes in the suite. They are not app bugs.
6. Fix the app. Do not weaken a test to match the broken behavior unless this report says the assertion itself was wrong.

## Run summary

| Item | Value |
|---|---|
| Command | `cd e2e` then `npx playwright test` |
| Also | `npm run e2e` from the repo root, after `npm install` in `e2e/` |
| Date | 2026-11-01 |
| Browser | Chromium, 1 worker, retries off |
| Base URL | `http://127.0.0.1:3000` |
| API | `http://127.0.0.1:8000` (already running; Playwright reused it) |
| Full suite | **34 tests: 20 passed, 14 failed, 0 skipped** (about 6.3 minutes) |
| HTML report | `e2e/playwright-report/index.html` (overwritten again by the two follow-up commands below) |

Smoke (`@smoke`, 19 tests): **16 passed, 3 failed**. The three failures are D-001, D-005 (OTP), and D-005 (password message).

Flows (`@flow`, 15 tests): **4 passed, 11 failed** on that full run.

Follow-up, same day, after correcting two tests (not the app):

- `npx playwright test -g "pays the open"` — **passed**. The student paid the open ₹4,500 invoice. The full-run failure was a race (see test defects).
- `npx playwright test -g "creates a session"` at 07:15 — **passed**. Create works on a free slot. The full-run failure is D-012 (default slot + raw conflict text).

Counting those two follow-ups as passes, the suite would be **22 passed, 12 failed**. The 12 are the runtime rows below except D-012 and D-013, which were seen in the failing schedule attempt and in its network log. D-012’s test no longer fails. The defect is still real.

### What passed (so a fix does not need to rediscover it)

Student OTP, student magic link, empty OTP client check, teacher OTP into the teaching hub, owner OTP into the owner console, parent OTP into Family Overview, student Practice and Back, student reload, teacher Schedule (“This week”), owner Billing (“Issue invoice” visible), parent Fees, assistant Sessions register, sign-out (router, token gone, protected page shows Sign in, Back does not restore the greeting), roster add student, owner enquiry save (“Enquiry saved.”), empty enquiry blocked, reports one-click Sign in did **not** enter a console (because the password API returns 401, not because the field is empty).

## Test defects fixed during authoring

These were suite bugs. They are fixed in `e2e/`. They are not in the defect list.

- `getByLabel("Phone")`, `getByLabel("Email")`, and `getByLabel("Title")` also matched `<select>`s whose options say “Custom phone / email...” or “Custom title…”. Locators are now the textbox with an exact name.
- The faculty and owner sidebars are `complementary` landmarks (`aside` aria-label), not `navigation`. The section-tab `<nav>` name merely contains “Owner console”. Journeys now use the complementary landmark.
- `getByRole("alert")` includes the empty Next.js route announcer. Assertions use alerts that contain text.
- The payment test called `count()` before the invoice button rendered, then a regex matched two loading strings at once. It now waits for `Pay …`, checks the consequence preview, and clicks.
- The schedule test assumed the form’s default Tuesday 18:30 was free. The seed already has a class then. The test now chooses 07:15.

## App defects

### D-001 — Assistant teaching hub returns “module off”

- **Severity:** P0
- **Role / journey:** Assistant sign-in, then the teaching hub (`teacher-dash`).
- **Screen / route:** `teacher-dash` `/app/faculty/teacher-dash`
- **Evidence:** Runtime. Screenshot `e2e/test-results/smoke-login--smoke-Sign-in-ca214-P-lands-on-the-teaching-hub-chromium/test-failed-1.png`. Trace `e2e/test-results/smoke-login--smoke-Sign-in-ca214-P-lands-on-the-teaching-hub-chromium/trace.zip`.
- **Steps:** Open `/app/faculty/staff-login`. Role = Teaching Assistant. Workspace = Coaching exam-prep. Phone = the assistant seed phone. OTP = the mock code. Sign in.
- **Expected:** “Class Attendance” and the rest of the teaching hub, same job the teacher sees. The sidebar already lists Dashboard, Schedule, Practice, Doubts, and Records for this user.
- **Actual:** URL is the teaching hub and the sidebar is the faculty console (name “Rohan Deshmukh”), but the page shows `404 {"detail":"module off"}`. “Class Attendance” never appears. The same user can still open Schedule and the Sessions register (that smoke journey passed).
- **Console / network:** The visible alert is the 404 body. `GET /api/v1/teacher/dashboard` is gated by module `E2` in `MODULE_FOR_PATH_PREFIX`. `_g1` turns a missing per-staff module into 404 “module off” (`backend/app/api/v1/deps.py`). `staff_allowed_modules` (`backend/app/services/internal_v2.py`) supplies that list for teacher and assistant.
- **Diagnosis:** API failure (module gate) plus frontend wiring (the Dashboard nav item has no `module`, so it stays visible when E2 is off).
- **Suspected files:** `backend/app/api/v1/deps.py` (`_g1`, prefix `/api/v1/teacher/dashboard`), `backend/app/api/v1/extras.py` (`teacher_dash`, `require_roles("teacher")` only), `frontend/lib/nav.ts` (`FACULTY_NAV` Dashboard item), `frontend/components/wired/TeacherDashScreen.tsx`, `frontend/components/AppChrome.tsx`.
- **What a fix should prove:** After assistant OTP, the hub shows “Class Attendance” and no alert. If the owner has turned the hub off for that person, the sidebar must not offer Dashboard, and the page must say so in a sentence, not a status code.

### D-002 — Assistant is inside the owner console; owner APIs then 403

- **Severity:** P0
- **Role / journey:** Assistant, open the owner console.
- **Screen / route:** `owner` `/app/admin`
- **Evidence:** Runtime. Screenshot `e2e/test-results/flows-permissions--flow-Pe-f9616-nnot-open-the-owner-console-chromium/test-failed-1.png`. Trace `e2e/test-results/flows-permissions--flow-Pe-f9616-nnot-open-the-owner-console-chromium/trace.zip`.
- **Steps:** Sign in as the assistant on `staff-login`. Go to `/app/admin`.
- **Expected:** Catalog `owner.who` is the owner. The assistant should see Sign in or a refusal, and should still be able to open the teaching hub afterward. “Faculty access” must not render.
- **Actual:** Sign in is gone. The landmark is “Owner console”. The brand line reads as the assistant with the word “owner”. “Faculty access” is on the page. Two alerts say `403 {"detail":"forbidden"}` (owner APIs such as faculty-access and the console).
- **Console / network:** 403 with detail `forbidden` on the owner endpoints the screen calls.
- **Diagnosis:** Frontend wiring. `LoginGate` `ACCEPT.owner` is `["owner", "assistant"]`, and `frontend/app/app/admin/page.tsx` does not pass a narrower `accept`. The APIs correctly use `require_roles("owner")`.
- **Suspected files:** `frontend/components/LoginGate.tsx` (`ACCEPT`), `frontend/app/app/admin/page.tsx`, `frontend/components/wired/OwnerScreen.tsx`, `backend/app/api/v1/owner.py`.
- **What a fix should prove:** An assistant JWT on `/app/admin` does not show “Faculty access” or the scorecard. Their teaching session is still valid on `/app/faculty/teacher-dash`.

### D-003 — Owner is admitted to the teaching hub and the hub API returns 403

- **Severity:** P1
- **Role / journey:** Owner opens the teaching hub.
- **Screen / route:** `teacher-dash` `/app/faculty/teacher-dash`
- **Evidence:** Runtime. Screenshot `e2e/test-results/flows-permissions--flow-Pe-089d2-g-hub-sees-class-attendance-chromium/test-failed-1.png`. Trace `e2e/test-results/flows-permissions--flow-Pe-089d2-g-hub-sees-class-attendance-chromium/trace.zip`.
- **Steps:** Owner OTP via `staff-login` (that part works; the owner console test passed). Then open `/app/faculty/teacher-dash`.
- **Expected:** Because the gate already lets the owner through, the hub shows “Class Attendance” and no error. Otherwise the gate should not admit them.
- **Actual:** Alert text `403 {"detail":"forbidden"}`. “Class Attendance” is absent. The sidebar still says Faculty console for Vikram Nair.
- **Console / network:** `GET /api/v1/teacher/dashboard` is `require_roles("teacher")` only.
- **Diagnosis:** API failure mismatched with the frontend allow-list (`ACCEPT.teacher` includes `owner`).
- **Suspected files:** `backend/app/api/v1/extras.py` (`teacher_dash`), `frontend/components/LoginGate.tsx`, `frontend/app/app/faculty/teacher-dash/page.tsx`, `frontend/components/wired/TeacherDashScreen.tsx`.
- **What a fix should prove:** An owner who can open this URL sees “Class Attendance”, or the URL sends them back to `/app/admin` with their session intact and no raw 403.

### D-004 — Seeded password sign-in returns 401

- **Severity:** P1
- **Role / journey:** Owner, password gate on the owner console (the form every protected page shows when logged out).
- **Screen / route:** `owner` `/app/admin`. Same form component on every `LoginGate` page.
- **Evidence:** Runtime. Screenshot `e2e/test-results/flows-permissions--flow-Pe-c94a6--when-the-password-is-typed-chromium/test-failed-1.png`. Trace `e2e/test-results/flows-permissions--flow-Pe-c94a6--when-the-password-is-typed-chromium/trace.zip`.
- **Steps:** Open `/app/admin` with no token. Username = the exam-prep owner username from seed. Password = `DEMO_PASSWORD` in `backend/app/services/auth.py` (also the initial React state in `LoginGate`). Workspace = Coaching exam-prep. Click Sign in.
- **Expected:** “Faculty access” and “Active students”. OTP as the same user already reaches that console.
- **Actual:** Stays on Sign in. Red text: `401 {"detail":"unknown username or password"}`. The owner console’s own scorecard, when reached by OTP, says `Sign-in: otp, magic` (no password method), which matches this rejection.
- **Console / network:** `POST /api/v1/auth/password` → 401, body `{"detail":"unknown username or password"}`. Browser console: failed to load resource 401.
- **Diagnosis:** Auth/session. The client offers a password the running seed does not accept. `seed.py` only fills `password_hash` when it is empty; a database created before that column was populated, or a hash that does not match `DEMO_PASSWORD`, fails closed. The UI still leads with that password.
- **Suspected files:** `backend/app/api/v1/auth.py` (`password_login`), `backend/app/services/seed.py` (hash fill), `backend/app/services/auth.py` (`password_matches`), `frontend/components/LoginGate.tsx`.
- **What a fix should prove:** Typing the documented demo password for the owner username on Coaching exam-prep opens the owner console. A wrong password stays on Sign in with a sentence, not `401 {…}`.

### D-005 — Sign-in failures are shown as HTTP status plus JSON

- **Severity:** P1
- **Role / journey:** Student OTP failure, and any password-gate failure.
- **Screen / route:** `student-login` `/app/student/student-login`, and `LoginGate` on `owner` `/app/admin` (same pattern on every gate).
- **Evidence:** Runtime.
  - OTP: `e2e/test-results/smoke-login--smoke-Sign-in-d69e6-e-failure-in-plain-language-chromium/test-failed-1.png` and `trace.zip` in that folder.
  - Password: `e2e/test-results/smoke-login--smoke-Sign-in-8e38d-owner-gate-stays-on-Sign-in-chromium/test-failed-1.png` and `trace.zip` in that folder.
- **Steps (OTP):** On student sign-in, set the six digits to `111111`. Verify.
- **Steps (password):** On `/app/admin`, username = owner, password = a string that is not the demo password. Sign in.
- **Expected:** Stay on the sign-in screen. The alert is a sentence (the empty-OTP path already does this: “Enter the 6-digit code.” and that test passed). No status code.
- **Actual:** OTP alert text is `401 {"detail":"bad otp"}`. Password text is `401 {"detail":"unknown username or password"}`, and `LoginGate` renders that string twice (once under the password button, once inside “Local demo code”).
- **Console / network:** `POST /api/v1/auth/otp/verify` 401 `bad otp`. `POST /api/v1/auth/password` 401 as above.
- **Diagnosis:** Validation / frontend wiring. `frontend/lib/api.ts` throws `` `${status} ${body}` ``. `StudentLoginScreen` and `LoginGate` put `err.message` into the page. `apiDetail` in `frontend/components/wired/bits.tsx` already knows how to pull `detail` and is not used here.
- **Suspected files:** `frontend/lib/api.ts`, `frontend/components/wired/StudentLoginScreen.tsx`, `frontend/components/LoginGate.tsx`, `frontend/components/wired/bits.tsx`.
- **What a fix should prove:** A bad code and a bad password each show one human sentence and no `401`. The empty-code case still shows “Enter the 6-digit code.”

### D-006 — Protected pages lead with a filled password, not the one-time code

- **Severity:** P1
- **Role / journey:** Logged-out teacher (and every other `LoginGate` page, including parent Reports and Chat).
- **Screen / route:** `teacher-dash` `/app/faculty/teacher-dash`. Same component on `reports`, `messages`, `owner`, and the other gated routes.
- **Evidence:** Runtime. The password field’s value was the demo password before the test typed anything. Screenshot `e2e/test-results/flows-permissions--flow-Pe-68478--code-not-a-filled-password-chromium/test-failed-1.png`. Trace in that same folder.
- **Steps:** With no token, open `/app/faculty/teacher-dash`. Do not open “Local demo code”.
- **Expected:** Demo gold and catalog `student-login` / `staff-login`: the 6-digit code is the primary control (“Verify & Continue” or “Verify”). The password box is empty if it exists at all. README §8: no student password in v1.
- **Actual:** Heading “Sign in”. Username and password are filled (teacher username, demo password). “Verify & Continue” is inside a closed `<details>` labeled “Local demo code”.
- **Diagnosis:** Frontend wiring against catalog/demo gold.
- **Suspected files:** `frontend/components/LoginGate.tsx` (initial `password` state, password `<form>` above the OTP `<details>`).
- **What a fix should prove:** A logged-out visit to the teaching hub shows the one-time code without an extra click, and the password field is empty. One click on Sign in does not submit a prefilled teacher password. Parent Reports (`/app/faculty/reports`) must not default the username to the teacher.

### D-007 — Opening the owner console signs the student out

- **Severity:** P1
- **Role / journey:** Student opens a screen their role cannot use.
- **Screen / route:** `owner` `/app/admin`, then back to `student-dash` `/app/student`.
- **Evidence:** Runtime. `localStorage` key `tutoros_token` was `null` after the owner URL. Screenshot `e2e/test-results/flows-permissions--flow-Pe-e81d5-d-in-on-their-own-dashboard-chromium/test-failed-1.png`. Trace in that folder.
- **Steps:** Student OTP until “Hi,” is visible. Open `/app/admin`. Then open `/app/student`.
- **Expected:** The owner scorecard is not shown. The student is still signed in and “Hi,” is visible again.
- **Actual:** The owner scorecard is not shown (that part held). The token is removed. `LoginGate` calls `clearToken()` when `/auth/me` role is not in the allow-list.
- **Diagnosis:** Auth/session.
- **Suspected files:** `frontend/components/LoginGate.tsx` (the `if (!ok) clearToken()` branch).
- **What a fix should prove:** After the student visits `/app/admin` and returns to `/app/student`, the greeting is visible and they do not have to enter the code again.

### D-008 — Session is a bearer token in localStorage

- **Severity:** P1
- **Role / journey:** Any successful OTP sign-in. Observed as the student.
- **Screen / route:** `student-dash` `/app/student` after `student-login`.
- **Evidence:** Runtime. The test read `localStorage` key `tutoros_token` and got a JWT string (not copied here). Screenshot `e2e/test-results/flows-permissions--flow-Pe-8dc98-nly-cookie-not-localStorage-chromium/test-failed-1.png`. Trace in that folder.
- **Steps:** Complete student OTP. Read `localStorage` key `tutoros_token`.
- **Expected:** README §8: httpOnly JWT plus refresh. Script on the page cannot read the token.
- **Actual:** The key holds the bearer token. `frontend/lib/api.ts` sends `Authorization: Bearer`. There is no refresh call in `frontend/lib/session.ts`. Sign-out only removes the key and navigates to the router (that part works; the logout smoke passed).
- **Diagnosis:** Auth/session.
- **Suspected files:** `frontend/lib/session.ts`, `frontend/lib/api.ts`, `backend/app/services/auth.py` (`issue_session` returns the token in JSON).
- **What a fix should prove:** After OTP, `localStorage` does not contain the token, a reload still shows “Hi,”, and sign-out still forces Sign in on `/app/student`.

### D-009 — Profile presets are exam-board labels on every workspace

- **Severity:** P1
- **Role / journey:** Teacher opens their profile. The same presets are in the component for every tenant.
- **Screen / route:** `profile` `/app/faculty/profile`
- **Evidence:** Runtime. A button named “NEET UG” was present (count 1). Screenshot `e2e/test-results/flows-permissions--flow-Pe-b927a-presets-are-subject-neutral-chromium/test-failed-1.png`. Trace in that folder.
- **Steps:** Teacher OTP. Open `/app/faculty/profile`. Look at Expertise and Subjects.
- **Expected:** Subject-neutral workspace. Biology / NEET / NCERT is an example tenant pack, not a control on the profile form. Board and exam names are not preset chips.
- **Actual:** Expertise chips include “NEET UG” and “JEE Advanced”. Subjects include “Biology” (and Physics, Chemistry, Mathematics). For a student, the Board `<select>` is CBSE, ICSE, IB, IGCSE, State Board (`BOARD_OPTIONS`). The teacher view hides Board; the constants are still in the module.
- **Diagnosis:** Frontend wiring. Not a seed-data accident.
- **Suspected files:** `frontend/components/wired/ProfileScreen.tsx` (`EXPERTISE_PRESETS`, `SUBJECT_PRESETS`, `BOARD_OPTIONS`, `GRADE_OPTIONS`).
- **What a fix should prove:** On Coaching exam-prep and on a non-exam workspace, the profile page has no button or option whose name is NEET UG, JEE Advanced, or CBSE. The teacher can still save phone, address, and expertise as free or tenant-defined choices.

### D-010 — The default class record has an empty attendance roll

- **Severity:** P1
- **Role / journey:** Teacher marks attendance.
- **Screen / route:** `record` `/app/faculty/record`
- **Evidence:** Runtime. The page text included `(0/0 marked)`. “Mark All Attended” was not in the accessibility tree (it is rendered only when `rows.length > 0`). Screenshot `e2e/test-results/flows-business--flow-Enrol-d9fe3--and-saves-the-class-record-chromium/test-failed-1.png`. Trace in that folder.
- **Steps:** Teacher OTP. Open `/app/faculty/record`. Leave the session dropdown on the first class (“Vectors & Relative Motion — Live Class”).
- **Expected:** The roll lists the students on that class. “Mark All Attended” is enabled. Save Class Record then shows “Saved”.
- **Actual:** Step 2 says `(0/0 marked)`. There is no Mark All button. Save Class Record is on the page. `rows` is built only from `session.student_ids` or `session.student_id`, not from the cohort’s membership (`RecordScreen`).
- **Diagnosis:** Frontend wiring (roll source). Possibly also the session payload omitting cohort student ids (data state). Confirm which when fixing; the visible result is an empty roll on a seeded live class.
- **Suspected files:** `frontend/components/wired/RecordScreen.tsx` (`rows` useMemo), the session JSON from `GET /api/v1/sessions` and `GET /api/v1/sessions/{id}/record` (`backend/app/api/v1/sessions.py`).
- **What a fix should prove:** The teacher opens the record for a seeded class that has students and sees those names, can click Mark All Attended, and after Save Class Record sees “Saved” with no alert.

### D-011 — Roster “Joined” is always an em dash

- **Severity:** P2
- **Role / journey:** Teacher views the roster (enrollment list).
- **Screen / route:** `roster` `/app/admin/roster`
- **Evidence:** Runtime. The Joined cell on the Aarav Sharma row was the em dash. Screenshot `e2e/test-results/flows-business--flow-Enrol-2d8af-hen-a-seeded-student-joined-chromium/test-failed-1.png`. Trace in that folder. Adding a new student **did** work (that test passed).
- **Steps:** Teacher OTP. Open `/app/admin/roster`. Read the Joined column for the seeded student.
- **Expected:** A date, or a real empty state if the API has no join time. Not a hard-coded dash for every row. Status is also hard-coded `"active"` in the same map.
- **Actual:** Joined cell text is `—`.
- **Diagnosis:** Frontend wiring.
- **Suspected files:** `frontend/components/wired/RosterScreen.tsx` (the Joined `<td>` and `const status = "active"`).
- **What a fix should prove:** Aarav Sharma’s Joined cell is not an em dash, and a newly saved student shows a join time after refresh.

### D-012 — Default new-session slot reports “teacher conflict” as raw API detail

- **Severity:** P2
- **Role / journey:** Teacher creates a session from the form’s default Tuesday 18:30.
- **Screen / route:** `schedule` `/app/faculty/schedule`
- **Evidence:** Runtime on the full-suite attempt (artifacts replaced when a later 07:15 run passed). The alert paragraph was exactly `teacher conflict`. The week already showed “Math Algebra · Vishruth K” at 18:30. Moving only +15 minutes still conflicted. Choosing 07:15 created the class and the title appeared (follow-up passed).
- **Steps:** Teacher OTP. Schedule. “+ New session”. Leave the start time. Create session.
- **Expected:** Either the occupied slot is not the default, or the alert is the sentence already written in code: “That slot conflicts with another class.” A free time still creates the class (that part works).
- **Actual:** Alert text is `teacher conflict`. `explainSessionError` returns `detail` as soon as it parses JSON, so the later branch that maps “teacher conflict” to the sentence never runs.
- **Console / network on that page (even when create later succeeded):** `GET /api/v1/notifications/inbox` → 404 `{"detail":"module off"}` (see D-013). `GET /api/v1/topics` → 404 `{"detail":"Not Found"}` (see D-014). Browser console: “Failed to load resource” for those 404s.
- **Diagnosis:** Validation.
- **Suspected files:** `frontend/components/wired/ScheduleScreen.tsx` (`explainSessionError`, default `startsLocal`), session create in `backend/app/api/v1/sessions.py`.
- **What a fix should prove:** Submitting the occupied default slot shows “That slot conflicts with another class.” and does not show the raw detail. A free slot still shows the new title on the week.

### D-013 — The shell always calls the notification inbox, which 404s “module off”

- **Severity:** P1
- **Role / journey:** Teacher (and any signed-in shell) loads a page that mounts the bell. Observed while scheduling.
- **Screen / route:** `schedule` `/app/faculty/schedule` (the call is in the shell, so it is not limited to this id).
- **Evidence:** Runtime network log from the schedule attempt: `404 GET /api/v1/notifications/inbox` body `{"detail":"module off"}`. **Not** the assertion that failed the test. The visible schedule alert was D-012.
- **Steps:** Sign in as the teacher. Open Schedule. Watch `/api/v1/notifications/inbox`.
- **Expected:** The unread control loads notices, or it is hidden when module D5 is off. No 404 in the console.
- **Actual:** `ShellControls` and `ClassNotices` call the inbox unconditionally. The route is prefixed with module `D5` in `MODULE_FOR_PATH_PREFIX`. Missing D5 becomes 404 “module off”.
- **Diagnosis:** API failure plus frontend wiring.
- **Suspected files:** `frontend/components/ShellControls.tsx`, `frontend/components/studio/ClassNotices.tsx`, `backend/app/api/v1/deps.py` (prefix `/api/v1/notifications`), `backend/app/api/v1/extras.py` (`notifications_inbox`).
- **What a fix should prove:** A teacher page load does not log a 404 for the inbox. If notices are off, the bell is absent or says there are no notices, in a sentence.

### D-014 — Schedule calls `/api/v1/topics`, which 404s

- **Severity:** P2
- **Role / journey:** Teacher opens the new-session form.
- **Screen / route:** `schedule` `/app/faculty/schedule`
- **Evidence:** Runtime network log from the same schedule attempt: `404 GET /api/v1/topics` body `{"detail":"Not Found"}`. The screen catches the error (`api(...).catch(() => [])` in `ScheduleScreen`), so the form still opens. **Not yet a failed assertion of its own.**
- **Expected:** Topic presets load, or the form does not call a missing route.
- **Actual:** The route is not registered (FastAPI “Not Found”, not “module off”).
- **Diagnosis:** API failure.
- **Suspected files:** `frontend/components/wired/ScheduleScreen.tsx` (topics fetch), `backend/app/api` routers (no `/topics` match found from the 404).
- **What a fix should prove:** Opening “+ New session” does not produce a 404 for `/api/v1/topics`.

### D-015 — Empty message list is replaced by two sample threads

- **Severity:** P2
- **Role / journey:** Anyone opening Chat when the thread API returns an empty list. Parent nav “Chat” and faculty messages share this screen.
- **Screen / route:** `messages` `/app/faculty/messages`
- **Evidence:** Code inspection. **Not yet executed.** A seeded workspace may already have threads, which hides this branch (`shown = threads.length ? threads : samples`).
- **Steps:** Sign in as a parent or teacher in a workspace with no threads. Open `/app/faculty/messages`.
- **Expected:** An empty state. No fake conversation.
- **Actual in code:** `samples` are two threads (“Could we revisit the last example before Thursday?”, “I sent the notes from today’s session.”) shown as if they were real.
- **Diagnosis:** Frontend wiring / data state.
- **Suspected files:** `frontend/components/wired/MessagesScreen.tsx` (`samples`, `shown`).
- **What a fix should prove:** With an empty `/api/v1/threads` response, the page does not show those two sentences.

### D-016 — Assistant can open attendance and doubts the API will reject

- **Severity:** P1
- **Role / journey:** Assistant uses Records or Doubts from the faculty sidebar. The sessions register itself **did** load for the assistant (smoke passed). This row is the write/read APIs behind the other links.
- **Screen / route:** `record` `/app/faculty/record`, `doubt-teacher` `/app/faculty/doubt-teacher`
- **Evidence:** Code inspection. **Not yet executed** as a click. The gate is the teacher allow-list, which includes assistant. The record routes are `require_roles("owner", "teacher")` only (`get_record`, `patch_record`). The doubt queue is `require_roles("owner", "teacher")`.
- **Expected:** If the sidebar shows Records and Doubts, those pages load for the assistant. If the product excludes the assistant, the sidebar hides the links.
- **Actual in code:** The links stay. The APIs 403.
- **Diagnosis:** Frontend wiring mismatched with API roles. Same family as D-001 and D-003.
- **Suspected files:** `frontend/lib/nav.ts`, `frontend/components/LoginGate.tsx`, `backend/app/api/v1/sessions.py` (record get/patch), `backend/app/api/v1/comms.py` (`doubt_queue`).
- **What a fix should prove:** The assistant opens Records and either marks a roll, or does not see the Records link. They do not see a raw 403.

### D-017 — A failed `/auth/me` is treated as a student or a parent

- **Severity:** P2
- **Role / journey:** Any dual-role screen using `RoleChrome`, and `parent-link` after the gate.
- **Screen / route:** Shared ids such as `library`, `messages`, `timeline`, `roster`; also `parent-link`.
- **Evidence:** Code inspection. **Not yet executed.** `SignOutButton` even comments on this.
- **Expected:** A failed `/auth/me` shows Sign in.
- **Actual in code:** `RoleChrome` sets role `"student"` in the `catch`. `ParentLinkBody` sets role `"parent"` in the `catch` and then shows the accept form.
- **Diagnosis:** Auth/session.
- **Suspected files:** `frontend/components/RoleChrome.tsx`, `frontend/components/wired/ParentLinkScreen.tsx` (`ParentLinkBody`), `frontend/components/SignOutButton.tsx`.
- **What a fix should prove:** With a token that `/auth/me` rejects, `library` and `parent-link` show Sign in, not the student shell or the guardian accept form.

### D-018 — Catalog `status` is still `shell` for all 50 screens

- **Severity:** P2
- **Role / journey:** Anyone trusting `catalog/screens.json` as the wiring status.
- **Screen / route:** Every id. The routes themselves respond; this is documentation drift.
- **Evidence:** Code inspection. **Not yet executed** as a test. `grep` of `"status"` in `catalog/screens.json` is `shell` on every row. README says the screens are wired. The Playwright run loaded real hub, billing, roster, and fees UI.
- **Expected:** Status matches the wired app, or the field is not used as a gate.
- **Actual:** Every row says `shell`.
- **Diagnosis:** Data state (catalog metadata).
- **Suspected files:** `catalog/screens.json`. Regenerating the catalog is a product decision; do not invent ids.
- **What a fix should prove:** A reader of `catalog/screens.json` does not conclude the Next pages are empty shells.

## Counts

| Severity | Runtime (executed) | Code inspection (not yet executed) |
|---|---|---|
| P0 | D-001, D-002 | — |
| P1 | D-003, D-004, D-005, D-006, D-007, D-008, D-009, D-010, D-013 | D-016 |
| P2 | D-011, D-012, D-014 | D-015, D-017, D-018 |

Runtime 14. Code inspection 4. Total 18.

D-012 and D-014 are runtime observations from the schedule attempt. Their tests are not currently red: D-012 was avoided by picking 07:15, and D-014 is swallowed by the screen.
