# tasks.md — 002-sim-spine

Dependency-ordered. **No application code until human OK.** Then Builder implements in this order on a named feature branch (never `main`).

Catalog/HTML/README updates that belong in the accept PR stay last.

## Gate (do not skip)

- [ ] Human walked spec.md + plan.md (checklist: Blocks implement)
- [ ] Human OK to `/speckit.implement`
- [ ] Branch not `main` / `master`

## T0 — Scaffold (after human OK)

- [ ] `backend/` FastAPI app: `app/main.py`, `/api/v1` prefix, CORS + request-id middleware stubs
- [ ] SQLAlchemy 2 engine: models written for PostgreSQL; default `sqlite:///backend/data/sim.db`; tests use in-memory SQLite; optional `DATABASE_URL`
- [ ] `backend/data/` gitignored; `.env.example` names only (no secrets)
- [ ] Ports: Protocol + mock adapters (`sms`, `email`, `whatsapp`, `push`, `calendar_video`, `payments_*`, `storage` local)

## T1 — Spine schema

- [ ] Models for 18 spine entities + promoted `usage_meters` + `quota_policies`; `workspace_id` on every business table
- [ ] `users` is the person; memberships bind workspace + role; no syllabus / exam-board tables
- [ ] `create_all` + seed script (Alembic optional)
- [ ] Seed ≥3 workspaces: coaching/exam-prep, language 1-on-1, music — each with owner, teacher, assistant, student, parent; cohort; enrollment; scheduled session; accepted parent_link; taxonomies/topics; always-on flags; quota meters (one ≥80% warn, one 100% block)

## T2 — Middleware + auth stub

- [ ] Order: tenant → authn → authz + G1 → QuotaGuard → idempotency → audit
- [ ] Catalog auth only: `POST /api/v1/auth/otp/start|verify`, `POST /api/v1/auth/magic-link`, `GET /api/v1/auth/me`
- [ ] Mock OTP / magic-link; JWT claims `sub`, `role`, `workspace_id`
- [ ] Roles: owner | teacher | assistant | student | parent
- [ ] Missing G1 → 404 not 403; always-on cannot be off
- [ ] Exam-prep teacher can call teaching APIs without a staff-login screen

## T3 — Workspace, roster, cohort, parent-link

- [ ] `POST|GET|PATCH /api/v1/workspaces` / `workspaces/current`
- [ ] `GET|POST /api/v1/students`, `POST /api/v1/students/import`
- [ ] `GET|POST|PATCH /api/v1/cohorts` (enrollments via PATCH)
- [ ] `POST /api/v1/parent-links`, `POST /api/v1/parent-links/{token}/accept`
- [ ] `GET /api/v1/parent/home` — linked child in this workspace only

## T4 — Sessions + teaching write + timeline

- [ ] `GET|POST /api/v1/sessions`, `GET|PATCH /api/v1/sessions/{id}`
- [ ] `GET|PATCH /api/v1/sessions/{id}/record` — teacher + owner; writes `session_records` + `attendance`
- [ ] After record: `TimelinePort.append` for attendees in that workspace only; then mock `Notify.dispatch`
- [ ] Failed channel send does not roll back timeline
- [ ] `GET /api/v1/students/{id}/timeline` — student self, linked parent, workspace staff

## T5 — Quotas + owner screens (API)

- [ ] `GET /api/v1/owner/console`, `GET /api/v1/usage`, `GET /api/v1/billing/subscription`, `PATCH /api/v1/billing/quotas`
- [ ] QuotaGuard: 80% warn; 100% + block skips paid WhatsApp/SMS/email; `PATCH .../record` still succeeds
- [ ] Student WhatsApp owner-gated default off

## T6 — Parent hub stubs (existing screen ids)

- [ ] `GET /api/v1/reports` empty
- [ ] `GET /api/v1/attempts/{id}` empty/404
- [ ] `GET /api/v1/invoices/mine` empty
- [ ] `GET /api/v1/threads` empty
- [ ] `GET|PUT /api/v1/notifications/prefs` defaults (no `notification_prefs` table)

## T7 — Tests (must exist before Tester)

- [ ] Isolation: workspace A cannot read/mutate B
- [ ] Role in A cannot hit B
- [ ] `PATCH record` fans out timeline to attendees in A only
- [ ] Parent cannot see unlinked child
- [ ] Quota 80/100 without disabling D4/F2
- [ ] Ports never called live
- [ ] No screen or API id outside catalog

## T8 — Docs on accept (same PR as code)

- [ ] `catalog/entities.json`: `usage_meters`, `quota_policies` no longer blocking 002 (tier note)
- [ ] Catalog API statuses for implemented paths
- [ ] README §5 / §7 / §10 / §12: 002 active, 001 remains architecture pack
- [ ] `.specify/feature.json` still 002 until Accepted
- [ ] Do **not** rewrite `tutor-platform-demo.html` as Next.js; demo stays UI gold
- [ ] Optional extra only: architecture HTML “live” badge or `/docs` — not required for AC 16

## Explicitly not these tasks

- All 47 screens as React
- Live vendors, inbound WhatsApp, STT, Figma, Docker-as-requirement
- Implementing 001 (`/speckit.implement` on 001 remains refused)
