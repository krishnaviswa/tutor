# Requirements checklist (reviewer-owned)

Unchecked items **block** `/speckit.implement`. Architect may attest design items; humans must walk spec and OK implement.

## Blocks implement

- [x] Human walked `specs/002-sim-spine/spec.md` (13 stories, 16 ACs) and this plan
- [x] Tenant isolation test is required in tasks (workspaces A vs B; no cross-tenant read/mutate)
- [x] Mock ports only (WhatsApp, email, push, SMS, Meet, storage local, payments) — no live Meta / Google / Razorpay
- [x] No new screen ids (closed set in `catalog/screens.json` only)
- [x] Human OK before `/speckit.implement` (tasks exist; 8-step gate)

## Architect attested (this pass)

- [x] `plan.md` written: layers, API table, RBAC, data, ports, QuotaGuard
- [x] Engine: SQLAlchemy models for PostgreSQL; default sim SQLite file; optional Postgres — not a product AC
- [x] APIs: catalog ids only; no new path ids
- [x] Entities: 18 spine + promoted `usage_meters` + `quota_policies` for AC 12
- [x] Subject as `taxonomies` / `topics` only — no syllabus tables
- [x] Timeline is the ledger; WhatsApp/email/push after timeline write; teacher, parent, admin; student WhatsApp owner-gated default off
- [x] Parent hub child screens (`practice-result`, `payments`, `messages`, plus `reports`, `notif-prefs`) stub empty — no 48th screen, no full practice/billing
- [x] Exam-prep faculty start: `cohort-builder` / `schedule`, not mandatory `staff-login`
- [x] Demo HTML remains UI gold; full Next.js wiring not required
- [x] 001 artifacts not rewritten
- [x] Implement blocked until Specified + tasks + human OK
