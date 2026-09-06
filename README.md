# TutorOS

TutorOS is a **subject-neutral** remote tutoring workspace. Any subject a tutor can teach at a distance — languages, music, skills, school support, exam-prep, or anything else that fits a session plus a record.

**Biology / NEET / NCERT in this repository is one worked example** of the exam-prep template (a sample tenant), the same status as a language or music tenant. It is not a product preference and not a domain model. Do not add syllabus tables, exam-board modules, or Biology-only routes because those files exist.

Example pack (optional, not requirements): [docs/examples/neet-biology/](docs/examples/neet-biology/).

This file is the single product map for humans and for any LLM (Cursor or Claude Code). In-flight features live under `specs/`. When a feature is Accepted, this README absorbs the delta.

**Local running stack:** FastAPI in `backend/` talks to **Docker Compose PostgreSQL** for every local backend write. Next.js 15 in `frontend/` has one App Router route per catalog screen (status `wired` on 004). Demo HTML remains UI gold. Product home is `/` → `/app/student/router`. Vendor, AI, and production auth stay **mock** until hosted (or a later feature turns a port live).

---

## Read this by role

| You are a… | Read |
|---|---|
| **Anyone / LLM** | This disclaimer, [§1](#1-quick-start), [§2](#2-logical-design) |
| **Product manager** | §2, [§10](#10-spec-kit--role-workflow), `specs/005-dashboard-density/spec.md`, [density-map.html](density-map.html) |
| **Architect** | [§3](#3-architecture), [§5](#5-domain-model), [§8](#8-auth), [§9](#9-ports-whatsapp-quotas) |
| **Builder** | Do not implement until spec status is Specified and you are asked. Then §3–§7. |
| **Tester** | [§10](#10-spec-kit--role-workflow), [§12](#12-feature-backlog) feature→test index |

**In 60 seconds:** A tutor’s workspace lets people in, runs a remote session (Google Meet or Microsoft Teams), writes a timeline, optionally assigns practice and doubts, and notifies teacher / parent / admin on WhatsApp (channel, not ledger). Subject is tenant taxonomy, not a SKU.

---

## 1. Quick start

**Agents (Cursor, Claude Code, cloud):** until the API is hosted, **Postgres is the local backend**. Do not persist app data in SQLite. Do not treat a stopped container as “no database.” Start Compose, then run FastAPI. Unit tests are the only SQLite path (`sqlite:///:memory:` in `backend/tests/conftest.py`).

**Local vs hosted**

| Where | `DATABASE_URL` | What you mock |
|---|---|---|
| This machine (not hosted) | `postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros` — Compose service `postgres` in [docker-compose.yml](docker-compose.yml) | All **ports**: SMS, email, WhatsApp, push, Meet/Teams, payments, object storage-as-S3. **Auth** is the stub (OTP `000000`, magic link, JWT) — not a live IdP. **AI / LLM vendors** are not called. |
| Hosted | The host’s Postgres DSN | Same mocks until a feature sets a live provider in `.env` |

Local functional testing of product behavior (tenant isolation, record → timeline, quotas, parent home, roster) **goes through `/api/v1` against that Postgres**. Static HTML is the UI map, not the store.

```bash
docker compose up -d postgres          # container tutoros-postgres; wait until healthy
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

Default API `DATABASE_URL` matches Compose. Copy [.env.example](.env.example) if you need a file. Seeded workspaces: `exam-prep`, `language-1on1`, `music` (catalog pack: [seed-map.html](seed-map.html)). Wipe and reload: `cd backend; python -m app.seed_cli --reset`. Auth stub: [backend/README.md](backend/README.md).

**Product maps (static HTML, no API required)** — open in a browser:

| Open | What it is |
|---|---|
| [product-viewer.html](product-viewer.html) | **Product book (hub)** — key components + task tiles (T0.1…). Not the app. [plan-viewer.html](plan-viewer.html) redirects here. |
| [work-log.html](work-log.html) | Chronological status. Links back to the hub. |
| [plan-functional.html](plan-functional.html) | Functional map: seven jobs, roles, 47 screens, templates, journeys |
| [plan-technical.html](plan-technical.html) | Technical map: layers, entities, 84 APIs, ports, modules, protected tests |
| [plan-sequence.html](plan-sequence.html) | End-to-end build order: functional + technical paired by phase |
| [density-map.html](density-map.html) | **005 density board** — iSeek gap, backend workflow, T7.1–T7.12. Open in a browser. |
| [tutor-platform-architecture.html](tutor-platform-architecture.html) | System map: entry → six tracks → layers → 47 screens → follow the call |
| [tutor-platform-demo.html](tutor-platform-demo.html) | UI gold (47 screens, six templates). **Incomplete** — focused tracks omit some spine screens |
| [tutor-platform-role-student.html](tutor-platform-role-student.html) | Generated child: student lane only |
| [tutor-platform-explorer.html](tutor-platform-explorer.html) | Module toggles and build sequence |
| [tutor-loop-ui-kit.html](tutor-loop-ui-kit.html) | Exam-prep *template* visuals — not a Biology app |

```bash
python scripts/build_catalog.py
python scripts/build_role_html.py
python scripts/check_architecture_parity.py
python scripts/check_agent_config_sync.py --range origin/main...HEAD
```

Active Spec Kit directory is `.specify/feature.json` (currently `specs/005-dashboard-density`, **Specified** — not implemented). 004-wire-demo-ui is Accepted. Override with `SPECIFY_FEATURE_DIRECTORY`.

---

## 2. Logical design

Seven jobs, same for every tenant: let people in, schedule and deliver a session, practice, doubts, keep a record, show progress, take money.

Templates (exam-prep, 1-on-1, K-12, skills, music, everything) are named toggle sets — not subjects.

The **timeline** is the ledger. WhatsApp / email / push deliver events; they do not store them.

---

## 3. Architecture

Layered monolith + ports only at vendor edges. Frontend never holds business rules. Routers never call Google or disk. Services never know HTTP.

Walk it: [tutor-platform-architecture.html](tutor-platform-architecture.html).

```
Entry (role + workspace)
  → UI (47 screens, domains A–G)
  → API /api/v1
  → Middleware (tenant, authn, authz + flags, QuotaGuard, audit)
  → Services (TimelinePort, Notify.dispatch, …)
  → Ports (Meet/Teams, SMS, mail, store, pay, push, WhatsApp)
  → PostgreSQL (workspace_id on every business table)
```

UI: Next.js 15 (one route per catalog screen id) in `frontend/`. API: FastAPI `/api/v1` against local Postgres. Demo HTML is still UI gold; screens are `shell` until `wired`. Status: `empty` → `shell` → `wired`. Do not invent a 48th id.

---

## 4. Why this stack

| Choice | Why |
|---|---|
| Next.js App Router | One route per catalog screen id |
| FastAPI `/api/v1` | Thin routers, OpenAPI, ports as Protocols |
| PostgreSQL | Product and **local** store (Compose until hosted). UUID + JSONB. SQLite only for pytest memory. |
| Spec Kit + PM/Architect/Builder/Tester | Cursor and Claude Code share the same files |
| Mock-default ports | CI never needs vendor keys |

---

## 5. Domain model

Spine: `workspaces`, `users`, `identities`, `sessions_auth`, `staff_memberships`, `students`, `parent_links`, `cohorts`, `enrollments`, `scheduled_sessions`, `attendance`, `session_records`, `transcript_events` (empty until STT), `timeline_events`, `feature_flags`, `audit_log`, **`taxonomies` / `topics`**, `usage_meters`, `quota_policies`, plus 003 workspace-scoped tables: `questions`, `attempts`, `doubts`, `messages`, `invoices`, `notification_prefs`, `notification_deliveries`, `content_items`, `assignments`, `submissions`, `practice_sets`, `tests`, `announcements`, `plans`, `payouts`, `automation_rules`, `backlog_items`.

Never `biology_chapters` or exam-board tables. Content hangs off `topic_id`.

Always-on (cannot flag off): A1, A2, A3, G1, G2, D4, F2. Caps throttle **usage**, not existence.

Catalog: [catalog/entities.json](catalog/entities.json), [catalog/modules.json](catalog/modules.json).

---

## 6. Screen map

47 ids locked to `tutor-platform-demo.html` `S`. Source: [catalog/screens.json](catalog/screens.json). Each catalog row also carries Owner / Who / Why / How / When from demo `WHY`. The architecture HTML (`tutor-platform-architecture.html`) loads [catalog/embed.js](catalog/embed.js) — after demo edits run `python scripts/build_catalog.py` then `python scripts/build_role_html.py`. Architecture Start lists the six demo tracks from that catalog. Role HTML files are generated from the demo; they are not a second product. Parent hub is `parent-home` (activity, marksheet, results, receipts, teacher chat). `staff-login` is on 1-on-1, K-12, Skills, Music, Everything; Exam-prep omits it.

- **A Identity (9):** `router`, `student-login`, `staff-login`, `wsetup`, `branding`, `roster`, `cohort-builder`, `parent-link`, `parent-home`
- **B Teaching (11):** `schedule`, `session-pre`, `join`, `live-teacher`, `live-student`, `session-video`, `record`, `library`, `lesson`, `assign-issue`, `assign-grade`
- **C Practice (7):** `qbank`, `practice-build`, `practice-play`, `practice-result`, `test-setup`, `test-runner`, `analysis`
- **D Record and comms (6):** `doubt-student`, `doubt-teacher`, `messages`, `announce`, `timeline`, `notif-prefs`
- **E Progress (5):** `student-dash`, `teacher-dash`, `owner`, `reports`, `mentor`
- **F Business (5):** `billing`, `payments`, `subscription`, `payouts`, `audit`
- **G Config (4):** `onboard-kind`, `template-gallery`, `automation`, `integrations`

---

## 7. API map

All routes under `/api/v1`. 002 spine + 003 remaining catalog paths are `sim`. Full list: [catalog/apis.json](catalog/apis.json). Groups: `auth`, `workspaces`, `users`, `cohorts`, `sessions`, `content`, `practice`, `doubts`, `timeline`, `billing`, `modules`.

---

## 8. Auth

Local and CI use the **auth stub** (OTP `000000`, magic link, JWT claims). Do not call a live SMS IdP, Google staff login, or institute SSO until a feature turns those ports on.

Four mechanisms, not one library:

1. **Identity:** phone OTP default (`sms` port); email magic link; staff Google later; institute SSO later. No student password in v1.
2. **Session:** httpOnly JWT + refresh; claims `sub`, `role`, `workspace_id`.
3. **RBAC:** `owner` \| `teacher` \| `assistant` \| `student` \| `parent`. Missing G1 module → **404**, not 403.
4. **Link tokens:** parent-link, session join, enrollment invite.

Students join through the platform. The Meet URL is not the attendance source of truth.

---

## 9. Ports, WhatsApp, quotas

Ports (mock default): `calendar_video`, `sms`, `email`, `storage`, `payments_student`, `payments_platform`, `push`, `whatsapp`. See [catalog/ports.json](catalog/ports.json) and [.env.example](.env.example).

**WhatsApp** notifies **teacher, parent, and admin**. Student WhatsApp is owner-gated (default off). Outbound v1. Timeline write first; failed send does not roll back. Counted on F2 meter.

**Admin resource controls** (screens `owner`, `subscription` — no extra console):

- Platform operator: per-tenant quotas; overage `warn` \| `block` \| `allow_overage`; freeze a port without deleting data.
- Workspace admin: G1 modules; caps at or below tier; channel matrix; digest vs instant; 24h WhatsApp pause.
- `QuotaGuard` after AuthZ. 80% → admin ping. 100% + block → skip **paid send**; teaching record still writes.

---

## 10. Spec Kit + role workflow

```
PM  /speckit.specify + /speckit.clarify
 → Architect  /speckit.plan + checklist + /speckit.analyze
 → /speckit.tasks
 → human OK
 → Builder  /speckit.implement     (002 and 003 Accepted; 002 protected)
 → Tester  report + /speckit.converge
 → PM Accept  (same PR updates this README + catalog + architecture HTML)
```

Status: `Draft` → `Specified` → `In Progress` → `Testing` → `Accepted`.

Last Accepted feature dir: [specs/004-wire-demo-ui/](specs/004-wire-demo-ui/). Active Specified: [specs/005-dashboard-density/](specs/005-dashboard-density/) ([density-map.html](density-map.html)). Catalog-complete APIs: [specs/003-catalog-complete/](specs/003-catalog-complete/) (Accepted, shell/sim then wired by 004). Spine simulation: [specs/002-sim-spine/](specs/002-sim-spine/) (Accepted, protected). Architecture pack: [specs/001-platform-architecture/](specs/001-platform-architecture/) (Specified; no implement). Cursor rules ↔ Claude Code: see [CLAUDE.md](CLAUDE.md). Sync: `scripts/check_agent_config_sync.py`.

---

## 11. Known gaps

- Next.js App Router in `frontend/` (one route per catalog id, status `wired`). `/` opens the role router. Operator jump list is `/operator` (not a catalog screen). Demo HTML remains the visual gold.
- Docker Compose Postgres **is** the local backend (optional if you only run pytest). Live OTP / Meet / Razorpay / WhatsApp / Meta / AI vendors are **not** connected (mock ports).
- Do not invent screen ids. Exam-prep faculty is not forced through `staff-login`.
- Demo **incomplete** vs all six tracks: some spine screens still sit only on Everything. `staff-login` is on 1-on-1, K-12, Skills, Music, and Everything; Exam-prep omits it on purpose (faculty starts at cohort/schedule). Fill remaining gaps later — **same ids**, no new screens.
- **005 dashboard density (Specified, not implemented):** wired Next.js dashboards show counts; demo gold shows named next actions, bars, chase lists, receipts. Action board: [density-map.html](density-map.html). Spec: [specs/005-dashboard-density/](specs/005-dashboard-density/).
- Inbound WhatsApp replies not in v1.
- Speech-to-text is a slot on session record, not a port.

---

## 12. Feature backlog

| ID | Title | Status |
|---|---|---|
| 001-platform-architecture | Swim-lane HTML, catalog, README hub, Spec Kit, parity | Specified (no `/speckit.implement`) |
| 002-sim-spine | Local FastAPI + durable store + seed + auth stub + record→timeline + quotas | Accepted (protected; do not rewrite) |
| 003-catalog-complete | Remaining catalog APIs + later entities + Next.js one route per existing screen id | Accepted (shell/sim; 004 wired the UI) |
| 004-wire-demo-ui | Wire demo UI gold onto existing `/api/v1`; all 47 catalog screens `wired` | Accepted |
| 005-dashboard-density | Lift demo named facts onto wired dashboards (same ids, richer `/api/v1` JSON) | Specified |

Feature → test index (pytest: `cd backend; python -m pytest`, in-memory SQLite, `live_calls == 0`):

| Feature | Tests |
|---|---|
| 002-sim-spine | `backend/tests/test_isolation.py`, `test_record_timeline.py`, `test_quotas_rbac.py`, `test_parent.py` — [test-report](specs/002-sim-spine/test-report.md) |
| 003-catalog-complete | 002 suite plus `test_isolation_003.py`, `test_003_api.py` (20 passed) — [test-report](specs/003-catalog-complete/test-report.md) |
| 004-wire-demo-ui | Same 20 pytest green after wiring; `tsc --noEmit`; 47 catalog routes — [test-report](specs/004-wire-demo-ui/test-report.md) |

---

## 13. Examples

[docs/examples/neet-biology/](docs/examples/neet-biology/) — optional reading. Not product requirements.

Example (exam-prep fixture): a Biology coaching tenant may appear as sample copy in the demo HTML. The architecture map uses mixed tenants (coaching, languages, music).
