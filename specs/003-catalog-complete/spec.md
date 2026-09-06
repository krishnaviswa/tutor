# spec.md — 003-catalog-complete

| Field | Value |
|---|---|
| **Status** | Specified (Architect artifacts written; implement blocked until HTML guide + human OK) |
| **Role** | PM (specify + clarify) |
| **Feature directory** | `specs/003-catalog-complete` |

## Why

001 mapped TutorOS as a clickable architecture pack (closed 47 screens, layers, ports). 002 made the **spine feel live**: durable tenant-scoped rows, three seeded workspaces, auth stub, roster/cohort, one teaching write (`record`) → `timeline_events`, parent hub reads, quota meters. Demo HTML stayed UI gold. Next.js was not built. Fifty-one catalog APIs remain `planned`. Seventeen entities remain `later`. All 47 screens remain `empty`.

Humans asked for the **remaining catalog-complete product as one Spec Kit feature** — one spec, one plan, one task list, then an **interactive HTML implementation guide** (master `plan-viewer.html` plus satellite pages), then implement only after they approve that guide. The HTML is the README-equivalent for chief architects and leads: functional jobs, technical stack, and the end-to-end implementation sequence. That is larger than a normal Spec Kit slice and larger than 002’s closed vertical. This spec still does **not** invent screens, subjects, or vendors. It specifies wiring **existing** catalog ids: remaining APIs, remaining entities, and a Next.js app with one route per existing screen.

001 is not rewritten and is not implemented. 002 is not rewritten: its tests, mock ports, and spine behaviour are **protected**. The first work in this feature is to prove 002 still holds (Tester + converge + Accept), then extend.

## User stories

1. **As** an operator of the repo, **I want** every 002 acceptance test to stay green before and after later 003 work, **so that** tenant isolation, record→timeline, quotas, parent-link, and mock-only ports are never silently regressed.
2. **As** an operator, **I want** a documented local environment (Python API, optional Docker Postgres, Node for the UI) **so that** the remaining product can run without treating deploy as the goal.
3. **As** a teacher, **I want** to attach a session video link and have students enter through existing `join` **so that** the Meet/Teams URL is not the attendance source of truth.
4. **As** a teacher and a student, **I want** existing `live-teacher` / `live-student` and in-session engagement on the catalog screens **so that** a class can be delivered through the platform with mock video.
5. **As** a teacher, **I want** after-class `session-video` to open the recording/link on the existing screen **so that** playback is a screen, not a new id — transcript stays empty until STT (out of scope).
6. **As** a teacher, **I want** `library` and `lesson` to persist content items per workspace **so that** materials hang off tenant topics, not a syllabus table.
7. **As** a teacher, **I want** `assign-issue` and `assign-grade` to persist assignments and submissions **so that** homework is durable in the workspace.
8. **As** a teacher, **I want** `qbank`, `practice-build`, `practice-play`, and `practice-result` to persist questions, sets, and attempts **so that** practice is a real loop, not an empty parent-hub stub.
9. **As** a teacher, **I want** `test-setup`, `test-runner`, and `analysis` to persist tests and remediation actions **so that** the exam-prep arrangement can close the practice loop.
10. **As** a student and a teacher, **I want** `doubt-student` and `doubt-teacher` to persist doubts **so that** questions after class are a queue, not a chat channel pretending to be the ledger.
11. **As** a teacher, parent, or student with rights, **I want** `messages` threads to persist **so that** 002’s empty threads stub becomes real data on the same screen id.
12. **As** a teacher or owner, **I want** `announce` to persist workspace announcements **so that** broadcasts are catalogued events that may also notify via mock channels after a timeline write.
13. **As** a student, teacher, and owner, **I want** `student-dash`, `teacher-dash`, and existing `owner` to show live aggregates from this workspace **so that** dashboards are not a second database.
14. **As** an owner or teacher, **I want** `reports` export and `mentor` backlog booking **so that** progress work uses existing screens.
15. **As** an owner, **I want** `branding`, `billing`, `payments`, `payouts`, `audit`, `onboard-kind`, `template-gallery`, `automation`, and `integrations` to use persisted catalog entities **so that** business and config jobs exist without new screens. Student checkout stays mock-port.
16. **As** a parent, **I want** `parent-home` child screens (`timeline`, `reports`, `practice-result`, `payments`, `messages`, `notif-prefs`) to show real rows when those modules exist in the child’s workspace **so that** the hub is still a slice of the child record, not a second gradebook.
17. **As** anyone using the app URL, **I want** Next.js routes for every existing catalog screen id **so that** UI gold in the demo can be wired (`empty` → `shell` → `wired`) without a 48th screen. Exam-prep faculty still must not be forced through `staff-login`.
18. **As** an owner, **I want** notification preferences to persist on `notif-prefs` **so that** teacher/parent/admin channels can be chosen; student WhatsApp stays owner-gated default off.
19. **As** an operator, **I want** catalog, README, and architecture HTML updated in the same Accept change when screens, APIs, or tables change **so that** the product map stays true.
20. **As** a chief architect or lead, **I want** a master interactive HTML guide with complete navigation (functional map, technical map, sequenced implementation steps, task plan) **so that** I can review every catalog piece and every build phase before any 003 application code is written.

## Acceptance criteria

1. **Given** the 002 suite (`isolation`, `record`→timeline, quotas/RBAC, parent hub, `live_calls == 0`), **when** any 003 change lands, **then** those tests still pass; a failure stops the phase and is reported before further tasks.
2. **Given** two workspaces A and B, **when** a signed-in person acts in A, **then** they cannot read or mutate 003 business rows that belong to B (every new business table is workspace-scoped).
3. **Given** this feature, **when** anyone lists screens, routes, or demo keys, **then** only ids already in `catalog/screens.json` appear — no 48th screen.
4. **Given** vendor edges, **when** the app runs locally or in CI, **then** ports are mock by default; no live Meta, Google, or Razorpay calls. Failed channel send does not roll back `timeline_events`.
5. **Given** `tutor-platform-demo.html`, **when** a Next.js screen is built, **then** the demo remains UI gold until that screen is `wired`; catalog/architecture follow the demo; incomplete demo tracks are not filled by inventing ids. Exam-prep omits mandatory `staff-login`; faculty teaching starts at `cohort-builder` / `schedule`.
6. **Given** 001-platform-architecture, **when** 003 is specified or implemented, **then** 001 artifacts are not rewritten as a new architecture pack and `/speckit.implement` is not run on 001.
7. **Given** 002-sim-spine, **when** 003 starts, **then** Tester + converge + PM Accept for 002 happen without expanding 002’s slice; 002 routers stay; no `/sim/login` or other invented paths.
8. **Given** the seventeen catalog entities still marked `later`, **when** 003 data work completes, **then** each exists as a workspace-scoped table (or equivalent spine row) and catalog `tier` is updated on Accept — no syllabus, exam-board, or Biology tables.
9. **Given** the fifty-one catalog APIs still `planned`, **when** 003 backend work completes, **then** each path is implemented under `/api/v1` with catalog ids only; 002 `sim` routes remain; unimplemented invention is forbidden.
10. **Given** a teaching or practice write that should notify, **when** it succeeds, **then** the ledger write is `timeline_events` first; WhatsApp/email/push stay mock channels for teacher, parent, admin; student WhatsApp stays owner-gated default off; QuotaGuard still warns at 80% and blocks **paid sends** at 100% with `block` without turning off always-on core.
11. **Given** Next.js, **when** the UI ships, **then** there is one App Router route per existing catalog `route` / screen id; roles `owner` | `teacher` | `assistant` | `student` | `parent`; missing G1 module still yields **404**, not 403.
12. **Given** parent hub, **when** practice, invoices, messages, and prefs tables exist, **then** `parent-home` children show that child’s rows in workspace A only — not another family, not workspace B.
13. **Given** `join` / live screens, **when** a student enters a session, **then** attendance is recorded by the platform join/record path, not by trusting the video URL.
14. **Given** STT, **when** `session-video` or `record` is opened, **then** the transcript panel stays empty; no fake captions.
15. **Given** Spec Kit, **when** someone runs `/speckit.implement` for 003, **then** it is refused until this spec is Specified, Architect artifacts exist, tasks exist, **`plan-viewer.html` exists**, and a human has OK’d that HTML in chat.
16. **Given** Accept, **when** screens, APIs, tables, or ports changed, **then** the same change updates README, catalog, and architecture HTML (regenerated from demo where required).
17. **Given** optional local Postgres, **when** `DATABASE_URL` points at Compose Postgres, **then** the same models run; unit tests may stay on in-memory SQLite. Engine choice is not a product SKU.
18. **Given** Biology / NEET / NCERT files under `docs/examples/`, **when** 003 ships, **then** they remain example-only; seeds stay job arrangements (exam-prep, language 1-on-1, music), not a Biology product.
19. **Given** the HTML implementation guide (`plan-viewer.html` and satellites), **when** a lead reviews before implement, **then** they can navigate functional jobs, technical contracts, and sequenced E2E steps covering all 47 screens, catalog APIs, and entities — documentation only, not the running app.

## Out of scope

- `/speckit.implement` on 001-platform-architecture
- Rewriting or replacing 002 spine behaviour
- Live Meta, Google Meet, Razorpay, Stripe, FCM, or other production vendors in CI
- Inbound WhatsApp replies
- Real STT / hosted transcription (table/slot may exist; no fake captions)
- Figma
- Inventing screen ids or `/sim/*` API ids
- Syllabus tables, exam-board modules, Biology-as-product domain
- Making `staff-login` mandatory on exam-prep
- Production hosting / deploy as a goal (Docker/Postgres allowed only to enable a working local build)
- Skipping Spec Kit or implementing before HTML plan approval

## Clarify (closed)

- **One giant feature by human request.** Remaining catalog (entities + APIs + Next.js for 47 existing ids) is Specified here. Internal phase gates still apply: a failing 002 test stops the next phase.
- **HTML plan gate.** After tasks, the first deliverable is an interactive HTML suite: master `plan-viewer.html` plus satellites for functional map, technical map, and sequenced E2E steps. Implement is blocked until a human approves that guide in chat. It is documentation, not the app.
- **001 vs 002 vs 003.** 001 = architecture pack (Specified, no implement). 002 = spine sim (protected; Tester + Accept first). 003 = remaining catalog-complete product.
- **Demo stays gold.** Wire existing ids. Incomplete focused tracks are allowed; do not invent screens to fill them.
- **Mock default.** Simulate vendors; do not call them. Timeline is the ledger.
- **Parent hub.** Same six child screen ids; empty stubs become real rows when those entities exist.
- **Human OK** for implement is the HTML viewer approval, plus Architect Specified + tasks.

## DoD (PM)

- [x] User stories + numbered AC above
- [x] Clarify closed (folded into this spec)
- [x] Architect: `plan.md` + checklist + analyze
- [x] Tasks (`tasks.md`)
- [x] `plan-viewer.html` master + satellite HTML (functional, technical, sequence)
- [ ] Human OK on the HTML guide (blocks `/speckit.implement`)
- [ ] `/speckit.implement` (Builder; only after HTML OK)
- [ ] Tester + PM Accept
