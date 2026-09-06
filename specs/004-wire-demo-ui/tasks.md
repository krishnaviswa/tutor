# tasks.md — 004-wire-demo-ui

Builder implements on `cursor/004-wire-demo` after human OK (this chat). Never `main`. Do not invent ids. Do not rewrite 002. Keep wired: `schedule`, `session-pre`, `record`, `roster`.

Phase gate: after **each wave**, `cd backend && pytest`. If red, **stop that wave**, fix, re-run.

## Gate

- [x] Human walked spec.md + plan.md
- [x] Human OK to implement (004 chat)
- [x] Branch not `main` / `master` (`cursor/004-wire-demo`)

---

## Wave 0 — Chrome (sequential, unblocks rest)

### T0.1 — Product home
- Redirect `/` → `/app/student/router`. Operator index (if kept) is not a catalog screen id.

### T0.2 — PhoneChrome / ParentChrome
- Student `appnav`: Home, Classes, Practice, Doubts, You.
- Parent `pnav`: Home, Activity, Reports, Fees, Chat.

### T0.3 — AppChrome / LoginGate
- Faculty nav: add Content → `library`. Exam-prep omits mandatory `staff-login`.
- Reuse LoginGate on every gated screen. Additive `accept` list allowed for dual-role catalog ids.

---

## Wave 1 — Identity

`router`, `student-login`, `staff-login`, `parent-link`. Landings: student-dash; exam-prep faculty teacher-dash/schedule; parent-home.

## Wave 2 — Faculty nav

`teacher-dash`, `qbank`, `practice-build`, `doubt-teacher`, `library`, `cohort-builder`, `messages`, `announce`

## Wave 3 — Sessions

`join`, `live-teacher`, `live-student`, `session-video`

## Wave 4 — Practice

`assign-issue`, `assign-grade`, `practice-play`, `practice-result`, `test-setup`, `test-runner`, `analysis`

## Wave 5 — Student

`student-dash`, `lesson`, `timeline`, `doubt-student`, `notif-prefs`, `payments`

## Wave 6 — Parent + owner

`parent-home`, `owner`, `billing`, `reports`, `mentor`, `audit`, `integrations`, `subscription`, `payouts`

## Wave 7 — Onboarding

`wsetup`, `onboard-kind`, `template-gallery`, `branding`, `automation`

---

- [x] Builder waves 0–7
- [x] Tester after each wave (002 + 003 green)
- [x] PM Accept: catalog `wired`, README, product-viewer, work-log
