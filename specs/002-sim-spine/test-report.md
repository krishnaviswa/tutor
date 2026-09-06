# Tester report — 002-sim-spine

Status: **Ship** (converge after T0.1). Do not expand the 002 slice.

Command: `cd backend; python -m pytest` — **11 passed** (2026-09-06). `live_calls == 0` enforced in `conftest.py` teardown.

| AC | Result | Evidence |
|---|---|---|
| 1 Tenant isolation | Pass | `test_isolation.py` — exam cannot read language roster/timeline |
| 2 No 48th screen / no `/sim/login` | Pass | `test_parent.py::test_catalog_paths_only_no_sim_login` |
| 3 Mock ports | Pass | `create_app` rejects non-mock providers; `live_calls == 0` |
| 4 Demo remains UI gold | Pass (manual) | No Next.js; demo HTML untouched in 002 |
| 5 Durable spine store | Pass | SQLAlchemy spine tables + seed; pytest in-memory SQLite |
| 6 Spec Kit gate | Pass | Implement landed after Specified + human OK |
| 7 Three job-arrangement seeds | Pass | `exam-prep`, `language-1on1`, `music` in `seed.py`; Biology not required |
| 8 Auth stub roles | Pass | OTP `000000`; owner/teacher/assistant/student/parent logins in suite |
| 9 Exam-prep faculty skip staff-login | Pass | `test_exam_prep_teacher_skips_staff_login_screen` |
| 10 Record → timeline in A only | Pass | `test_record_timeline.py` |
| 11 Parent hub linked child only | Pass | `test_parent.py` |
| 12 Quota warn 80% / block 100% | Pass | `test_quotas_rbac.py`; record still writes when WhatsApp blocked |
| 13 Timeline is ledger; channels mock | Pass | `notify.dispatch_after_timeline`; student WhatsApp default off |
| 14 001 not rewritten | Pass | 001 remains Specified architecture pack |
| 15 Closed vertical only | Pass | Spine + seed + auth + roster/cohort + record + parent stubs + quotas |
| 16 Backend + seed feels live | Pass | FastAPI `/api/v1` against models; HTML rewrite not required |

Recommendation: **PM Accept 002**. Protected tests remain the 003 phase gate.
