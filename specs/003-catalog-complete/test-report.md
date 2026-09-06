# Tester report — 003-catalog-complete

Status: **Ship** (converge after T0.1–T6.3). Accept at **shell/sim**, not `wired` demo. Do not expand 002. Do not invent ids.

Command: `cd backend; python -m pytest` — **20 passed** (2026-09-06). `live_calls == 0` enforced in `conftest.py` teardown.

Also: `npm run check-routes` — 47 catalog routes present. Catalog vs FastAPI: **84 / 84** `/api/v1` paths, **0** `/sim/*`. `python scripts/check_architecture_parity.py` OK (47 screens). `python scripts/check_agent_config_sync.py` — all paired files exist.

| AC | Result | Evidence |
|---|---|---|
| 1 002 suite stays green | Pass | `test_isolation.py`, `test_record_timeline.py`, `test_quotas_rbac.py`, `test_parent.py`; 20 passed including 002 cases |
| 2 New tables isolated A vs B | Pass | `test_isolation_003.py` — 17 promoted entities workspace-disjoint |
| 3 No 48th screen | Pass | `catalog/screens.json` 47 ids; `frontend/scripts/check-routes.mjs`; architecture-parity OK |
| 4 Mock ports; failed send does not roll back ledger | Pass | `create_app` rejects non-mock providers; `live_calls == 0`; `test_quota_block_skips_whatsapp_record_still_writes` |
| 5 Demo gold until `wired`; exam-prep omits staff-login | Pass (shell) | All screens `shell`; demo HTML untouched as gold; `EXAM_PREP_HIDE`; `test_exam_prep_teacher_skips_staff_login_screen` |
| 6 001 not rewritten / not implemented | Pass | 001 remains Specified architecture pack |
| 7 002 close-out without expanding slice | Pass | `specs/002-sim-spine/test-report.md` Ship; 002 routers kept; no `/sim/login` (`test_catalog_paths_only_no_sim_login`) |
| 8 Seventeen `later` entities durable + workspace-scoped | Pass | `catalog/entities.json` all `spine`; models in `tables.py` have `workspace_id`; no syllabus/Biology tables |
| 9 Fifty-one planned APIs under `/api/v1` | Pass | Catalog 84 paths all `sim`; FastAPI registers 84 `/api/v1` routes; 0 missing vs catalog |
| 10 Timeline first; student WhatsApp default off; QuotaGuard | Pass | `notify.dispatch_after_timeline`; seed `student_whatsapp=0`; prefs default student WhatsApp false; quota warn/block tests |
| 11 One Next.js route per catalog id; G1 missing → 404 | Pass (shell) | 47 `page.tsx` routes; `deps._g1` raises 404 `module off`; roles owner\|teacher\|assistant\|student\|parent |
| 12 Parent hub child rows in A only | Pass | `test_parent.py`; invoices isolation in `test_assignment_grade_and_mock_checkout`; attempts isolation in `test_practice_attempt_timelines_in_a_only` |
| 13 Join writes attendance; video URL is not truth | Pass | `test_join_writes_attendance_in_a_only`; stolen token from workspace B → 403 |
| 14 Transcript stays empty | Pass | `test_live_rbac_and_empty_transcript` — `transcript == []` |
| 15 Implement only after Specified + HTML OK | Pass | Human OK recorded in checklist + tasks Gate; implement landed after that |
| 16 Accept updates README, catalog, architecture, hub, work log | Pass | This Accept change |
| 17 Optional Postgres; pytest SQLite | Pass | `conftest.py` `sqlite:///:memory:`; Docker not required to Accept |
| 18 Biology/NEET example-only | Pass | Seeds are exam-prep / language / music; `docs/examples/` unchanged as requirements |
| 19 HTML guide is documentation | Pass | `plan-viewer.html` + satellites remain docs, not a 48th screen |

## Converge gaps (do not block Accept)

- **Screens are `shell`, not `wired`.** Spec AC 5 allows this: demo stays UI gold until wired. T4.3–T4.9 shipped catalog routes, not demo-fidelity clients. Wiring is a follow-up feature, not remaining 003 work.
- **Thinner HTTP tests** on doubts, announcements, dashboards, reports, automation, audit, threads. Tables are isolation-tested; routers exist on catalog paths. Residual coverage, not missing APIs.
- **Docker is not installed** in this workspace. Compose Postgres is optional (AC 17). pytest is the ship gate.
- **Live vendors** remain out of scope (mock default).

## 002

Protected and green. Do not rewrite spine behaviour.

Recommendation: **PM Accept 003** at shell/sim.
