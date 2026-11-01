# Application flow map

Date: 2026-11-01. Source of routes: `catalog/screens.json` and `frontend/lib/catalog-screens.ts`. This map describes the wired Next.js app and where it diverges from catalog and demo gold.

## Decision: what “intended” means

When the demo HTML, the catalog, and the wired app disagree, **catalog + demo gold are the intended behavior**. A wired divergence is a defect candidate, not a new requirement.

- Demo `WHY` for `student-login`: phone OTP by default, email magic link optional, **no password in v1**. `staff-login` uses the same OTP / magic link. README §8 matches that (OTP `000000`, magic link, JWT).
- README also says exam-prep faculty is **not** forced through `staff-login`. The router sending “I’m a teacher” to `teacher-dash` on an exam-prep workspace is intended. The password form on that page is not what the catalog login screens specify.
- A password door exists in code (`POST /api/v1/auth/password`, seed password in `backend/app/services/auth.py`). Tests may drive it. It is not the catalog sign-in.
- There is **no self-serve signup screen**. People enter through OTP, magic link, or the password gate. Enrollment is a staff or owner action (roster, owner enquiry).
- Biology / NEET / NCERT is the example tenant pack, not product behavior. Exam-board labels baked into every workspace’s profile UI are a defect candidate.
- `/operator` is an operator jump list. It is **not** a catalog screen id. Do not add tests that treat it as one.
- Catalog `status` is still `shell` on all 50 rows. README says the screens are wired. Treat the JSON status as stale documentation, not as “the page is empty.”

## Roles

| Role | Seed username (exam-prep) | Phone | Home after OTP | Chrome |
|---|---|---|---|---|
| `owner` | `vikram` | `+9101o` | `/app/admin` (`owner`) | `AppChrome` admin |
| `teacher` | `sudhakshina` | `+9101t` | `/app/faculty/teacher-dash` | `AppChrome` faculty |
| `assistant` | `rohan` | `+9101a` | `/app/faculty/teacher-dash` | `AppChrome` faculty |
| `student` | `aarav` | `+9101s` | `/app/student` (`student-dash`) | `PhoneChrome` |
| `parent` | `rajesh` | `+9101p` | `/app/parent` (`parent-home`) | `ParentChrome` |

Other seeded workspaces exist (`language-1on1` prefix `+9102`, `music` prefix `+9103`). This pass uses **exam-prep** only. Display names: Vikram Nair, Sudhakshina, Rohan Deshmukh, Aarav Sharma, Rajesh Sharma.

`LoginGate` (`frontend/components/LoginGate.tsx`) default allow-list when a page does not pass `accept`:

| Gate `role` prop | JWT roles allowed through |
|---|---|
| `teacher` | teacher, owner, assistant |
| `owner` | owner, **assistant** |
| `assistant` | assistant, owner |
| `student` | student |
| `parent` | parent |

A JWT whose role is not in the list is **deleted** (`clearToken`) and the password form is shown. That is harsher than a refusal.

Several pages override `accept` (roster, schedule, sessions, library, timeline, payments, messages, reports, profile, parent-link, lesson, practice-result, notif-prefs). Owner pages such as `/app/admin` do **not** override it, so the assistant allow-list above applies.

## Screens

One App Router page per catalog id. Frame in the catalog is `phone` or `web`; the wired page chooses chrome from the component, not from that field alone.

| Id | Route | Catalog role bucket | What the wired page is for |
|---|---|---|---|
| `router` | `/app/student/router` | student | Public door picker. `/` redirects here. |
| `student-login` | `/app/student/student-login` | student | OTP digits or magic link. Any demo persona. |
| `staff-login` | `/app/faculty/staff-login` | faculty | OTP or magic link plus a role select. |
| `wsetup` | `/app/admin/wsetup` | admin | Workspace setup. Owner gate. |
| `branding` | `/app/admin/branding` | admin | Branding. Owner gate. |
| `roster` | `/app/admin/roster` | admin | Students, cohorts, add / import / parent invite. Teacher, owner, assistant. |
| `cohort-builder` | `/app/faculty/cohort-builder` | faculty | Cohort editor. Teacher gate (owner and assistant also pass). |
| `parent-link` | `/app/parent/parent-link` | parent | Parent accepts an invite. Teacher or owner mints one. |
| `parent-home` | `/app/parent` | parent | Family overview, attendance, fees slice, book a slot. |
| `schedule` | `/app/faculty/schedule` | faculty | Week calendar. Create or retimes a session. |
| `session-pre` | `/app/faculty/session-pre` | faculty | Pre-class detail. |
| `sessions` | `/app/faculty/sessions` | faculty | Register plus faculty supervision. |
| `availability` | `/app/faculty/availability` | faculty | Weekly windows. |
| `profile` | `/app/faculty/profile` | faculty | Own profile. Gate allows teacher, owner, assistant, student. Not parent. |
| `join` | `/app/student/join` | student | Waiting room / join. |
| `live-teacher` | `/app/faculty/live-teacher` | faculty | Class whiteboard. |
| `live-student` | `/app/student/live-student` | student | Student canvas. |
| `session-video` | `/app/faculty/session-video` | faculty | Video and transcript slot. |
| `record` | `/app/faculty/record` | faculty | Attendance roll and class note. |
| `library` | `/app/student/library` | student | Content library. Also the faculty “Library” nav target. Accepts student, teacher, owner, assistant. |
| `lesson` | `/app/student/lesson` | student | Lesson viewer. Also accepts teaching roles. |
| `assign-issue` | `/app/faculty/assign-issue` | faculty | Issue an assignment. |
| `assign-grade` | `/app/faculty/assign-grade` | faculty | Grade a submission. |
| `qbank` | `/app/faculty/qbank` | faculty | Question bank. |
| `practice-build` | `/app/faculty/practice-build` | faculty | Build a practice set. |
| `practice-play` | `/app/student/practice-play` | student | Student practice player. |
| `practice-result` | `/app/student/practice-result` | student | Result. Also parent, teacher, owner. |
| `test-setup` | `/app/faculty/test-setup` | faculty | Test setup. |
| `test-runner` | `/app/student/test-runner` | student | Test runner. |
| `analysis` | `/app/faculty/analysis` | faculty | Remediation board. |
| `doubt-student` | `/app/student/doubt-student` | student | Student doubt queue. |
| `doubt-teacher` | `/app/faculty/doubt-teacher` | faculty | Teacher triage. |
| `messages` | `/app/faculty/messages` | faculty | Threads. Accepts all five roles. Parent nav “Chat” lands here. |
| `announce` | `/app/faculty/announce` | faculty | Announcements. |
| `timeline` | `/app/student/timeline` | student | Record log. All five roles. Parent “Activity” and student “You”. |
| `notif-prefs` | `/app/student/notif-prefs` | student | Notification preferences. Student, parent, teacher, owner. |
| `student-dash` | `/app/student` | student | Student home. |
| `teacher-dash` | `/app/faculty/teacher-dash` | faculty | Teaching hub. |
| `owner` | `/app/admin` | admin | Owner scorecard, faculty-access toggles, new enquiry. |
| `reports` | `/app/faculty/reports` | faculty | Reports. Teacher, owner, parent. Parent nav “Reports”. |
| `mentor` | `/app/faculty/mentor` | faculty | Mentor / backlog. |
| `billing` | `/app/admin/billing` | admin | Issue invoices, run renewals. Owner gate. |
| `payments` | `/app/student/payments` | student | Fees and receipts. Student and parent. Parent nav “Fees”. |
| `subscription` | `/app/admin/subscription` | admin | Plan and usage. |
| `payouts` | `/app/admin/payouts` | admin | Payouts. |
| `audit` | `/app/admin/audit` | admin | Audit log. |
| `onboard-kind` | `/app/admin/onboard-kind` | admin | Tutoring-kind setup. |
| `template-gallery` | `/app/admin/template-gallery` | admin | Template gallery. |
| `automation` | `/app/admin/automation` | admin | Automation rules. |
| `integrations` | `/app/admin/integrations` | admin | Integrations. |

Not a catalog id: `/` (redirect to `router`), `/operator` (jump list).

## User journeys

### Open the app

1. `GET /` redirects to `/app/student/router`.
2. Four links: learn → `student-login`; teacher → `teacher-dash` when the workspace kind is exam-prep, otherwise `staff-login`; parent → `parent-link`; owner → `owner`.
3. Exam-prep still shows a text link to `staff-login` (“other staff sign-in”).
4. Expected: each door reaches the matching sign-in or, for exam-prep teachers, the teaching console’s own gate. Catalog `router.shows` says the app routes to the matching sign-in. The extra owner door is wired; catalog copy still says three doors.

### Sign in (catalog screens)

**Student OTP** (`student-login`): choose persona, workspace, phone, six digits, Verify. Mock code is always the configured OTP (`000000` locally). Success stores a bearer token and `router.replace`s to the role home above.

**Magic link:** same screen, “Magic link”, email, “Send magic link”. The API returns a token immediately. No inbox step. That matches the mock port, not a production mailbox.

**Staff OTP** (`staff-login`): role select, phone, one OTP field, Sign in. Same destinations.

**Password gate** (every `LoginGate` page, not the catalog login screens): Username, Password, Workspace, Sign in. OTP is behind “Local demo code”. Password calls `POST /api/v1/auth/password`. The form’s initial password state is the demo password.

Wrong OTP: stay on the login screen, show an error. Empty OTP: “Enter the 6-digit code.” before the API. Wrong password: stay on Sign in, do not show the console.

### Sign out

`SignOutButton` and the faculty/owner header button call `clearToken()` and `window.location.assign('/app/student/router')`. There is no server logout. Expected after that: router is visible, `localStorage` has no token, and opening `student-dash` shows Sign in. Back must not restore the signed-in dashboard.

README §8 says the session is an **httpOnly JWT plus refresh**. The wired app stores `tutoros_token` in `localStorage` and sends `Authorization: Bearer`. No refresh call is in `frontend/lib/session.ts`.

### Student

Home shows “Hi, {name}”, next class, practice, doubts. Nav: Home, Classes (`library`), Practice (`practice-play`), Doubts, You (`timeline`). A meaningful read is Practice → “Daily Practice” / “Topic Practice Sets”, then Back to the greeting. Fees are `payments` (not in the five-tab nav; reachable from You’s match list only if a child screen links there — the nav destination for You is `timeline`). Direct route `/app/student/payments` is the fee journey.

### Teacher

Teaching hub: cohort title or “Faculty Teaching Hub”, Class Attendance, practice, doubts, follow-ups, next classes. Nav: Dashboard, Schedule, Whiteboard, Availability, Students (`roster`), Practice (`qbank`), Doubts, Records (`record`), Library, Profile. Schedule opens “This week” and “+ New session”. Create session posts `/api/v1/sessions` and the title should appear on the week. Records opens “Attendance & Class Record”, “Mark All Attended”, “Save Class Record”.

### Assistant

Same teaching console as the teacher (OTP destination and `LoginGate` allow it). Catalog does not give the assistant the owner console. Schedule and sessions list are the safe journey if the hub data call fails.

### Parent

Router → `parent-link`, which is behind a parent password gate, then “Accept & Link Child Account” (invite token is prefilled from mocks). OTP as the parent persona skips that and opens `parent-home`: “Family Overview”, child card, attendance, lesson pack, “Book Slot” when hours exist. Nav: Home, Activity (`timeline`), Reports, Fees (`payments`), Chat (`messages`).

### Owner

Owner console: workspace name, “Faculty access” checkboxes, scorecard (“Active students”, revenue, quotas), “+ New Student Enquiry”. Save enquiry posts `/api/v1/owner/enquiries` and should show a saved confirmation. Billing nav: “Billing”, “Issue invoice”, “Run renewals”.

### Enrollment

No public signup. Two wired writes:

- Roster “+ Add student” → name, optional phone → “Save student” → row appears (`POST /api/v1/students`).
- Owner “+ New Student Enquiry” → name, phone, pack size → “Save enquiry” → creates a student and a lesson pack.

Joined column on the roster is rendered as a literal em dash for every row (`RosterScreen`).

### Scheduling

`schedule`: “+ New session”, title, start (IST), cohort or 1-on-1 student, “Create session”. Empty cohort shows “No cohort yet — create one before scheduling.” 1-on-1 without a student shows “Pick a student for the 1-on-1.”

### Payment

`payments`: “Tuition Fees, Lesson Pack & Receipts”, consequence preview, “Pay ₹…” calls `POST /api/v1/payments/checkout` with the invoice id as `Idempotency-Key`. Parent is allowed by the gate and by `require_roles("student", "parent")`. Settled state copy: “All invoices settled” or “No fee invoices on file yet.”

### Attendance

`record`: pick a session, mark the roll, read the lesson-pack hour preview, “Save Class Record”. API get/patch of the record allows **owner and teacher only**, not assistant. The page gate still admits assistant (teacher allow-list).

`sessions` “Faculty Supervision & Roll Audit” is a second attendance surface (`FacultyAdminPanel`).

### Admin

Owner nav: Owner console, Billing, Reports, Cohorts (`roster`), Schedule, Records (`audit`), Integrations, Profile. Faculty-access toggles call `PUT /api/v1/owner/faculty-access/{id}`. That API is owner-only.

## Dependencies

| Dependency | Local value |
|---|---|
| UI | Next.js `frontend` on port 3000 (`npm run dev`) |
| API | FastAPI `backend` on port 8000, prefix `/api/v1` |
| Database | Compose Postgres `postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros`. pytest SQLite is not the running API. |
| Seed | `seed_all` on API startup, or `python -m app.seed_cli --reset` |
| CORS | `allow_origins=["*"]` in `backend/app/factory.py` |
| OTP | `settings.otp_code`, default `000000`. No SMS inbox. |
| Magic link | Mock email port. Token returned in the JSON body. |
| Password | Seeded for every demo user. Same demo password. |
| Payments, Meet, WhatsApp | Mock ports. Checkout does not call Razorpay. |

Frontend API base: `NEXT_PUBLIC_API_BASE` or `http://127.0.0.1:8000` (`frontend/lib/api.ts`).

## Test data needs

- exam-prep workspace id `aaaaaaaa-0001-4000-8000-000000000001`.
- Five identities above. Emails `owner@exam-prep.sim`, `teacher@exam-prep.sim`, `assistant@exam-prep.sim`, `student@exam-prep.sim`, `parent@exam-prep.sim`.
- At least one cohort and one scheduled session (seed provides them) so schedule create and attendance save have a target.
- At least one student row (Aarav Sharma) so the roster is not empty.
- An open invoice if a pay click should be observable. If the invoice was already paid by an earlier run, the fees page should show the settled state instead of failing.
- New students and sessions created by tests use a unique `E2E … {timestamp}` name so they do not depend on each other.
- Enquiry phones must be unique. `Identity.kind=phone` is globally unique (`create_enquiry` returns “phone already used”).

Tests read these through `e2e/.env`. See `e2e/.env.example`. Do not copy tokens into docs.

## Known risk areas (seen in code before the Playwright run)

These are defect candidates. Runtime confirmation is in `docs/e2e/defect-report.md`.

1. **Password-first gate vs catalog OTP.** `LoginGate` leads with username/password and hides OTP in `<details>`. Demo and `student-login` / `staff-login` lead with the code.
2. **Demo password is the initial value of the password input** (`useState("TutorDemo1")` in `LoginGate`). One click on a prefilled teacher form signs in as the teacher.
3. **Reports, messages, and other shared pages set `role="teacher"`**, so the prefilled username is the teacher even when parent is in `accept`. Parent nav “Reports” and “Chat” use those routes.
4. **Assistant is on the owner allow-list** (`ACCEPT.owner` includes `assistant`) and `/app/admin` does not narrow it. Catalog `owner.who` is the owner. Owner APIs use `require_roles("owner")`, so the UI can admit an assistant into a console whose calls 403.
5. **`GET /api/v1/teacher/dashboard` is `require_roles("teacher")` only.** The teaching-hub gate admits owner and assistant. Their hub request fails and the screen shows the error instead of Class Attendance.
6. **Session record GET/PATCH is owner+teacher.** Assistant can open `record` and not save attendance.
7. **Doubt queue is owner+teacher.** Assistant nav still has Doubts.
8. **Wrong role clears the JWT** instead of leaving the user on their own home.
9. **Token in `localStorage`**, not an httpOnly cookie. No refresh flow in the client.
10. **Roster “Joined” is hard-coded “—”.** Status is hard-coded “active”.
11. **Profile presets** include CBSE / ICSE / IB and “NEET UG” / “JEE Advanced” for every tenant (`ProfileScreen`).
12. **Message empty state renders two sample threads** (`MessagesScreen` `samples`) when `/threads` is empty, so the empty state looks like a real inbox.
13. **Auth errors are thrown as `` `${status} ${json}` ``** (`frontend/lib/api.ts`). `StudentLoginScreen` puts that string in `Err`. `apiDetail()` exists and is not used there, so the learner sees a status code.
14. **`RoleChrome` and `ParentLinkBody` treat a failed `/auth/me` as student or parent** instead of sending the user to sign-in.
15. **Catalog `status` is `shell` for every screen** while the UI is wired. Documentation drift.
16. **Enquiry success copy** falls back to “Enquiry saved.” The API returns `student_id` / `hours`, not `detail`. The fallback is fine if it stays visible.

## Out of this map’s execution

Live vendors, WhatsApp delivery, speech-to-text, and a real mailbox are mock or absent. They are not failed UI tests. `language-1on1` and `music` tenants are not driven in this pass.
