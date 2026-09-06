# tasks.md — 002-sim-spine

Builder implemented on `cursor/002-sim-spine` after human OK. **Tester + PM Accept closed** (`test-report.md`, Ship). Do not expand this slice.

## Gate

- [x] Human walked spec.md + plan.md (checklist: Blocks implement)
- [x] Human OK to `/speckit.implement`
- [x] Branch not `main` / `master` (`cursor/002-sim-spine`)

## T0 — Scaffold

- [x] `backend/` FastAPI app: `app/main.py`, `/api/v1` prefix, CORS + request-id middleware stubs
- [x] SQLAlchemy 2 engine: models written for PostgreSQL; default SQLite file; tests in-memory; optional `DATABASE_URL`
- [x] `backend/data/` gitignored; `.env.example` names only
- [x] Ports: mock adapters

## T1 — Spine schema

- [x] 18 spine + `usage_meters` + `quota_policies`
- [x] `users` is the person; memberships bind workspace + role
- [x] `create_all` + seed (`python -m app.seed_cli`)
- [x] Seed ≥3 workspaces (exam-prep 80% warn, language 100% block, music low)

## T2 — Middleware + auth stub

- [x] Request id, JWT tenant+authn, `require_roles`, G1 404, QuotaGuard on paid notify, idempotency header, audit on notify
- [x] Catalog auth APIs + mock OTP `000000` / magic-link
- [x] Exam-prep teacher teaching APIs without staff-login screen

## T3–T6

- [x] Workspace, roster, cohort, parent-link, parent/home
- [x] Sessions + PATCH record → timeline + mock notify
- [x] Owner usage / subscription / quotas
- [x] Parent hub stubs empty

## T7 — Tests

- [x] Isolation, RBAC, record→timeline, parent link, quotas, live_calls == 0, no `/sim/login`

## T8 — Docs

- [x] Catalog entities + API `sim` status + README + feature.json 002
- [x] Demo HTML not rewritten as Next.js
