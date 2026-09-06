# test-report.md — 005-dashboard-density

| Field | Value |
|---|---|
| **Role** | Tester |
| **Verdict** | Ship |
| **Date** | 2026-09-06 |

## Gate

`cd backend && python -m pytest` after implement: **33 passed**.

Suites: `test_005_density`, `test_003_api`, `test_isolation`, `test_isolation_003`, `test_parent`, `test_quotas_rbac`, `test_record_timeline`.

002 spine stayed green. 003 catalog APIs stayed green. Ports remain mock (`live_calls == 0` in `conftest.py`). No live WhatsApp / Meet / SMS / Razorpay.

T7.1–T7.11 landed on `cursor/005-dashboard-density`. This report is T7.12 converge.

## AC map

| AC | Result |
|---|---|
| 1 student-dash named facts | Pass — `test_student_dashboard_named_next_actions` |
| 2 teacher-dash bars + chase | Pass — `test_teacher_dashboard_chase_and_bars_isolated` |
| 3 owner scorecard + quotas | Pass — `test_owner_console_scorecard_keeps_usage` |
| 4 parent numeric slice | Pass — `test_parent_home_linked_child_density_hides_student2` |
| 5 payments due + receipts | Pass — `test_invoices_and_reports_and_content_density` |
| 6 library / lesson kind | Pass — same |
| 7 reports term slice | Pass — same |
| 8 isolation + thin routers | Pass — language teacher cannot see exam-prep chase names; `progress.py` |
| 9 no 48th screen | Pass — same `catalog/screens.json` ids |
| 10 ledger tables only | Pass — no new syllabus tables |
| 11 seed after `--reset` | Pass — `seed_density.py` from catalog pack |
| 12 pytest + live_calls 0 | Pass — 33 passed |
| 13 catalog + product map | Pass — this Accept change |

## Converge

No remaining 005 tasks. Live vendors stay out of scope.

## Recommend

**Ship.** Mark 005 **Accepted**. Wired UI matches demo density on the eight screens. Mock checkout stays mock.
