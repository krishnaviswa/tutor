# plan.md — 007-sessions-timetable

| Field | Value |
|---|---|
| **Status** | Testing |
| **Role** | Architect |
| **Spec** | [spec.md](spec.md) · **Tasks** | [tasks.md](tasks.md) |

## Stack

No new stack. FastAPI thin routers + services (mock ports), SQLAlchemy 2 (`create_all`, no Alembic),
Next.js 15 wired screens following `tutor-platform-demo.html`. pytest in-memory SQLite.

## Data model — `backend/app/models/tables.py`

`ScheduledSession` gains (all nullable / defaulted, additive):

| Column | Type | Notes |
|---|---|---|
| `cohort_id` | `String(36)` FK, **now nullable** | one of cohort/student set |
| `student_id` | `String(36)` FK `students.id`, nullable | 1-on-1 target |
| `ends_at` | `DateTime(tz)` nullable | service defaults to `starts_at + 90m` on read if unset |
| `status` | `String(20)` default `"scheduled"` | `scheduled \| completed \| cancelled` |
| `cancelled_at` | `DateTime(tz)` nullable | |
| `cancel_reason` | `String(200)` default `""` | |
| `completed_at` | `DateTime(tz)` nullable | stamped by record filing |

New table `StaffAvailability` (`workspace_id` + FK pattern of `Enrollment`):

```
id, workspace_id (index), user_id (FK users.id),
kind        String(10)   # "window" | "block"
weekday     String(3)    # "Mon".."Sun"  (window rows)
on_date     String(10)   # "YYYY-MM-DD"  (block rows)
start_time  String(5)    # "HH:MM"
end_time    String(5)    # "HH:MM"
available   Integer      # 1 = available, 0 = time off  (default 1)
note        String(200)  default ""
```

Add `staff_availability` to `catalog/build_catalog.py` `entities()` spine list.

Hosted Postgres has no migration path — `test-report.md` notes it needs a reseed / manual
`ALTER TABLE`. Fresh SQLite (pytest) and reseeded Compose Postgres are automatic.

## Services

- **`backend/app/services/internal_v2.py`**
  - New `staff_available(db, workspace_id, user_id, starts_at) -> bool`: reads `StaffAvailability`;
    date `block` rows win over weekly `window` rows; no rows ⇒ delegate to existing
    `in_availability(ws, starts_at)` (006 fallback) ⇒ `True`.
  - `teacher_conflict(...)`: also skip rows with `status == "cancelled"`.
  - Keep `in_availability(ws, starts_at)` unchanged (legacy fallback + 006 tests).
- **New `backend/app/services/sessions.py`** — all session read/derive/cancel logic:
  - `display_status(s, now)` → `"Upcoming" | "Auto completed" | "Staff completed" | "Cancelled"`.
  - `session_out(db, s)` → dict with `ends_at`, `student_id`, `student_name`, `status`,
    `display_status`, plus the existing fields.
  - `list_sessions(db, ws, *, scope, student_id, teacher_id, dt_from, dt_to)`.
  - `cancel(db, ports, ws, s, actor_user_id, reason, student_whatsapp_on)` — set status/`cancelled_at`,
    resolve affected students (cohort enrollment or `student_id`), `timeline.append(... "session.cancelled" ...)`
    per student, `notify.dispatch_after_timeline(...)`. Mirrors the fan-out in the router's `engagement()`.
- **`backend/app/services/record.py` `patch_record`** — after writing the record, set
  `session.status = "completed"`, `session.completed_at = utcnow()`.

## API — `backend/app/api/v1/`

`sessions.py` (router stays thin, delegates to the new service):
- `GET /sessions` — add `scope`, `student_id`, `teacher_id`, `from`, `to` query params. Response rows
  from `session_out`.
- `POST /sessions` — `SessionIn`: `cohort_id: str | None`, add `student_id: str | None`,
  `ends_at: datetime | None`. Exactly one of cohort/student → else 400. Availability check uses
  `staff_available`; conflict check unchanged.
- `PATCH /sessions/{id}` — `SessionPatch` gains `status: str | None` (`"cancelled"` only; anything
  else → 400) and `ends_at`. Cancel routes through `sessions_svc.cancel`. No state gate on
  `starts_at` / `ends_at` edits.

New `backend/app/api/v1/availability.py`, registered in `app/factory.py` under `/api/v1`:
- `GET /availability?teacher_id=` — windows + blocks for a user (self, or any for owner/assistant).
- `PUT /staff/{user_id}/availability` — body `{windows: [...], blocks: [...]}`, delete-and-recreate
  (same shape as `PATCH /cohorts/{id}`). Self or owner; else 403.
- `GET /staff` — `[{id, display_name, role}]` from `StaffMembership` + `users`; owner/teacher/assistant.
- Add `("/api/v1/availability", "B1")` and `("/api/v1/staff", "A3")` to
  `deps.py MODULE_FOR_PATH_PREFIX` so G1 gating is consistent.

## Catalog & demo

- `tutor-platform-demo.html`: add `'sessions'` and `'availability'` to `var S` (`role:'faculty',
  frame:'web', mod:'B1', dom:'B'`), to `var WHY`, add `R['sessions']` / `R['availability']` renders
  (console screens via `cons('teacher', 'Schedule', main)`), and a step for each in the `t1`/`t2`
  `steps:[]` next to `schedule`. Add `staff_availability` handling to `R['schedule']` (cancelled row
  style + availability shading is demo-static).
- `scripts/build_catalog.py`: add `CONTRACTS["sessions"]` and `CONTRACTS["availability"]`.
- Run `python scripts/build_catalog.py` then `python scripts/build_role_html.py`.
- `schedule` contract: `entities` += `staff_availability`, `apis` += `GET /api/v1/availability`.

## Frontend — `frontend/`

- `frontend/lib/catalog-screens.ts`: add the two rows by hand (do **not** run
  `scripts/gen_frontend_pages.py` — it clobbers wired pages).
- New `frontend/app/app/faculty/sessions/page.tsx` + `availability/page.tsx` — `LoginGate` +
  `AppChrome kind="faculty"` wrappers.
- `frontend/components/AppChrome.tsx`: `FACULTY_NAV` "Schedule" match += `sessions`, `availability`;
  add "Availability" nav item; `ADMIN_NAV` "Schedule" match += `sessions`, `availability`.
- New `frontend/components/wired/SessionsScreen.tsx` — tabs Upcoming/Completed/Cancelled over
  `GET /api/v1/sessions?scope=`, student `<select>` filter from `GET /api/v1/students`.
- New `frontend/components/wired/AvailabilityScreen.tsx` — staff picker (`GET /api/v1/staff`),
  weekly-window rows + date-exception rows, `PUT /api/v1/staff/{id}/availability`.
- `frontend/components/wired/ScheduleScreen.tsx` — cancelled rows struck through; compose drawer
  Cohort↔Student toggle with student `<select>`; "Show availability" toggle shading cells from
  `GET /api/v1/availability`; `SessionRow` type gains `status`, `display_status`, `student_name`.

## Seed

- `backend/app/services/seed_internal_v2.py`: give the seed teacher a couple of `StaffAvailability`
  weekly windows + one future `block` (time off) so the screens have data and AC 9/10 have fixtures.
- One extra past session (`status` left `scheduled`) and one `cancelled` session per seeded
  workspace for the list tabs.

## Tests — `backend/tests/test_007_sessions_timetable.py`

One test per AC group: derived status, record→completed, admin time override, cancel + timeline +
notify + still-listed, scope/student/teacher filters, 1-on-1 create + 400 guards, availability PUT/GET
+ 403, per-staff block blocks a booking, no-rows fallback, `GET /staff`, isolation A/B, 002–006 green
(existing suites), catalog is 49.

## Risks

- Signature churn on availability — mitigated by adding `staff_available` and leaving `in_availability`.
- `gen_frontend_pages.py` would overwrite wired screens — do not run it; hand-edit `catalog-screens.ts`.
- `cohort_id` becoming nullable: `record.py` else-branch reads `session.cohort_id` for enrollment —
  guard with `if session.cohort_id`.
