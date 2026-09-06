# spec.md — 002-sim-spine

| Field | Value |
|---|---|
| **Status** | Accepted (protected spine; do not rewrite) |
| **Role** | PM (specify + clarify) |
| **Feature directory** | `specs/002-sim-spine` |

## Why

001-platform-architecture mapped TutorOS (subject-neutral remote tutoring OS) as a clickable system: closed screens, layers, ports, and jobs. Humans have not formally accepted that HTML pack, but they now need the architecture to **feel live** — as if it were already running on a database — without skipping Spec Kit and without authorizing a 47-screen product build.

This feature is the first **runnable local simulation of the spine**: durable rows with tenant isolation, seeded example workspaces, an auth stub so people can switch roles, timeline as the ledger, mock delivery channels, and persisted quota meters. Demo HTML stays UI gold. Wiring architecture HTML or the demo to a local service may come later; the first bar is **backend + seed feels like a live store**, not rewriting every demo screen into a new UI.

001 remains the architecture pack. 002 does not implement 001’s out-of-scope items (full app, live vendors). It also does not replace Spec Kit: specify → clarify → plan → checklist → analyze → tasks → **human OK** → implement → tester → accept (the 8-step gate).

## User stories

1. **As** an operator of the repo, **I want** a local simulation whose durable store matches the planned spine (every business row belongs to one workspace), **so that** walking the architecture feels like a running system without shipping production vendors.
2. **As** an owner, **I want** at least three seeded example workspaces — coaching / exam-prep, language 1-on-1, and music — **so that** I can switch tenants that are arrangements of jobs, not Biology as the product.
3. **As** an owner, **I want** an auth stub that lets me act as owner in a chosen workspace, **so that** I can open existing owner surfaces (`owner`, `subscription`) and see quota warn/block from persisted meters — no new screen.
4. **As** a teacher, **I want** to switch into a faculty identity in a workspace and see only role-appropriate screens from the existing 47 ids, **so that** teaching work is not mixed with the student app.
5. **As** a teacher on the exam-prep arrangement, **I want** faculty work to start at cohort / schedule (not `staff-login`), **so that** the simulation matches the demo template: exam-prep omits `staff-login`; faculty does not need that screen to begin.
6. **As** a teacher on arrangements that already include `staff-login` (1-on-1, K-12, skills, music, everything), **I want** staff entry to use that existing screen when we wire UI, **so that** we do not invent a 48th login.
7. **As** an owner or assistant with roster rights, **I want** roster and cohort membership to persist per workspace, **so that** who is enrolled is real data — the source of seats and timelines — not a disposable demo list.
8. **As** a teacher, **I want** one teaching write — session record after class (`record`) — to persist attendance/notes and append `timeline_events` for attendees in that workspace, **so that** the ledger is written by teaching, not by a chat channel.
9. **As** an assistant, **I want** to switch into the assistant role in the auth stub and work on roster (existing `roster` rights) without owner-only consoles, **so that** assistance is a real membership, not a second owner account.
10. **As** a student, **I want** to enter via existing `student-login` (stub) and read my own timeline (`timeline`), **so that** I am the subject of the ledger in my workspace only.
11. **As** a parent, **I want** `parent-home` to open only existing hub screens for linked children — `timeline`, `reports`, `practice-result`, `payments`, `messages`, `notif-prefs` — **so that** the parent hub is a slice of the child’s record, not a second gradebook or class roster.
12. **As** an owner, **I want** quota meters (F2) to persist and show warn at 80% and block paid sends at 100% when policy is block, on existing `owner` / `subscription` screens, **so that** cost caps throttle metered use without a new screen and without turning off always-on core (identity, timeline, quotas).
13. **As** teacher, parent, or owner, **I want** outbound WhatsApp / email / push to remain mock channels that may be recorded as deliveries, **so that** notifications never replace `timeline_events` as the store.

## Acceptance criteria

1. **Given** two seeded workspaces A and B, **when** a signed-in person acts in A, **then** they cannot read or mutate business rows that belong to B (tenant isolation; every business row is workspace-scoped).
2. **Given** this feature, **when** anyone lists screens, routes, or demo keys, **then** only ids already in `catalog/screens.json` appear — no 48th screen.
3. **Given** vendor edges (WhatsApp, email, push, SMS, Meet, storage, student payments), **when** the simulation runs locally or in CI, **then** ports are mock by default; no live Meta, Google, or Razorpay calls.
4. **Given** `tutor-platform-demo.html`, **when** this feature ships, **then** the demo remains UI gold (including while incomplete). If any UI is wired, it only uses existing screen ids.
5. **Given** persistence, **when** the simulation is restarted, **then** seed and subsequent writes remain in a durable store that matches spine entities (workspace-scoped business data, timeline, quotas, memberships). Engine choice is not a product requirement.
6. **Given** Spec Kit, **when** someone runs `/speckit.implement` for 002, **then** it is refused until this spec is Specified, Architect artifacts exist, tasks exist, and a human has OK’d implement. The 8-step gate is not skipped.
7. **Given** seeds, **when** I inspect example tenants, **then** I see coaching / exam-prep, language 1-on-1, and music (or equivalent job arrangements). Biology / NEET / NCERT is not required and must not be treated as the product; `docs/examples/` stays example-only.
8. **Given** the auth stub, **when** I switch among owner, teacher, assistant, student, and parent in one workspace, **then** each identity only reaches screens already catalogued for that role (closed set).
9. **Given** the exam-prep seeded workspace, **when** faculty starts teaching work, **then** they are not required to pass through `staff-login` (that template omits it; start at `cohort-builder` / `schedule`).
10. **Given** a teaching write on `record` for a session in workspace A, **when** the write succeeds, **then** `timeline_events` are appended for attendees in A only, and a later timeline read shows those events.
11. **Given** a parent linked to a child in workspace A, **when** they use `parent-home`, **then** they can open `timeline`, `reports`, `practice-result`, `payments`, `messages`, and `notif-prefs` for that child only — not another family’s child and not workspace B.
12. **Given** persisted quota meters on existing `owner` and `subscription`, **when** usage is at or above 80% / 100% with block policy, **then** the owner sees warn / block on those screens; always-on core is not turned off by a cap.
13. **Given** a mutating action that would notify people, **when** it completes, **then** the ledger write is the `timeline_event`; channel adapters stay mock and do not become the source of truth. Student WhatsApp stays owner-gated default off.
14. **Given** 001-platform-architecture, **when** 002 is specified, **then** 001 artifacts are not rewritten; 002 is the first runnable slice, not a replacement architecture pack.
15. **Given** the closed vertical slice, **when** implement is later allowed, **then** in-scope behaviour is: durable spine + seeds + auth stub + roster/cohort persistence + one teaching write (`record`) + timeline read + parent hub read + quota read. It is **not** implementing all 47 screens as a new UI.
16. **Given** pointing architecture HTML and/or the demo at a local service, **when** this feature’s first bar is judged, **then** success is “backend + seed feels like a live store”; full HTML rewrite is not required in 002.

## Out of scope

- Implementing all 47 screens as React / Next.js
- Live Meta, Google Meet, Razorpay, or other production vendors
- Inbound WhatsApp replies
- STT / hosted transcription
- Figma
- Syllabus tables, exam-board modules, or Biology-as-product domain
- Replacing or re-scoping 001-platform-architecture (HTML pack stays 001)
- Docker / production deploy as a requirement of this slice
- Skipping Spec Kit (no implement before Specified + human OK)
- Inventing screen ids
- Making `staff-login` mandatory on exam-prep
- Choosing SQLite vs PostgreSQL as a product AC (Architect)

## Clarify (closed)

- **Simulate DB ≠ ship production vendors.** Durable rows + mock ports. Real persistence, fake Meta/Google/Razorpay.
- **001 vs 002.** 001 stays the architecture pack (Status Specified). 002 is the first runnable spine slice. Do not treat this as implementing 001.
- **Not all 47 screens.** In 002: spine + seeds + auth stub + roster/cohort + one teaching write (`record`) + timeline + parent read (`parent-home` and its existing child screens) + quota read (`owner` / `subscription`).
- **`staff-login` and templates.** `staff-login` exists on 1-on-1, K-12, skills, music, and everything. Exam-prep omits it; faculty starts at cohort/schedule. Do not require `staff-login` on exam-prep.
- **Demo stays gold.** Incomplete demo is allowed. Catalog/architecture follow the demo; no new ids. Optional later pointer from HTML to local API is not a rewrite of every screen.
- **Human OK** still gates `/speckit.implement`. Clarify answers are folded here; do not wait on further PM questions before Architect plan.

## DoD (PM)

- [x] User stories + numbered AC above
- [x] Clarify closed (folded into this spec)
- [x] Architect: `plan.md` + checklist + analyze (this pass; implement still blocked)
- [x] Tasks (`tasks.md`)
- [x] Human OK (8-step Spec Kit gate — required before implement)
- [x] `/speckit.implement` (Builder; 002 sim-spine)
- [x] Tester + PM Accept (`specs/002-sim-spine/test-report.md`; 11 pytest passed; 003 must not expand this slice)
