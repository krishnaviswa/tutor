# test-report.md — 007-sessions-timetable

| Field | Value |
|---|---|
| **Status** | Testing |
| **Run** | `cd backend && python -m pytest -q` → **52 passed**, `live_calls == 0` |
| **Frontend** | `cd frontend && npx tsc --noEmit` clean · `npm run build` compiled · 49 catalog routes |
| **Catalog** | `python scripts/build_catalog.py` → 49 screens · `build_role_html.py` regenerated · `check_architecture_parity.py` OK · `check_agent_config_sync.py` OK |

## AC evidence (`backend/tests/test_007_sessions_timetable.py`)

| AC | Test | Result |
|---|---|---|
| 1 past `scheduled` → `Auto completed` | `test_display_status_is_time_driven` | pass |
| 2 future `scheduled` → `Upcoming` | same | pass |
| 3 record filed → `completed` / `Staff completed` | `test_filing_record_marks_staff_completed` | pass |
| 4 owner re-times any state → `Upcoming` | `test_owner_can_move_time_in_any_state` | pass |
| 5 cancel keeps row, `?scope=cancelled`, `session.cancelled` timeline, mock notify | `test_cancel_keeps_row_and_writes_timeline` | pass |
| 6 `scope` / `student_id` / `teacher_id` filters | `test_scope_and_filter_params` | pass |
| 7 1-on-1 create + both/neither → 400 | `test_one_on_one_booking_and_guards` | pass |
| 8 availability PUT/GET, non-owner editing another → 403 | `test_availability_put_get_and_403` | pass |
| 9 date `block available=false` blocks a booking; normal day succeeds | `test_block_blocks_a_one_on_one_booking` | pass |
| 10 no rows → workspace fallback (006 behaviour) | `test_no_availability_rows_falls_back` | pass |
| 11 `GET /staff` for picker; student → 403/404 | `test_staff_list_and_isolation` | pass |
| 12 workspace A/B isolation on sessions/availability/staff | `test_staff_list_and_isolation` + isolation suites | pass |
| 13 002–006 green, `live_calls == 0`, factory rejects live provider | full `pytest -q` (52) + `test_006` factory test | pass |
| 14 catalog = 49 (`sessions`, `availability`) | `build_catalog.py` output + `test_seed_catalog.py` | pass |
| 15 README §5–§7, architecture HTML, product-viewer, work-log name 007 | manual — updated in this PR | done |

## End-to-end smoke (SQLite-backed API + `npm run dev`)

- `GET /api/v1/sessions?scope=cancelled` → the seeded cancelled session with `display_status: "Cancelled"`.
- `GET /api/v1/staff` → owner / teacher / assistant rows.
- `GET /api/v1/availability` → seeded Mon–Sat 06:00–21:00 windows + the 2026-12-25 time-off block.
- `/app/faculty/sessions` — Upcoming / Completed / Cancelled tabs + student filter render; 1-on-1
  row shows the student name.
- `/app/faculty/availability` — staff picker (self, disabled for teacher), weekly windows, date
  exceptions, Save.
- `/app/faculty/schedule` — per-session Reschedule + Cancel, cancelled session struck-through with
  no actions, "Show availability" shades day headers (`· free` / `· off`).

## Notes / follow-ups

- No Alembic in this repo (`create_all` only). Hosted Postgres needs a reseed or manual
  `ALTER TABLE scheduled_sessions ADD COLUMN …` + `CREATE TABLE staff_availability` — pytest
  (fresh SQLite) and `python -m app.seed_cli --reset` (Compose Postgres) pick the schema up
  automatically.
- Availability gates only bookings made *against* a person (student self-booking or a 1-on-1). A
  teacher scheduling their own cohort class is unchanged (not gated), which keeps the 006
  conflict-detection test intact.
- Seeded fixture ids: `cid(tag, 54)` past, `cid(tag, 55)` cancelled, `cid(tag, 56)` 1-on-1.
