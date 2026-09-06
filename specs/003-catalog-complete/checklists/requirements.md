# Requirements checklist (reviewer-owned)

Unchecked items **block** `/speckit.implement`. Architect may attest design items; humans must approve the HTML implementation guide.

## Blocks implement

- [x] Human walked `specs/003-catalog-complete/spec.md` (stories + ACs) and this plan
- [x] Human reviewed `plan-viewer.html` (and satellites) — functional, technical, sequenced E2E
- [x] Human OK in chat before `/speckit.implement`
- [x] 002 pytest remains required as a phase gate (isolation, record→timeline, quotas, parent, live_calls == 0)
- [x] Mock ports only — no live Meta / Google / Razorpay in CI
- [x] No new screen ids (closed set in `catalog/screens.json` only)
- [x] 001 not implemented; 002 not rewritten

## Architect attested (this pass)

- [x] `plan.md` written: layers, API table, RBAC, data, ports, QuotaGuard, Next.js
- [x] 17 later entities promoted in design with `workspace_id`
- [x] 51 planned APIs mapped to existing screen ids
- [x] Subject as `taxonomies` / `topics` only
- [x] Timeline is the ledger; channels mock after timeline write
- [x] Exam-prep faculty start: not mandatory `staff-login`
- [x] Demo HTML remains UI gold until `wired`
- [x] HTML guide is documentation; not the app
- [x] Implement blocked until Specified + tasks + HTML + human OK
