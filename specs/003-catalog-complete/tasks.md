# tasks.md — 003-catalog-complete

Builder implements **only after** human OK on `plan-viewer.html`. Branch `cursor/003-catalog-complete`, never `main`.

Phase gate: if 002 pytest fails, **stop** and report before the next phase.

## Gate

- [ ] Human walked spec.md + plan.md
- [ ] Human reviewed HTML guide (master + satellites)
- [ ] Human OK to `/speckit.implement`
- [ ] Branch not `main` / `master`

---

## P0 — 002 close-out

### T0.1 — Prove 002 suite still green
- **Phase:** 002-closeout
- **Owner:** Test and QA
- **Complexity:** S
- **Depends:** —
- **Critical path:** yes
- **AC:** 1, 6, 7
- **Files:** `backend/tests/test_isolation.py`, `test_record_timeline.py`, `test_quotas_rbac.py`, `test_parent.py`, `conftest.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Any red test is a 002 regression. Do not start 003 tables until green. `live_calls == 0` must hold.

### T0.2 — Tester converge 002
- **Phase:** 002-closeout
- **Owner:** Test and QA
- **Complexity:** S
- **Depends:** T0.1
- **Critical path:** yes
- **AC:** 7
- **Files:** `specs/002-sim-spine/spec.md` (Tester notes only if needed), test report
- **Commands:** `/speckit.converge` for 002 ACs vs tests
- **Risks:** Do not expand 002 slice. Do not rewrite 002 routers to “help” 003 yet.

### T0.3 — PM Accept 002
- **Phase:** 002-closeout
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T0.2
- **Critical path:** yes
- **AC:** 7, 16
- **Files:** `specs/002-sim-spine/spec.md` DoD, `README.md` §12 status row
- **Commands:** none (status edit only)
- **Risks:** Accepting 002 must not flip 003 to In Progress. 001 stays Specified / no implement.

---

## P1 — Environment

### T1.1 — Python API local run
- **Phase:** Environment
- **Owner:** Build Engineer
- **Complexity:** S
- **Depends:** T0.1
- **Critical path:** yes
- **AC:** 4, 17
- **Files:** `backend/README.md`, `.env.example` (names only)
- **Commands:** `cd backend; pip install -r requirements.txt; python -m uvicorn app.main:app --reload --port 8000`
- **Risks:** Do not commit secrets. Do not switch CI ports off mock. Do not change 002 factory mock enforcement without a follow-up test.

### T1.2 — Node toolchain for Next.js
- **Phase:** Environment
- **Owner:** Build Engineer
- **Complexity:** S
- **Depends:** T1.1
- **Critical path:** yes
- **AC:** 11
- **Files:** none until T4.1 (document Node 20+ in frontend README when scaffold exists)
- **Commands:** `node -v` (expect 20+)
- **Risks:** Do not scaffold Next.js in this task. Environment check only.

### T1.3 — Optional Compose Postgres
- **Phase:** Environment
- **Owner:** Build Engineer
- **Complexity:** S
- **Depends:** T1.1
- **Critical path:** no
- **AC:** 17
- **Files:** `docker-compose.yml`, `.env.example`
- **Commands:** `docker compose up -d postgres`
- **Risks:** Optional. Unit tests stay in-memory SQLite. Do not make Docker a ship requirement. Do not commit volume data.

---

## P2 — DB

### T2.1 — Content, assignments, submissions
- **Phase:** DB
- **Owner:** Data/DB
- **Complexity:** M
- **Depends:** T0.1
- **Critical path:** yes
- **AC:** 2, 8
- **Files:** `backend/app/models/tables.py`, `backend/app/models/__init__.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Every new table needs `workspace_id`. No syllabus columns. Isolation tests in T2.6.

### T2.2 — Questions, practice_sets, attempts, tests
- **Phase:** DB
- **Owner:** Data/DB
- **Complexity:** L
- **Depends:** T2.1
- **Critical path:** yes
- **AC:** 2, 8
- **Files:** `backend/app/models/tables.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Attempts hang off workspace + student. Do not add exam-board tables. Parent hub `attempts/{id}` contract changes only after T3.8.

### T2.3 — Doubts, messages, announcements, notification_prefs, notification_deliveries
- **Phase:** DB
- **Owner:** Data/DB
- **Complexity:** M
- **Depends:** T2.1
- **Critical path:** yes
- **AC:** 2, 8, 10
- **Files:** `backend/app/models/tables.py`
- **Commands:** `cd backend; pytest`
- **Risks:** `notification_deliveries` is a channel journal, not the ledger. Student WhatsApp default off is a prefs default, not a new table of subjects.

### T2.4 — Plans, invoices, payouts
- **Phase:** DB
- **Owner:** Data/DB
- **Complexity:** M
- **Depends:** T2.1
- **Critical path:** yes
- **AC:** 2, 8
- **Files:** `backend/app/models/tables.py`
- **Commands:** `cd backend; pytest`
- **Risks:** No Razorpay ids required. Amounts are tenant billing rows. Isolation: invoice in A invisible in B.

### T2.5 — Automation_rules, backlog_items
- **Phase:** DB
- **Owner:** Data/DB
- **Complexity:** S
- **Depends:** T2.1
- **Critical path:** no
- **AC:** 2, 8
- **Files:** `backend/app/models/tables.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Rules must not invent screen ids. Backlog items reference existing students/sessions.

### T2.6 — Isolation tests for new tables
- **Phase:** DB
- **Owner:** Test and QA
- **Complexity:** M
- **Depends:** T2.2, T2.3, T2.4, T2.5
- **Critical path:** yes
- **AC:** 1, 2
- **Files:** `backend/tests/test_isolation.py` (extend) or `backend/tests/test_isolation_003.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Do not weaken 002 isolation cases. Two workspaces A vs B for each new entity.

---

## P3 — Backend

### T3.1 — Branding PATCH + WhatsApp pause
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** S
- **Depends:** T2.6
- **Critical path:** no
- **AC:** 9
- **Files:** `backend/app/api/v1/workspaces.py`, `backend/app/api/v1/owner.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Pause is a flag, not a new screen. QuotaGuard still applies to paid sends.

### T3.2 — Video-link + join + attendance
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.6
- **Critical path:** yes
- **AC:** 4, 9, 13
- **Files:** `backend/app/api/v1/sessions.py`, `backend/app/services/` (join/video), `backend/app/ports/mocks.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Mock video URL only. Join writes attendance in session workspace. Token must not leak workspace B. Meet URL is not source of truth.

### T3.3 — Live session + engagement
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** L
- **Depends:** T3.2
- **Critical path:** yes
- **AC:** 9, 13
- **Files:** `backend/app/api/v1/sessions.py`, new service as needed
- **Commands:** `cd backend; pytest`
- **Risks:** No live Google Meet. Engagement events may append timeline; failed notify does not roll back. RBAC: student cannot hit teacher-only engagement POST.

### T3.4 — Session video (transcript empty)
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** S
- **Depends:** T3.2
- **Critical path:** no
- **AC:** 9, 14
- **Files:** `backend/app/api/v1/sessions.py`
- **Commands:** `cd backend; pytest`
- **Risks:** Do not fake captions. `transcript_events` may stay empty.

### T3.5 — Content library + lesson
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.1, T2.6
- **Critical path:** yes
- **AC:** 9
- **Files:** `backend/app/api/v1/` content router, services
- **Commands:** `cd backend; pytest`
- **Risks:** `topic_id` only. Storage local paths, not S3. Tenant isolation on `content_items`.

### T3.6 — Assignments issue + grade
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T3.5
- **Critical path:** no
- **AC:** 9, 10
- **Files:** assignments router/service
- **Commands:** `cd backend; pytest`
- **Risks:** Grade write may timeline-append for that student in A only.

### T3.7 — Question bank
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.2, T2.6
- **Critical path:** yes
- **AC:** 9
- **Files:** questions router/service
- **Commands:** `cd backend; pytest`
- **Risks:** Topics not chapters. No NEET-only schema.

### T3.8 — Practice sets + attempts + timeline
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** L
- **Depends:** T3.7
- **Critical path:** yes
- **AC:** 9, 10, 12
- **Files:** practice router, `backend/app/services/timeline.py`, replace empty `GET /attempts/{id}` stub
- **Commands:** `cd backend; pytest`
- **Risks:** Changes 002 stub payload. Update parent/attempt tests in same change. Isolation: attempt in A not readable in B.

### T3.9 — Tests + analysis
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** L
- **Depends:** T3.8
- **Critical path:** yes
- **AC:** 9
- **Files:** tests/analysis routers
- **Commands:** `cd backend; pytest`
- **Risks:** C6 adaptive must not invent APIs. Analysis actions stay on catalog paths.

### T3.10 — Doubts
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.3, T2.6
- **Critical path:** no
- **AC:** 9, 10
- **Files:** doubts router/service
- **Commands:** `cd backend; pytest`
- **Risks:** Timeline after create/close. Notify mock. Student sees own; teacher sees workspace queue.

### T3.11 — Message threads (real)
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.3, T2.6
- **Critical path:** no
- **AC:** 9, 12
- **Files:** `backend/app/api/v1/stubs.py` (move threads off empty), messages service
- **Commands:** `cd backend; pytest`
- **Risks:** 002 empty `GET /threads` becomes list. Parent sees linked child threads only.

### T3.12 — Announcements
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** S
- **Depends:** T2.3, T2.6
- **Critical path:** no
- **AC:** 9, 10
- **Files:** announcements router
- **Commands:** `cd backend; pytest`
- **Risks:** Timeline + mock notify after write. Cohort scoped to workspace.

### T3.13 — Notification prefs on table
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** S
- **Depends:** T2.3
- **Critical path:** no
- **AC:** 9, 10, 12
- **Files:** stubs/prefs → `notification_prefs` model
- **Commands:** `cd backend; pytest`
- **Risks:** Student WhatsApp remains default off. Do not use prefs as ledger.

### T3.14 — Student and teacher dashboards
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T3.3, T3.8
- **Critical path:** no
- **AC:** 9
- **Files:** dashboard routers aggregating existing tables
- **Commands:** `cd backend; pytest`
- **Risks:** Aggregates only — no second database. Owner console already sim; do not break it.

### T3.15 — Reports export + mentor backlog
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.5, T3.8
- **Critical path:** no
- **AC:** 9
- **Files:** reports/backlog routers; `GET /reports` currently empty list
- **Commands:** `cd backend; pytest`
- **Risks:** Export is file/local or JSON; no live email blast required. Backlog book uses existing schedule rows.

### T3.16 — Plans, invoices, mock checkout
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** L
- **Depends:** T2.4, T2.6
- **Critical path:** yes
- **AC:** 4, 9, 12
- **Files:** billing routers, payments mock port
- **Commands:** `cd backend; pytest`
- **Risks:** `payments_student` stays mock. No Razorpay. Parent `invoices/mine` fills for linked child only.

### T3.17 — Payouts, audit list, data-export
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.4
- **Critical path:** no
- **AC:** 9
- **Files:** payouts/audit routers; `audit_log` already exists
- **Commands:** `cd backend; pytest`
- **Risks:** Audit read is owner-only. Export must stay workspace-scoped.

### T3.18 — Templates apply
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.6
- **Critical path:** no
- **AC:** 9, 11
- **Files:** workspaces/template routers, `feature_flags`
- **Commands:** `cd backend; pytest`
- **Risks:** Templates are named flag sets. Exam-prep still omits requiring `staff-login`. Always-on modules cannot turn off.

### T3.19 — Automation rules
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T2.5
- **Critical path:** no
- **AC:** 9
- **Files:** automation router
- **Commands:** `cd backend; pytest`
- **Risks:** Rules opt-in. Actions write timeline or backlog — not a new inbox.

### T3.20 — Integrations mock connect
- **Phase:** Backend
- **Owner:** Backend
- **Complexity:** M
- **Depends:** T3.2
- **Critical path:** no
- **AC:** 4, 9
- **Files:** integrations router, ports
- **Commands:** `cd backend; pytest`
- **Risks:** Connect stores mock grant. `live_calls` must remain 0. No Google OAuth round-trip in CI.

### T3.21 — Backend full regression
- **Phase:** Backend
- **Owner:** Test and QA
- **Complexity:** M
- **Depends:** T3.1, T3.9, T3.11, T3.16, T3.20
- **Critical path:** yes
- **AC:** 1, 2, 3, 4, 9
- **Files:** `backend/tests/**`
- **Commands:** `cd backend; pytest`
- **Risks:** Phase gate. No new ids. Stop if 002 cases fail.

---

## P4 — Frontend

### T4.1 — Next.js 15 App Router scaffold
- **Phase:** Frontend
- **Owner:** Build Engineer
- **Complexity:** L
- **Depends:** T1.2, T3.21
- **Critical path:** yes
- **AC:** 5, 11
- **Files:** `frontend/` (new app), `frontend/CLAUDE.md`, `frontend/package.json`
- **Commands:** create Next.js 15 app in `frontend/`; `npm run dev`
- **Risks:** One route per catalog `route` only. Do not invent pages. CORS to local FastAPI. No business rules in the client.

### T4.2 — Auth shell screens
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** M
- **Depends:** T4.1
- **Critical path:** yes
- **AC:** 5, 11
- **Files:** routes for `router`, `student-login`, `staff-login`
- **Commands:** `npm run dev`; OTP `000000` against local API
- **Risks:** Tokens from demo HTML. Exam-prep nav must not force `staff-login`. Not a 48th login.

### T4.3 — Wire 002-backed screens
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** L
- **Depends:** T4.2
- **Critical path:** yes
- **AC:** 5, 11, 12
- **Files:** `wsetup`, `roster`, `cohort-builder`, `schedule`, `session-pre`, `record`, `timeline`, `parent-link`, `parent-home`, `owner`, `subscription`, `notif-prefs`
- **Commands:** exercise each against seeded workspaces
- **Risks:** Demo is gold. Status `shell` then `wired`. Do not restyle against invented UI. Isolation: switching workspace in stub must not show B data.

### T4.4 — Domain B remaining UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** L
- **Depends:** T4.3, T3.3, T3.5, T3.6
- **Critical path:** yes
- **AC:** 5, 11, 13, 14
- **Files:** `join`, `live-teacher`, `live-student`, `session-video`, `library`, `lesson`, `assign-issue`, `assign-grade`
- **Commands:** `npm run dev` + API
- **Risks:** Mock video. Empty transcript. Catalog frames (phone vs desktop) from screens.json.

### T4.5 — Domain C practice UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** L
- **Depends:** T4.3, T3.9
- **Critical path:** yes
- **AC:** 5, 11
- **Files:** `qbank`, `practice-build`, `practice-play`, `practice-result`, `test-setup`, `test-runner`, `analysis`
- **Commands:** play one seeded set end to end
- **Risks:** No adaptive-only screen. Results tagged to topics.

### T4.6 — Domain D remaining UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** M
- **Depends:** T4.3, T3.10, T3.11, T3.12
- **Critical path:** no
- **AC:** 5, 11
- **Files:** `doubt-student`, `doubt-teacher`, `messages`, `announce` (`timeline` already T4.3)
- **Commands:** `npm run dev`
- **Risks:** WhatsApp is a channel toggle on prefs, not a second inbox.

### T4.7 — Domain E remaining UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** M
- **Depends:** T4.3, T3.14, T3.15
- **Critical path:** no
- **AC:** 5, 11
- **Files:** `student-dash`, `teacher-dash`, `reports`, `mentor` (`owner` already T4.3)
- **Commands:** `npm run dev`
- **Risks:** Dashboards read aggregates only.

### T4.8 — Domain F remaining UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** M
- **Depends:** T4.3, T3.16, T3.17
- **Critical path:** no
- **AC:** 5, 11, 12
- **Files:** `billing`, `payments`, `payouts`, `audit` (`subscription` already T4.3)
- **Commands:** mock checkout path
- **Risks:** No live payment UI that hits Razorpay. Parent payments = child invoices.

### T4.9 — Domain G + branding UI
- **Phase:** Frontend
- **Owner:** Frontend
- **Complexity:** M
- **Depends:** T4.3, T3.1, T3.18, T3.19, T3.20
- **Critical path:** no
- **AC:** 5, 11
- **Files:** `branding`, `onboard-kind`, `template-gallery`, `automation`, `integrations`
- **Commands:** `npm run dev`
- **Risks:** Template apply must not disable always-on modules. Integrations show mock connected state.

---

## P5 — Integration

### T5.1 — Catalog status bumps
- **Phase:** Integration
- **Owner:** Integration and Docs
- **Complexity:** M
- **Depends:** T4.4, T4.5
- **Critical path:** yes
- **AC:** 3, 16
- **Files:** `catalog/screens.json`, `catalog/apis.json`, `catalog/entities.json`
- **Commands:** `python scripts/build_catalog.py`
- **Risks:** Status fields only — never new ids. Demo still wins if catalog disagrees.

### T5.2 — Parity + agent sync
- **Phase:** Integration
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T5.1
- **Critical path:** yes
- **AC:** 16
- **Files:** `scripts/check_architecture_parity.py`, `scripts/check_agent_config_sync.py`
- **Commands:** `python scripts/check_architecture_parity.py`; `python scripts/check_agent_config_sync.py --range origin/main...HEAD`
- **Risks:** If demo and architecture disagree, regenerate catalog/architecture; do not add screens.

### T5.3 — Architecture HTML + role HTML regen
- **Phase:** Integration
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T5.1
- **Critical path:** no
- **AC:** 16
- **Files:** `tutor-platform-architecture.html` (via embed), `tutor-platform-role-*.html`
- **Commands:** `python scripts/build_role_html.py`
- **Risks:** Do not hand-edit generated role HTML.

---

## P6 — Docs

### T6.1 — README absorb 003
- **Phase:** Docs
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T5.2
- **Critical path:** yes
- **AC:** 16
- **Files:** `README.md` §§1, 3, 7, 11, 12
- **Commands:** none
- **Risks:** Biology remains example. Do not claim live vendors.

### T6.2 — Frontend README
- **Phase:** Docs
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T4.1
- **Critical path:** no
- **AC:** 16
- **Files:** `frontend/README.md`, `frontend/CLAUDE.md`
- **Commands:** none
- **Risks:** Pairing with `.cursor/rules/frontend-nextjs.mdc` in same change if conventions change.

### T6.3 — Backend README remaining APIs
- **Phase:** Docs
- **Owner:** Integration and Docs
- **Complexity:** S
- **Depends:** T3.21
- **Critical path:** no
- **AC:** 16
- **Files:** `backend/README.md`
- **Commands:** none
- **Risks:** Auth stub OTP remains documented.

### T6.4 — Tester converge + PM Accept 003
- **Phase:** Docs
- **Owner:** Test and QA
- **Complexity:** M
- **Depends:** T4.9, T5.2, T6.1
- **Critical path:** yes
- **AC:** 1, 15, 16
- **Files:** spec DoD, README §12
- **Commands:** `cd backend; pytest`; `/speckit.converge`
- **Risks:** Accept only if catalog ids unchanged, mocks hold, and HTML was approved before implement started.

---

## Critical path (ordered)

T0.1 → T1.1 → T2.1 → T2.2 → T2.6 → T3.2 → T3.7 → T3.8 → T3.9 → T3.16 → T3.21 → T4.1 → T4.2 → T4.3 → T4.4 → T4.5 → T5.1 → T5.2 → T6.1 → T6.4

Off-path tasks may run in parallel **after** their Depends, but not before T0.1 is green, and not if a phase gate is red.

## Counts

47 tasks. Owners: Test and QA, Build Engineer, Data/DB, Backend, Frontend, Integration and Docs.
