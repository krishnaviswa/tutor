# tasks.md — 007-sessions-timetable

Status: **Testing** (implemented; 52 pytest + tsc + build green). Ladder: Draft → Specified → In Progress → Testing → Accepted.

## T7.1 — Model
- [x] `ScheduledSession`: `student_id`, `ends_at`, `status`, `cancelled_at`, `cancel_reason`,
  `completed_at`; `cohort_id` nullable.
- [x] New `StaffAvailability` table.
- [x] `staff_availability` in `build_catalog.py entities()`.

## T7.2 — Services
- [x] `internal_v2.staff_available()`; `teacher_conflict()` skips cancelled.
- [x] New `services/sessions.py`: `display_status`, `session_out`, `list_sessions`, `cancel`.
- [x] `record.patch_record()` stamps `completed` + `completed_at` (guard `cohort_id` None).

## T7.3 — API
- [x] `sessions.py`: `GET` filters; `POST` 1-on-1 + 400 guards; `PATCH` `status`/`ends_at`.
- [x] New `availability.py`: `GET /availability`, `PUT /staff/{id}/availability`, `GET /staff`.
- [x] Register router in `factory.py`; add prefixes to `deps.py`.

## T7.4 — Catalog + demo
- [x] `tutor-platform-demo.html`: `S`, `WHY`, `R['sessions']`, `R['availability']`, `t1`/`t2` steps,
  `R['schedule']` cancelled + availability styling.
- [x] `CONTRACTS` rows in `build_catalog.py`; `schedule` contract updated.
- [x] Run `build_catalog.py` + `build_role_html.py`. Catalog = 49.

## T7.5 — Frontend
- [x] `catalog-screens.ts` two rows (hand-edit).
- [x] `sessions/page.tsx`, `availability/page.tsx`.
- [x] `AppChrome.tsx` nav.
- [x] `SessionsScreen.tsx`, `AvailabilityScreen.tsx`, `ScheduleScreen.tsx` updates.

## T7.6 — Seed
- [x] Teacher `StaffAvailability` windows + a block in `seed_internal_v2.py`.
- [x] One past + one cancelled session per seeded workspace.

## T7.7 — Tests + docs
- [x] `backend/tests/test_007_sessions_timetable.py` (AC 1–14).
- [x] `README.md` §5–§7, architecture HTML, `product-viewer.html`, `work-log.html`.
- [x] `specs/007-sessions-timetable/test-report.md`.
