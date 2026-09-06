# Requirements checklist (reviewer-owned)

Human OK for implement is the 004 chat (this session). Architect attests design items.

## Blocks implement

- [x] Human walked `specs/004-wire-demo-ui/spec.md` (stories + ACs) — this chat
- [x] Human OK in chat before `/speckit.implement` — this chat is the single OK
- [x] 002 + 003 pytest remain required as a phase gate after each wave
- [x] Mock ports only — no live Meta / Google / Razorpay
- [x] No new screen ids (closed set in `catalog/screens.json` only)
- [x] 002 not rewritten; 003 APIs not replaced; kept wired screens not rewritten

## Architect attested (this pass)

- [x] `plan.md` written: chrome, landings, API table by wave, RBAC, ports, QuotaGuard
- [x] Screen ids from `catalog/screens.json` only
- [x] APIs from `catalog/apis.json` / per-screen `apis` only
- [x] Subject as `taxonomies` / `topics` only
- [x] Timeline is the ledger; channels mock after timeline write
- [x] Exam-prep faculty start: not mandatory `staff-login`
- [x] Demo HTML remains UI gold until `wired`
- [x] `/` → `/app/student/router`; operator index is not a catalog id
- [x] PhoneChrome / ParentChrome / faculty Content → `library`
