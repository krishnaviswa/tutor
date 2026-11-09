# E2E test plan

Date: 2026-11-01. Runner: Playwright, Chromium, folder `e2e/`. Intended behavior is defined in `application-flow-map.md`: catalog + demo gold. The suite does not change product code to pass.

## How to run

Frontend on port 3000 and FastAPI on port 8000, Postgres seeded. Then, from the repo root:

```powershell
cd e2e
npm install
npx playwright install chromium
npx playwright test --grep @smoke
npx playwright test --grep @flow
```

Or `npm run e2e:smoke`, `npm run e2e:flows`, `npm run e2e` from the repo root (requires `e2e/node_modules`).

HTML report: `e2e/playwright-report/`. Failures also keep a trace, screenshot, and video under `e2e/test-results/`.

## Environment

| Variable | Example (public local seed) | Use |
|---|---|---|
| `E2E_BASE_URL` | `http://127.0.0.1:3000` | Playwright `baseURL` |
| `E2E_API_BASE` | `http://127.0.0.1:8000` | Only for the webServer health URL (`/openapi.json`) |
| `E2E_WORKSPACE_ID` | exam-prep id in `e2e/.env.example` | Workspace `<select>` |
| `E2E_OTP_CODE` | `000000` | Mock OTP. No mailbox. |
| `E2E_DEMO_PASSWORD` | value in `backend/app/services/auth.py` `DEMO_PASSWORD` | Password gate only |
| `E2E_*_USERNAME` / `E2E_*_PHONE` / `E2E_*_EMAIL` | exam-prep seed | One per role |
| `E2E_STUDENT_DISPLAY_NAME` | `Aarav Sharma` | Roster row |

Copy `e2e/.env.example` to `e2e/.env`. Shell env wins over the file. Do not commit `.env`.

## Assumptions

- Base URL is the local Next dev server, not a hosted environment.
- All five roles have demo logins in the exam-prep seed. Tests do not invent users except by creating a uniquely named student or enquiry through the UI.
- OTP is mockable. Magic link does not need an inbox because the API returns the token.
- Exam-prep teacher entry may skip `staff-login`. Smoke still signs the teacher in **on** `staff-login`, because that catalog screen must work, and also covers the teaching hub after it.
- Password sign-in is an extra local door. It is asserted where the gate is what a logged-out visit actually shows. It is not treated as the catalog happy path.
- Workers = 1. Writes share one database. Names include a timestamp. Paying an invoice can settle the shared open invoice; the next run must accept the settled copy.
- `@smoke` is the gate. `@flow` is the business expansion. A failure is an app defect unless a locator was wrong.
- Screens not in the catalog are not test targets (`/operator` is only noted).
- Subject-specific presets are failures, not fixtures to lean on.

## Priority

| Level | Meaning | In this pass |
|---|---|---|
| P0 | Cannot enter, cannot stay out, wrong role sees owner tools, or a core write is dead | Smoke login, role homes, sign-out, plus the permission flows that guard those |
| P1 | A business journey is wrong or misleading (enroll, schedule, pay, attendance, admin, raw errors, exam-board UI) | `@flow` |
| P2 | Empty/loading polish, hard-coded roster columns, catalog `status` drift, sample inbox copy | Covered when a flow already opens the screen; not a separate 50-screen crawl |

Order if time is short: sign-in → enrollment → scheduling → payment → attendance → admin. That is the order of the `@flow` file after the permission file. Smoke always runs first.

## P0 smoke (`@smoke`)

| Test | Journey | Asserts |
|---|---|---|
| product home opens the role router | Anonymous | `/` → `/app/student/router`, “Choose a door”, four links |
| student door opens the catalog student sign-in | Anonymous | `student-login`, heading, phone, digit 1, Verify, Magic link |
| parent door opens parent-link behind a sign-in | Anonymous | `parent-link` URL and “Sign in” |
| student phone OTP | Student | URL `/app/student`, heading `Hi,`, student nav |
| student magic link | Student | Same dashboard |
| wrong OTP | Student | Stays on `student-login`, alert mentions the code, alert does **not** contain `401` |
| empty OTP | Student | “Enter the 6-digit code.”, no navigation |
| teacher staff OTP | Teacher | `teacher-dash`, “Class Attendance”, faculty nav |
| owner staff OTP | Owner | “Faculty access”, “Active students”, owner nav |
| assistant staff OTP | Assistant | Teaching hub shows “Class Attendance” |
| parent OTP | Parent | “Family Overview”, parent nav |
| wrong password | Owner gate | Stays on “Sign in”, alert visible, scorecard hidden |
| student opens practice | Student | Practice URL, “Daily Practice” and “Topic Practice Sets”, Back returns `Hi,` |
| student dashboard survives a reload | Student | Greeting still there after reload |
| teacher opens the week calendar | Teacher | Schedule URL, “This week”, “+ New session” |
| owner opens billing | Owner | Billing URL, “Billing”, “Issue invoice” |
| parent opens fees | Parent | Payments URL, fees heading |
| assistant opens the sessions register | Assistant | Schedule, then Sessions, “Sessions Register” tab |
| sign out | Student | Router, token gone, `/app/student` shows Sign in, Back does not restore `Hi,` |

Each test signs in itself. None depends on another test’s data.

## P1 flows (`@flow`)

| Test | Journey | Happy / failure | Asserts |
|---|---|---|---|
| student stays signed in after opening owner | Student permission | Failure path | Owner scorecard absent, token still present, `Hi,` on return |
| assistant cannot open the owner console | Assistant permission | Failure path | “Sign in” on `/app/admin`, no “Faculty access”; teaching hub still works after |
| owner on the teaching hub sees attendance | Owner on faculty UI | The gate already admits them, so the hub must load | No alert, “Class Attendance” |
| protected pages lead with the one-time code | Teacher gate | Catalog auth | “Verify & Continue” visible, password value empty |
| unmodified reports sign-in does not enter a console | Parent/teacher shared URL | One-click account mix-up | Clicking Sign in on the form as rendered stays on Sign in |
| session token is an httpOnly cookie | Any | README §8 | `localStorage` key `tutoros_token` is null after OTP |
| password gate signs the owner in when typed | Owner | Extra door | “Faculty access”, username field gone |
| profile presets are subject-neutral | Teacher profile | Product constraint | No option text NEET UG, JEE Advanced, or CBSE |
| teacher adds a student | Enrollment | Happy | “Save student”, new row, no alert |
| roster joined column | Enrollment | Data | Seeded student Joined cell is not an em dash |
| teacher creates a session | Scheduling | Happy | Title filled, time moved off the seeded Tuesday 18:30 collision to 07:15, title visible on the week, no alert |
| teacher saves attendance | Attendance | Happy | “Mark All Attended” enabled, “Saved”, no alert |
| student pays the open tuition invoice | Payment | Happy | Wait until “Pay …” is visible, consequence preview is visible, click it, “Paid” shows, the Pay button is gone |
| owner saves an enquiry | Admin / enrollment | Happy | Status contains “saved”, no alert |
| empty enquiry | Admin validation | Failure | No success status; name field still shown |

## Form validation

| Case | Where | Expected |
|---|---|---|
| OTP length ≠ 6 | `student-login` | Inline “Enter the 6-digit code.” |
| OTP value ≠ stub | `student-login` | Stay put. Human sentence. Not `401 {…}`. |
| Password mismatch | Owner gate | Stay on Sign in. No scorecard. |
| Enquiry name and phone empty | Owner console | Browser required fields block submit. No “saved” status. |
| Schedule with no cohort | `schedule` | “No cohort yet…” (not automated; seed has a cohort) |
| 1-on-1 with no student | `schedule` | “Pick a student…” (not automated this pass) |

## Navigation and permissions

- Anonymous `/` and the four doors: smoke.
- Student must not remain on, or be signed out by, `owner`.
- Assistant must not pass the owner gate. Catalog `owner.who` is the owner.
- Parent reaches fees, reports, chat, and activity by the parent nav. Fees is automated. Reports’ logged-out form is automated. Chat content is not a write this pass.
- Teacher Students nav is `roster` at `/app/admin/roster` (shared id, not a second screen).
- Faculty Library nav is `library` at `/app/student/library` (same id).
- Exam-prep teacher door skips `staff-login` on purpose. `staff-login` is still tested directly.

## States not fully automated

| State | Why |
|---|---|
| Loading | Asserted only as “content replaces it.” No slow-network throttle this pass. |
| Empty roster / empty calendar | Would require deleting seed. Not done. |
| Empty message list | Code shows sample threads instead of an empty line. Recorded from code. Forcing an empty inbox would need a fresh workspace. |
| Error banner on the hub | Comes out of the assistant/owner dashboard tests if the API 403s. |
| Duplicate submit | Enquiry button sets `enquiryBusy`. Not double-clicked. Schedule create is single-click. |
| Refresh | Student dashboard reload is in smoke. |
| Back | Student practice Back, and sign-out Back, are in smoke. |

## Data mechanism

No Playwright global setup seed. The API’s existing `seed_all` is the fixture. Tests only insert uniquely named students, sessions, and enquiries through the UI. They do not call the database. They do not reset Postgres (that would race a shared dev server).

## Deferred on purpose

- All 50 screens rendered once (no crawl).
- `language-1on1` and `music` tenants.
- Live Meet, WhatsApp, Razorpay, real OTP SMS.
- File upload on the whiteboard and profile photo.
- Faculty-access checkbox toggles (they change another user’s nav and are easy to leave half-toggled).
- “Run renewals” and “Issue invoice” clicks (they mint shared invoices). The billing page is opened and the button is shown; issue/renew stay deferred.
- Firefox and WebKit. Chromium only.
- CI on push or pull request. There is a **manual** workflow only: `.github/workflows/e2e-chains.yml` (`workflow_dispatch`). See “Chain suite” below.

## Chain suite (added 2026-11-08)

Workflow chains are listed in `e2e/chain-map.json`: 36 same-role (S01–S36) and 19 cross-role (X01–X19), with the files each touches and any known product gap. Built so far (11 of 55): **S01** (student sign-in, wrong code, reload, sign-out, re-login), **S02** (student magic link: unknown email, wrong role, own email, reload, sign-out), **S04** (owner password gate: wrong password and unknown username give the same sentence, another role is told so, owner opens the console), **S05** (a dead session cookie puts the learner back at the gate and is cleared; the API answers 401, not a server error; not covered: a token that has expired by its own clock), **S25** (assistant and student are stopped at the owner console and the teacher-only Doubts and Records pages, the assistant's menu has no Doubts or Records, an owner-only API answers 403), **S03** (staff wrong code, a role the person does not hold, sign-in and sign-out for teacher, assistant, owner), **S26** (owner enquiry: empty, saved, reused phone refused), **X02** (teacher cancels a 1-on-1), **X03** (teacher starts a class), **X08** (teacher answers a doubt; student sees the notice and the answer), **X12** (owner enrols a student; teacher finds them on the roster). X02, X03 and X08 check the student's and parent's bells in their own browsers without a reload. **X07** (student asks a doubt; teacher is told) is built and marked as a known gap: the product writes no in-app notice for the teacher yet, so the test is expected to fail and the job summary shows "known gap".

| Project | What | Notes |
|---|---|---|
| `setup` | Signs each role in once through `student-login` / `staff-login` | Saves `e2e/.auth/<role>.json` (gitignored) |
| `chains` | One test per chain id | Cross-role chains open one browser context per role. No retries. |
| `layout` | Every page route at 375 / 768 / 1280 px | Horizontal scroll, overlapping controls or text, clipped text, controls off screen. Report-only unless `LAYOUT_STRICT=1`. `detector.spec.ts` proves the detector fails on a broken page. |
| `chromium` | The smoke + flow suite above | Unchanged |

Route guard: with `E2E_ROUTE_GUARD=1` (suite `all` or `layout-only`), every `frontend/app/**/page.tsx` route except `/operator` must be opened by some test, or the run fails.

Known gaps (`knownGap` in the map) are product gaps, not test failures: the test is expected to fail and the summary says “known gap”. Failures listed in `e2e/baseline.json` are labelled “pre-existing”.

Change impact: `node e2e/scripts/impact.mjs [base]` lists the chains a diff touches and prints the `--grep` to run only those.

Workflow inputs: `suite` (all, same-role, cross-role, role, chain, layout-only, existing), `role`, `chain_id`, `layout_strict`, `extra_args`. The job summary has a table per chain type, layout findings, and route coverage. Artifacts: HTML report, traces, screenshots, Playwright log, API and web logs. GitHub only offers **Run workflow** once this file is on the default branch.
