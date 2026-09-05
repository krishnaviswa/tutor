# plan.md — 002-sim-spine

Status: **Specified** (Architect). **`/speckit.implement` is blocked until tasks exist and a human OKs implement.** Do not skip the 8-step Spec Kit gate. This file is *how*; `spec.md` remains *what*.

001-platform-architecture stays the architecture pack. 002 does not rewrite 001 artifacts. Demo HTML stays UI gold. Optional “live” pointer from architecture HTML or a thin OpenAPI page is **extra, not required**.

## Stack (002 scaffold)

| Layer | 002 choice | Later (constitution) |
|---|---|---|
| UI | Not required. Do not wire all 47 demo screens. | Next.js 15 App Router |
| API | **FastAPI**, mount `/api/v1` | same |
| Data | **SQLAlchemy 2 models written for PostgreSQL**; **default local/CI engine = SQLite file** (`backend/data/sim.db`) so restart persists without Docker | PostgreSQL |
| Optional | `DATABASE_URL` may point at Postgres (docker-optional). Not required to ship 002. | production default |
| Ports | Protocol + **mock default** | live behind env |

**Engine justification:** Constitution and README §4 target PostgreSQL (UUID + JSONB). Spec AC 5 says engine is **not** a product AC. Docker/production deploy is out of scope. SQLite file (or in-memory in unit tests) uses the **same models** destined for Postgres (UUID PKs, `workspace_id` on business rows, JSON columns instead of dialect-only JSONB in 002). Switching to Postgres later is a URL + type tweak, not a second domain.

Do **not** treat SQLite as the product database. Do **not** add SQLite-only SQL.

## Layers

Layered monolith. Routers never call vendors or disk. Services never know HTTP.

```
Entry (auth stub: role + workspace_id)
  → FastAPI /api/v1 (thin routers; catalog path ids only)
  → Middleware: CORS → request id → tenant → authn → authz + G1 flags → QuotaGuard → idempotency → audit
  → Services (RecordService, TimelinePort.append, QuotaService, Notify.dispatch)
  → Ports (all mock | storage local)
  → SQLAlchemy → SQLite file | optional Postgres
```

Always-on modules cannot be flagged off: **A1, A2, A3, G1, G2, D4, F2**. Caps throttle usage, not existence of identity, timeline, or quota screens.

## Quota resolution (AC 12)

**Pick (a): promote `usage_meters` and `quota_policies` into the 002 sim schema.**

Catalog today: those two entities are `tier: later`, while `GET /api/v1/usage`, `GET /api/v1/billing/subscription`, and `PATCH /api/v1/billing/quotas` already exist, and screens `owner` / `subscription` already bind to them. Persisting quotas as workspace JSON / `feature_flags` would fight AC 12 and force a later migration.

002 implement:

- Create SQLAlchemy models for `usage_meters` and `quota_policies` with `workspace_id`.
- Seed warn-at-80 / block-at-100 examples (at least one workspace at or above 80%, one at 100% with `block`).
- `QuotaGuard` after AuthZ: 80% → warn payload + mock admin channel ping; 100% + `block` → skip **paid send** (WhatsApp/SMS/email); **PATCH record still writes** timeline.
- Do **not** turn off A1/A2/A3/D4/F2 because a meter is full.
- Leave catalog `tier: later` until the implement/accept PR updates `catalog/entities.json` + README §5 (documented in `analyze.md`). Do not invent new entity ids.

Reject (b) for 002: JSON-in-flags is only acceptable if a later feature owns meters; AC 12 requires persisted meters on existing F2 screens.

## Data impact

### In 002 (durable tables)

**Catalog spine (18):** `workspaces`, `users`, `identities`, `sessions_auth`, `staff_memberships`, `students`, `parent_links`, `cohorts`, `enrollments`, `scheduled_sessions`, `attendance`, `session_records`, `transcript_events` (empty until STT — table exists, no fake captions), `timeline_events`, `feature_flags`, `audit_log`, `taxonomies`, `topics`.

**Promoted for AC 12 (2):** `usage_meters`, `quota_policies`.

**Subject:** tenant `taxonomies` / `topics` only. No syllabus, exam-board, or Biology tables. Example tenants may use generic topic labels (e.g. “Unit 1”, “Scales”) — never `biology_chapters`.

**Tenant isolation:** every **business** row carries `workspace_id`. `users` is the person record (may exist in more than one workspace via memberships); **session JWT binds one `workspace_id`**. Acting in workspace A must not read/mutate B. Tests must prove this.

**Not in 002 tables:** `questions`, `attempts`, `doubts`, `messages`, `invoices`, `notification_prefs`, `notification_deliveries`, `content_items`, `assignments`, `submissions`, `practice_sets`, `tests`, `announcements`, `plans`, `payouts`, `automation_rules`, `backlog_items`. Parent hub child screens that need those tables return **empty/stub payloads** (below). Mock channel “deliveries” may be appended to `audit_log` (or an in-process mock journal). Do **not** invent `notification_deliveries` rows as a 002 product store; the ledger is `timeline_events`.

## Seeds

At least three workspaces (job arrangements, not subject SKUs):

1. **Coaching / exam-prep** — template omits `staff-login`. Faculty teaching work starts at `cohort-builder` / `schedule`.
2. **Language 1-on-1** — includes `staff-login` on the template.
3. **Music** — includes `staff-login` on the template.

Biology / NEET / NCERT is **not** required. `docs/examples/` stays example-only.

Each workspace: owner, teacher, assistant, student, parent identities; roster + at least one cohort + enrollment; at least one `scheduled_sessions` row so `record` can write; `parent_links` accepted for the seeded student; taxonomies/topics; feature flags with always-on on; quota meters.

## Auth stub (no new screen)

Use **existing** catalog auth APIs only. Local/CI: mock `sms` / `email`; a documented fixed OTP (or magic-link token) is allowed. JWT (or equivalent signed session) claims: `sub`, `role`, `workspace_id`. Roles: `owner` | `teacher` | `assistant` | `student` | `parent`.

Switching roles/tenants = verify stub + `GET/PATCH /api/v1/workspaces/current` + `GET /api/v1/auth/me`. **Do not invent** `/sim/login` or a 48th screen. UI wiring of `staff-login` / `student-login` is optional; API must be enough for tests.

Exam-prep faculty **must not** be required to call a staff-login screen to start teaching APIs; membership as teacher is enough. Other templates may use `staff-login` when UI is wired later.

## Screens in the 002 slice (catalog ids only)

Closed set remains 47. 002 does **not** add ids. In-scope **behaviour** (backend + seed), not a new UI:

| Path | Screen ids | Notes |
|---|---|---|
| Vertical (templates with staff entry) | `staff-login` → `wsetup` → `roster` → `cohort-builder` → `schedule` → `record` → `timeline` → `parent-link` → `parent-home` | Existing ids only |
| Exam-prep faculty start | `cohort-builder`, `schedule` | Not `staff-login` |
| Auth / student | `student-login` | Stub OTP/magic-link |
| Owner quotas | `owner`, `subscription` | Warn 80% / block 100% |
| Parent hub children | `timeline`, `reports`, `practice-result`, `payments`, `messages`, `notif-prefs` | Open via existing ids; **later tables stub empty** |

Optional extra: architecture HTML “live” badge or OpenAPI at `/docs`. Not required for AC 16.

## Parent hub stubs (no 48th screen, no full practice/billing)

`GET /api/v1/parent/home` returns linked children in **this** workspace only (AC 11) plus hub keys that map to existing screen ids.

Child APIs in 002:

| Catalog API | 002 behaviour |
|---|---|
| `GET /api/v1/students/{id}/timeline` | Real `timeline_events` for that child in the session workspace |
| `GET /api/v1/reports` | Empty list (or timeline-derived placeholder). No new report entity. |
| `GET /api/v1/attempts/{id}` | **404** or empty body — `attempts` is later. Screen id still `practice-result`. |
| `GET /api/v1/invoices/mine` | Empty list — `invoices` later. Screen id still `payments`. |
| `GET /api/v1/threads` | Empty list — `messages` later. Screen id still `messages`. |
| `GET /api/v1/notifications/prefs` | Defaults: teacher/parent/admin channels available; **student WhatsApp off**. No `notification_prefs` table. `PUT` may persist a JSON blob on `feature_flags` or no-op with 200 + same defaults. |

Do not implement checkout, practice attempt, or chat send in 002.

## API contract (catalog ids only — do not invent paths)

84 planned routes remain in `catalog/apis.json`. 002 implements a subset. Unlisted routes stay unimplemented (FastAPI 404). Status stays `planned` until implement/accept updates catalog.

### Implemented (real spine behaviour)

| API id | Screens / job | RBAC (002) |
|---|---|---|
| `GET /api/v1/auth/me` | `router` + stub | signed-in |
| `POST /api/v1/auth/otp/start` | `student-login`, `staff-login` | public; mock sms |
| `POST /api/v1/auth/otp/verify` | same | public → session |
| `POST /api/v1/auth/magic-link` | same | public; mock email |
| `POST /api/v1/workspaces` | `wsetup` | owner (or first-run stub) |
| `GET /api/v1/workspaces/current` | `wsetup` | signed-in |
| `PATCH /api/v1/workspaces/current` | `wsetup` | owner |
| `GET /api/v1/students` | `roster` | owner, assistant (roster), teacher read |
| `POST /api/v1/students` | `roster` | owner, assistant (roster) |
| `POST /api/v1/students/import` | `roster` | owner, assistant (roster) |
| `GET /api/v1/cohorts` | `cohort-builder` | owner, teacher, assistant |
| `POST /api/v1/cohorts` | `cohort-builder` | owner, teacher |
| `PATCH /api/v1/cohorts/{id}` | `cohort-builder` (enrollments) | owner, teacher |
| `POST /api/v1/parent-links` | `parent-link` | owner, teacher |
| `POST /api/v1/parent-links/{token}/accept` | `parent-link` | parent (token) |
| `GET /api/v1/parent/home` | `parent-home` | parent; linked child only |
| `GET /api/v1/sessions` | `schedule` | owner, teacher, assistant |
| `POST /api/v1/sessions` | `schedule` | teacher, owner |
| `PATCH /api/v1/sessions/{id}` | `schedule` | teacher, owner |
| `GET /api/v1/sessions/{id}` | `session-pre` (needed for record) | staff with workspace session |
| `GET /api/v1/sessions/{id}/record` | `record` | teacher, owner |
| `PATCH /api/v1/sessions/{id}/record` | `record` | teacher (assistant if roster-equivalent teaching write: **teacher only** unless membership says otherwise — default **teacher + owner**) |
| `GET /api/v1/students/{id}/timeline` | `timeline` | student (self), parent (linked), teacher/owner/assistant (workspace) |
| `GET /api/v1/owner/console` | `owner` | owner |
| `GET /api/v1/usage` | `owner` | owner |
| `GET /api/v1/billing/subscription` | `subscription` | owner |
| `PATCH /api/v1/billing/quotas` | `subscription` | owner |

`enrollments` has no dedicated catalog path; persist via students + `PATCH /api/v1/cohorts/{id}`.

### Stub empty (parent hub / prefs; same ids)

| API id | Screen id | 002 |
|---|---|---|
| `GET /api/v1/reports` | `reports` | empty |
| `GET /api/v1/attempts/{id}` | `practice-result` | empty/404 |
| `GET /api/v1/invoices/mine` | `payments` | empty |
| `GET /api/v1/threads` | `messages` | empty |
| `GET /api/v1/notifications/prefs` | `notif-prefs` | defaults |
| `PUT /api/v1/notifications/prefs` | `notif-prefs` | stub persist or echo |

### Optional thin (same screen `subscription`, not required for AC 12)

| API id | 002 |
|---|---|
| `POST /api/v1/billing/whatsapp-pause` | flag on workspace; mock; counted as ops not a new screen |

### Explicitly out of 002 routers

Live/join/video, content, assignments, questions, practice writes, tests, analysis, doubts, announcements, dashboards except owner console, backlog, plans, invoices POST, checkout, payouts, audit list (writes still go to `audit_log`), data-export, templates, automation, integrations, branding PATCH, WhatsApp pause if skipped, `POST /api/v1/threads/{id}/messages`, `POST /api/v1/reports/export`.

## RBAC

| Role | 002 can |
|---|---|
| owner | workspace, flags, roster, quotas, read teaching, not student app chrome |
| teacher | cohorts, schedule, **PATCH record**, read timeline for workspace students; not `owner` / `subscription` |
| assistant | roster (catalog), not owner consoles; not required to PATCH record |
| student | `student-login` stub, **own** timeline only |
| parent | accept link, `parent/home`, child timeline + stub hub APIs; **not** another family’s child; **not** workspace B |

Missing G1 module → **404**, not 403 (README §8). Always-on modules cannot be missing.

## Ports (mock default)

| Port | 002 |
|---|---|
| `calendar_video` | mock; no Google/Microsoft |
| `sms` | mock (OTP) |
| `email` | mock (magic-link, optional notify) |
| `whatsapp` | mock outbound; **teacher, parent, admin**; student **owner-gated default off** |
| `push` | mock |
| `payments_student` / `payments_platform` | mock; no Razorpay/Stripe; parent `payments` empty |
| `storage` | **local** (catalog default); board photos on record may be paths, not S3 |

**WhatsApp / Notify:** after `TimelinePort.append` succeeds, `Notify.dispatch` may call mock channels. Failed send does **not** roll back the timeline. Count paid sends on F2 meters. Outbound only. No inbound WhatsApp.

## QuotaGuard

Order: AuthZ → **QuotaGuard** → handler.

- Meters (002 seed): WhatsApp, SMS, email, storage, seats, students (hosted minutes / STT slot may exist as rows with 0 usage — STT out of scope).
- Policy: `warn` | `block` | `allow_overage`.
- UI data on `owner` + `subscription` via catalog APIs above.
- 100% + `block`: skip paid **channel** send; teaching `PATCH .../record` and timeline append **succeed**.

## Tests (Builder; mock providers only)

Must include: two workspaces A vs B isolation; role cannot hit the other tenant; `PATCH record` fans out `timeline_events` to attendees in A only; parent cannot see unlinked child; quota 80/100 warn/block without disabling D4/F2; ports never called live; no screen/API id outside catalog.

## Scaffold (when implement is allowed)

```
backend/
  app/main.py
  app/api/v1/          # thin routers
  app/services/        # Record, Timeline, Quota, Notify
  app/models/          # SQLAlchemy spine + meters
  app/ports/           # Protocol + mocks
  app/middleware/      # tenant, authn, authz, QuotaGuard, audit
  tests/               # isolation, record→timeline, quotas, RBAC
  data/sim.db          # gitignored SQLite file
```

Alembic optional; `create_all` + seed script is enough for 002. Seed command documented in backend README when code exists.

Frontend: **not required**. Do not rebuild demo HTML as Next.js.

## Human OK (gate)

Sequence: Specified (this pass) → `/speckit.tasks` → **human OK** → Builder `/speckit.implement`.

Refuse implement if: spec not Specified, this plan/checklist/analyze missing, tasks missing, or human has not OK’d.

## Risks (see analyze.md)

- 001 HTML pack not formally accepted by a human.
- Parent hub children empty by design.
- Catalog still marks meters as `later` until accept PR.
- Demo remains incomplete vs six tracks; 002 must not invent ids to fill it.
