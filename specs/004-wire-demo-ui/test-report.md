# test-report.md — 004-wire-demo-ui

| Field | Value |
|---|---|
| **Role** | Tester |
| **Verdict** | Ship |
| **Date** | 2026-09-06 |

## Gate

`cd backend && python -m pytest` after implement: **20 passed**.

Suites: `test_003_api`, `test_isolation`, `test_isolation_003`, `test_parent`, `test_quotas_rbac`, `test_record_timeline`.

002 spine (isolation, record→timeline, quotas/RBAC, parent hub) stayed green. 003 catalog APIs stayed green. Ports remain mock (`live_calls == 0` in those tests). No live WhatsApp / Meet / SMS.

Frontend: `npx tsc --noEmit` clean. `node scripts/check-routes.mjs` — 47 catalog routes present. `/` redirects to `/app/student/router`. `/operator` is not a catalog screen id.

## AC map

| AC | Result |
|---|---|
| 1 pytest gate | Pass — 20 passed |
| 2 tenant isolation | Pass — 002/003 isolation tests |
| 3 no 48th screen | Pass — operator index `/operator` only |
| 4 `/` → router | Pass |
| 5 OTP 000000, mock vendors | Pass |
| 6 LoginGate + catalog roles | Pass — dual-role `accept` list |
| 7 PhoneChrome appnav | Pass |
| 8 ParentChrome pnav | Pass |
| 9 faculty Content → library; no mandatory staff-login | Pass |
| 10 landings | Pass — student-dash / teacher-dash / parent-home |
| 11 join attendance; empty transcript | Pass — UI + existing APIs |
| 12 timeline ledger | Pass — existing 002/003 write path |
| 13 catalog APIs only | Pass — no new path ids |
| 14 keep wired schedule/session-pre/record/roster | Pass |
| 15 Biology example-only | Pass |
| 16 Accept docs | This change |

## Recommend

**Ship.** Screens marked `wired`. Incomplete demo tracks were not filled with invented ids.
