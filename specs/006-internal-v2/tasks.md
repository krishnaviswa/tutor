# 006 action items — in-app v2 (mock ports)

| | |
|---|---|
| **Status** | Accepted 2026-09-06 |
| **Spec** | [spec.md](spec.md) · [plan.md](plan.md) |
| **Rule** | Same 47 ids. Same `/api/v1` paths. No live adapters. |
| **Branch** | current feature branch — never `main` |
| **Do not** | Lift factory mock-only · Razorpay · Meet attendance · 48th screen |

## Gate

- [x] 005 Accepted
- [x] Human OK to implement in-app rest (vendor ports separated)
- [x] Factory still mock-only after implement

## T8.1 — `meta` JSON + seed facts

- **Files:** `backend/app/models/tables.py`, `backend/app/services/seed_internal_v2.py`
- **Do:** `meta` on listed tables; seed second guardian, waitlist, availability, coupons, restricted assistant, playlist, rubric assignment, tagged questions, scheduled announcement.

## T8.2 — `services/internal_v2.py`

- One place for meta get/set, conflict check, auto-assemble, SLA, proration, automation run.
- Routers stay thin.

## T8.3 — Phase A identity APIs + UI

- workspaces, auth/me, cohorts waitlist/invite, parent-links fee_visible, parent-home hide fees.
- Screens: `roster`, `cohort-builder`, `parent-home`, `student-login` (already dual method).

## T8.4 — Phase B classroom APIs + UI

- session conflict 409; student book; live chat/mcq; record capture; content playlist/drip; assignment rubric/late.
- Screens: `schedule`, `live-teacher`, `live-student`, `record`, `library`, `assign-issue`, `assign-grade`.

## T8.5 — Phase C practice APIs + UI

- question difficulty/usage; auto-assemble; test sections/negative/resume; analysis forced action; next-item.
- Screens: `qbank`, `practice-build`, `test-setup`, `test-runner`, `analysis`.

## T8.6 — Phase D record APIs + UI

- doubt queue/SLA/canned; thread read/attachments; announcement schedule; timeline filter/export/dispute; notif per-event.
- Screens: `doubt-teacher`, `messages`, `announce`, `timeline`, `notif-prefs`.

## T8.7 — Phase F/G ops APIs + UI + demo tracks

- auto-invoice/coupon/proration; payout statements; G1 preview; automation miss → backlog; demo TEMPLATES fill (no staff-login on exam-prep).
- Screens: `billing`, `payouts`, `owner`, `automation`. Files: `tutor-platform-demo.html`.

## T8.8 — Wired UI pass

- Show the new fields on the screens in T8.3–T8.7. No new routes.

## T8.9 — Tests

- `backend/tests/test_006_internal_v2.py`
- `cd backend; python -m pytest`
- `live_calls == 0`

## T8.10 — Catalog + product map

- `scripts/build_catalog.py` shows text; README §11–§12; product-viewer; work-log.

## T8.11 — Sealed ports check

- `factory.py` still RuntimeError on non-mock providers.
- Integrations still mock-connect.

## T8.12 — Tester converge + PM Accept

- `specs/006-internal-v2/test-report.md`

## Critical path

`T8.1 → T8.2 → T8.3 / T8.4 / T8.5 / T8.6 / T8.7 → T8.8 → T8.9 → T8.10 → T8.11 → T8.12`
