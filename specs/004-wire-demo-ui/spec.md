# spec.md — 004-wire-demo-ui

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Role** | PM (specify + clarify) |
| **Feature directory** | `specs/004-wire-demo-ui` |

## Why

003 delivered catalog APIs and Next.js **shells** (one route per existing screen id). Demo HTML stayed UI gold. Humans now want a **complete local product**: those shells become `wired` against existing FastAPI `/api/v1`, using mock OTP `000000` and mock ports. 002 spine stays protected. 003 is Accepted at shell/sim and is not rewritten. Biology / NEET / NCERT remains an **example tenant pack**, not the domain.

This spec does **not** invent screens, APIs, or subjects. It specifies wiring the closed catalog set in `catalog/screens.json` (47 ids). Already wired and must be kept: `schedule`, `session-pre`, `record`, `roster`, plus `frontend/components/AppChrome.tsx` and `frontend/components/LoginGate.tsx` (extend faculty nav; reuse the gate).

Human OK to implement is this chat (single OK). Status stays Draft until Architect finishes Specified artifacts.

## User stories

### Owner

1. **As** an owner, **I want** `/` to open the role router (not a catalog index as product home), **so that** the local app feels like the product, not an operator dump of 47 ids.
2. **As** an owner, **I want** `owner`, `billing`, `subscription`, `payouts`, `audit`, and `integrations` wired to existing catalog APIs, **so that** quotas, plans, mock checkout pause, payouts, audit, and mock OAuth are usable in the workspace I own.
3. **As** an owner, **I want** onboarding screens `wsetup`, `onboard-kind`, `template-gallery`, `branding`, and `automation` wired, **so that** a new tenant can name the workspace, pick a job arrangement (not a syllabus), brand it, and see automation rules — without new screen ids.
4. **As** an owner, **I want** `reports` export and `mentor` backlog booking on existing screens, **so that** progress work uses the timeline-backed record, not a second gradebook.
5. **As** an owner, **I want** exam-prep faculty to reach teaching without mandatory `staff-login`, **so that** the exam-prep arrangement matches the demo.

### Teacher

6. **As** a teacher, **I want** `teacher-dash` to show live workspace aggregates from `GET /api/v1/teacher/dashboard`, **so that** the console is not a second database.
7. **As** a teacher, **I want** faculty nav to match the demo (Dashboard, Schedule, Students, Practice, Doubts, Records, **Content** → `library`), **so that** I can reach every teaching job without invented ids.
8. **As** a teacher, **I want** `qbank`, `practice-build`, `assign-issue`, `assign-grade`, `test-setup`, and `analysis` wired, **so that** practice and tests persist in this workspace, tagged by tenant topics.
9. **As** a teacher, **I want** `doubt-teacher`, `messages`, and `announce` wired, **so that** doubts, threads, and broadcasts are ledger-adjacent jobs, not a chat pretending to be the record.
10. **As** a teacher, **I want** `join` video attach to feed `live-teacher` / `session-video` with mock Meet URLs, **so that** attendance is the platform join/record path, not the vendor URL.
11. **As** a teacher, **I want** `cohort-builder` wired to existing cohort APIs, **so that** groups exist before schedule (already wired).

### Assistant

12. **As** an assistant, **I want** roster and schedule reads in the faculty/admin chrome I am allowed, **so that** I can help operations without owner billing consoles or inventing a role screen.
13. **As** an assistant, **I want** LoginGate to accept assistant where catalog RBAC allows (roster, schedule), **so that** I am not forced through owner OTP.

### Student

14. **As** a student, **I want** `router` then `student-login` (OTP `000000`) to land on `student-dash`, **so that** one identity threads sessions, practice, doubts, and fees.
15. **As** a student, **I want** phone chrome (Home, Classes, Practice, Doubts, You) matching demo `appnav`, **so that** the student app is the demo, not the shell dump.
16. **As** a student, **I want** `student-dash`, `lesson`, `library`, `timeline`, `doubt-student`, `notif-prefs`, and `payments` wired to my catalog APIs, **so that** my hub is this workspace’s rows.
17. **As** a student, **I want** `join` → `live-student`, `practice-play` → `practice-result`, and `test-runner` wired, **so that** I can enter class and submit practice/tests; join writes attendance.
18. **As** a student, **I want** student WhatsApp to stay owner-gated default off, **so that** channel cost is not dumped on the learner cohort.

### Parent

19. **As** a parent, **I want** `parent-link` (invite token) then `parent-home`, **so that** I follow only my linked child.
20. **As** a parent, **I want** parent chrome (Home, Activity, Reports, Fees, Chat) matching demo `pnav`, **so that** Activity is `timeline`, Reports is `reports`, Fees is `payments`, Chat is `messages` — existing ids, not parent-only screens.
21. **As** a parent, **I want** those child slices to show that child’s rows in this workspace only, **so that** I never see another family or workspace B.

### Operator (repo)

22. **As** an operator, **I want** an optional operator index that is **not** a catalog screen id, **so that** I can still jump screens without making `/` the product home.
23. **As** an operator, **I want** 002 and 003 pytest to stay green after every wave, **so that** tenant isolation, record→timeline, quotas, parent hub, and `live_calls == 0` never silently regress.
24. **As** an operator, **I want** catalog `status: wired` plus README / product-viewer / work-log updated on Accept, **so that** the product map stays true.

## Acceptance criteria

1. **Given** the 002 and 003 pytest suites, **when** any 004 wave lands, **then** those tests still pass; a red suite stops that wave until fixed. No live WhatsApp, Meet, or SMS.
2. **Given** two workspaces A and B, **when** a signed-in person acts in A, **then** wired screens cannot show or mutate B’s rows.
3. **Given** this feature, **when** anyone lists screens or routes used as product surfaces, **then** only ids already in `catalog/screens.json` appear — no 48th catalog screen. An operator index (if kept) is not a catalog id.
4. **Given** `/` in the Next.js app, **when** a learner or operator opens the product home, **then** they are sent to `/app/student/router`. CatalogIndex is not the product home.
5. **Given** mock auth, **when** anyone verifies OTP, **then** the code is `000000`; vendors stay mock; JWT claims remain `sub`, `role`, `workspace_id`.
6. **Given** a gated catalog screen, **when** it is wired, **then** it uses `LoginGate` with the catalog role (owner | teacher | assistant | student | parent). Exam-prep faculty is not forced through `staff-login`.
7. **Given** student screens with `appnav`, **when** they are wired, **then** phone chrome shows Home (`student-dash`), Classes (`library`), Practice (`practice-play`), Doubts (`doubt-student`), You (`timeline`) — existing ids only.
8. **Given** parent screens with `pnav`, **when** they are wired, **then** parent chrome shows Home (`parent-home`), Activity (`timeline`), Reports (`reports`), Fees (`payments`), Chat (`messages`).
9. **Given** faculty chrome, **when** it is shown on exam-prep, **then** nav matches the demo including Content → `library`, and omits mandatory `staff-login`.
10. **Given** landings after identity, **when** OTP/link succeeds, **then** student → `student-dash`; exam-prep faculty → `schedule` or `teacher-dash`; parent → `parent-home`.
11. **Given** `join` / live / `session-video`, **when** a student enters, **then** attendance is the platform enter/record path; transcript stays empty (no fake STT). Video URLs stay mock.
12. **Given** a teaching or practice write that should notify, **when** it succeeds, **then** `timeline_events` is the ledger first; WhatsApp/email/push stay mock channels for teacher, parent, admin; student WhatsApp stays owner-gated default off.
13. **Given** demo HTML, **when** a screen is `wired`, **then** the Next.js UI follows `tutor-platform-demo.html` for that id; catalog APIs only from `catalog/apis.json` / that screen’s `apis` list. No invented paths. A minimal API fix is allowed only if the screen cannot function, and it is Tester-gated.
14. **Given** already-wired `schedule`, `session-pre`, `record`, `roster`, **when** 004 proceeds, **then** those components are not rewritten; chrome/gate may be extended (faculty Content nav) but not replaced.
15. **Given** Biology / NEET / NCERT under `docs/examples/`, **when** 004 ships, **then** they remain example-only; seeds stay job arrangements (exam-prep, language 1-on-1, music).
16. **Given** Accept, **when** screens become `wired`, **then** the same change updates `catalog/screens.json`, `README.md`, `product-viewer.html`, and `work-log.html`.

## Out of scope

- Rewriting 002 spine behaviour or 003 catalog API surface (except a Tester-gated minimal fix if a screen cannot function)
- Live Meta, Google Meet, Razorpay, Stripe, FCM, or other production vendors
- Inbound WhatsApp replies
- Real STT / fake captions
- Figma
- Inventing screen ids or API path ids
- Syllabus tables, exam-board modules, Biology-as-product
- Making `staff-login` mandatory on exam-prep
- Production hosting / deploy as the goal
- `npm audit fix --force`
- Committing to `main` / pushing to origin/main

## Clarify (closed)

- **Human OK is this chat.** Architect Specified then Builder implements immediately; do not wait between waves.
- **Waves.** Wave 0 (home redirect, PhoneChrome, ParentChrome, faculty Content nav) unblocks the rest. Waves 1–7 wire remaining catalog ids. Tester runs pytest after each wave.
- **Keep wired work.** `schedule`, `session-pre`, `record`, `roster`, AppChrome, LoginGate — keep; extend chrome/nav only.
- **Operator index.** Allowed only if it is not a catalog screen id (e.g. `/operator`).
- **Demo is gold.** Wire existing ids. Do not fill incomplete demo tracks with new ids.
- **Mock default.** OTP `000000`. Ports mock. Timeline is the ledger.

## DoD (PM)

- [x] User stories + numbered AC above
- [x] Clarify closed (folded into this spec)
- [x] Architect: `plan.md` + checklist + analyze + tasks; status Specified
- [x] Builder waves 0–7
- [x] Tester after each wave (002 + 003 green)
- [x] PM Accept: catalog `wired`, README, product-viewer, work-log
