# TutorOS

TutorOS is a **subject-neutral** remote tutoring workspace. Any subject a tutor can teach at a distance — languages, music, skills, school support, exam-prep, or anything else that fits a session plus a record.

**Biology / NEET / NCERT in this repository is one worked example** of the exam-prep template (a sample tenant), the same status as a language or music tenant. It is not a product preference and not a domain model. Do not add syllabus tables, exam-board modules, or Biology-only routes because those files exist.

Example pack (optional, not requirements): [docs/examples/neet-biology/](docs/examples/neet-biology/).

This file is the single product map for humans and for any LLM (Cursor or Claude Code). In-flight features live under `specs/`. When a feature is Accepted, this README absorbs the delta.

**Application code (002-sim-spine):** FastAPI in `backend/` with a durable SQLite sim file (Postgres-shaped models). Demo HTML remains UI gold; Next.js is not built.

---

## Read this by role

| You are a… | Read |
|---|---|
| **Anyone / LLM** | This disclaimer, [§1](#1-quick-start), [§2](#2-logical-design) |
| **Product manager** | §2, [§10](#10-spec-kit--role-workflow), `specs/002-sim-spine/spec.md` |
| **Architect** | [§3](#3-architecture), [§5](#5-domain-model), [§8](#8-auth), [§9](#9-ports-whatsapp-quotas) |
| **Builder** | Do not implement until spec status is Specified and you are asked. Then §3–§7. |
| **Tester** | [§10](#10-spec-kit--role-workflow) after code exists |

**In 60 seconds:** A tutor’s workspace lets people in, runs a remote session (Google Meet or Microsoft Teams), writes a timeline, optionally assigns practice and doubts, and notifies teacher / parent / admin on WhatsApp (channel, not ledger). Subject is tenant taxonomy, not a SKU.

---

## 1. Quick start

No Docker yet. Open in a browser:

| Open | What it is |
|---|---|
| [product-viewer.html](product-viewer.html) | **Product book (hub)** — key components + task tiles (T0.1…). Not the app. [plan-viewer.html](plan-viewer.html) redirects here. |
| [work-log.html](work-log.html) | Chronological status. Links back to the hub. |
| [plan-functional.html](plan-functional.html) | Functional map: seven jobs, roles, 47 screens, templates, journeys |
| [plan-technical.html](plan-technical.html) | Technical map: layers, entities, 84 APIs, ports, modules, protected tests |
| [plan-sequence.html](plan-sequence.html) | End-to-end build order: functional + technical paired by phase |
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

Active Spec Kit feature is `.specify/feature.json` (`specs/001-platform-architecture`), not the git branch. Override with `SPECIFY_FEATURE_DIRECTORY`.

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

UI later: Next.js 15. API later: FastAPI. This pass: catalog + HTML only. Screen status: `empty` → `shell` → `wired`. All 47 are `empty`.

---

## 4. Why this stack

| Choice | Why |
|---|---|
| Next.js App Router | One route per catalog screen id |
| FastAPI `/api/v1` | Thin routers, OpenAPI, ports as Protocols |
| PostgreSQL | UUID + JSONB, no SQLite |
| Spec Kit + PM/Architect/Builder/Tester | Cursor and Claude Code share the same files |
| Mock-default ports | CI never needs vendor keys |

---

## 5. Domain model

Spine: `workspaces`, `users`, `identities`, `sessions_auth`, `staff_memberships`, `students`, `parent_links`, `cohorts`, `enrollments`, `scheduled_sessions`, `attendance`, `session_records`, `transcript_events` (empty until STT), `timeline_events`, `feature_flags`, `audit_log`, **`taxonomies` / `topics`**, `usage_meters`, `quota_policies`.

Never `biology_chapters` or exam-board tables. Content hangs off `topic_id`.

Later: questions, attempts, doubts, messages, invoices.

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

All routes **planned** unless catalog `status` is `sim` (002 spine). Full list: [catalog/apis.json](catalog/apis.json). Mount under `/api/v1`. Groups: `auth`, `workspaces`, `users`, `cohorts`, `sessions`, `content`, `practice`, `doubts`, `timeline`, `billing`, `modules`.

---

## 8. Auth

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
 → Builder  /speckit.implement     (002-sim-spine in progress)
 → Tester  report + /speckit.converge
 → PM Accept  (same PR updates this README + catalog + architecture HTML)
```

Status: `Draft` → `Specified` → `In Progress` → `Testing` → `Accepted`.

Active feature: [specs/002-sim-spine/](specs/002-sim-spine/) (runnable spine simulation). Architecture pack: [specs/001-platform-architecture/](specs/001-platform-architecture/) (Specified; no implement). Cursor rules ↔ Claude Code: see [CLAUDE.md](CLAUDE.md). Sync: `scripts/check_agent_config_sync.py`.

---

## 11. Known gaps

- Next.js UI, Docker, Figma, live OTP/Meet/Razorpay/WhatsApp are not in 002.
- 002 FastAPI sim lives in `backend/` (SQLite file default, mock ports). Demo mocks still do not save into HTML.
- All 47 screens remain `empty` in the demo. Do not invent ids.
- Demo **incomplete** vs all six tracks: some spine screens still sit only on Everything. `staff-login` is on 1-on-1, K-12, Skills, Music, and Everything; Exam-prep omits it on purpose (faculty starts at cohort/schedule). Fill remaining gaps later — **same ids**, no new screens.
- Inbound WhatsApp replies not in v1.
- Speech-to-text is a slot on session record, not a port.

---

## 12. Feature backlog

| ID | Title | Status |
|---|---|---|
| 001-platform-architecture | Swim-lane HTML, catalog, README hub, Spec Kit, parity | Specified (no `/speckit.implement`) |
| 002-sim-spine | Local FastAPI + durable store + seed + auth stub + record→timeline + quotas | In Progress (Builder done; Tester + Accept open; protected) |
| 003-catalog-complete | Remaining catalog APIs + later entities + Next.js one route per existing screen id | Specified (`product-viewer.html` hub; no implement until HTML OK) |

---

## 13. Examples

[docs/examples/neet-biology/](docs/examples/neet-biology/) — optional reading. Not product requirements.

Example (exam-prep fixture): a Biology coaching tenant may appear as sample copy in the demo HTML. The architecture map uses mixed tenants (coaching, languages, music).
