# spec.md — 007-sessions-timetable

| Field | Value |
|---|---|
| **Status** | Testing |
| **Role** | PM (specify) + Architect (plan) |
| **Feature directory** | `specs/007-sessions-timetable` |
| **Action items** | [tasks.md](tasks.md) |

## Why

006 Accepted the in-app depth on the same catalog. Scheduling stayed the thinnest part of it:
`schedule` renders a hardcoded Mon–Sat grid, `scheduled_sessions` has no status / end time / student
link, there is no way to cancel a session (the `session.cancelled` timeline event is declared but
never written), and availability is one workspace-wide JSON blob.

Teachers, parents, and admins cannot plan against that. 007 makes session state legible and adds the
two things a planning surface needs: **1-on-1 sessions** booked against a student the teacher already
added, and **per-staff availability** (weekly windows + one-off date exceptions) that both the staff
member and the office can see, with a week-grid overlay.

007 adds **two catalog screen ids** — `sessions` (list) and `availability` (staff availability) — and
**one entity**, `staff_availability`. Ports stay mock. Timeline stays the ledger. `create_app` still
refuses non-mock providers.

Human OK to implement is the 2026-09-10 plan chat (`.claude/plans/in-the-session-or-fluffy-cocoa.md`).

## User stories

### Session state

1. **As** a teacher, **I want** every session to carry a state — upcoming, auto-completed,
   staff-completed, or cancelled — computed automatically, **so that** the timetable shows what has
   happened without me stamping each one.
2. **As** a teacher, **I want** a past session with no cancellation to read "Auto completed" on its
   own once its time passes, **so that** the list is honest even when I forget to close it out.
3. **As** a teacher, **I want** filing a session record to mark that session "Staff completed",
   **so that** a session I actually wrapped up is distinguishable from one that only aged out.
4. **As** an owner or teacher, **I want** to edit a session's time in any state — including a
   completed or past one — **so that** a wrong time from a glitch can be fixed and the session
   returns to "Upcoming" when moved to the future.
5. **As** a teacher, **I want** to cancel a session and have it stay visible (struck through) in the
   week calendar, **so that** the cancellation is tracked and parents/admins are notified.

### Sessions list (`sessions`)

6. **As** a teacher, **I want** a `sessions` screen with Upcoming / Completed / Cancelled tabs,
   **so that** I can plan ahead and review what is done separately from the week grid.
7. **As** a teacher, **I want** a student dropdown on that screen listing the students I have already
   added — added students first — **so that** I can filter to one student's sessions.

### 1-on-1 booking

8. **As** a teacher, **I want** to book a session for a single student (not a cohort) from a
   dropdown of my added students, **so that** a 1-on-1 call is scheduled without a fake cohort.
9. **As** a teacher, **I want** a 1-on-1 booking to respect the assigned teacher's availability and
   conflict window, **so that** the calendar does not double-book.

### Staff availability (`availability`)

10. **As** a staff member, **I want** to mark my weekly available windows, **so that** bookings and
    the office see when I can teach.
11. **As** a staff member, **I want** to add a one-off date exception (time off, or extra
    availability on a date), **so that** a holiday or a swapped day is respected.
12. **As** an owner or another staff member, **I want** to see a staff member's availability,
    **so that** I can schedule around it — staff see their own by default; owner sees anyone.
13. **As** a teacher, **I want** a "Show availability" overlay on the week grid that shades the
    hours outside the selected staff member's windows, **so that** I place sessions in open time.

### Housekeeping

14. **As** anyone listing catalog screens, **I want** exactly the existing 47 ids **plus** `sessions`
    and `availability` — 49, closed — and no other new id.

## Acceptance criteria

1. Given a seeded session whose `starts_at` is in the past and `status` is `scheduled`, when
   `GET /api/v1/sessions` runs, then that row's `display_status` is `"Auto completed"`.
2. Given a future `scheduled` session, then its `display_status` is `"Upcoming"`.
3. Given a session record is filed (`PATCH /api/v1/sessions/{id}/record`), when the session is
   fetched, then `status` is `completed` and `display_status` is `"Staff completed"`.
4. Given a past or completed session, when an owner PATCHes `starts_at` to a future time, then the
   request succeeds (no state gate) and `display_status` becomes `"Upcoming"`.
5. Given a `PATCH /api/v1/sessions/{id}` with `status: "cancelled"`, then the row's `display_status`
   is `"Cancelled"`, it is still returned by `GET /api/v1/sessions` (and `?scope=cancelled`), a
   `session.cancelled` timeline event is written for each affected student, and a mock notification
   delivery row exists (teacher/parent/admin channel).
6. Given `GET /api/v1/sessions?scope=upcoming|completed|cancelled`, then only rows in that bucket are
   returned; `?student_id=` and `?teacher_id=` narrow the list; default (no scope) returns all.
7. Given `POST /api/v1/sessions` with `student_id` and no `cohort_id`, then a 1-on-1 session is
   created, `student_id` and `student_name` are on the response, and the availability + conflict
   checks still apply. Sending both `cohort_id` and `student_id`, or neither, is **400**.
8. Given a staff member with `staff_availability` weekly windows, when `PUT /api/v1/staff/{user_id}/
   availability` replaces them, then `GET /api/v1/availability?teacher_id={user_id}` returns the new
   windows and blocks. A staff member editing another staff member's availability without the owner
   role is **403**.
9. Given a staff member whose availability has a `block` with `available=false` on a date, when a
   session is posted for that teacher inside the blocked hours, then the API returns **400**
   ("outside availability"); a booking inside a weekly window on a normal day succeeds.
10. Given a teacher with **no** `staff_availability` rows, then booking falls back to the workspace
    availability window (006 behaviour) — 006 tests stay green.
11. Given `GET /api/v1/staff`, when an owner calls it, then it lists staff `{id, display_name, role}`
    for the picker; a student calling it is **403** (or 404 by G1).
12. Given two workspaces, when workspace B lists sessions / availability / staff, then no row from
    workspace A appears (isolation).
13. Given pytest, when 007 lands, then 002–006 stay green and `live_calls == 0`; `create_app` still
    raises on a non-mock provider.
14. Given `catalog/screens.json`, when anyone lists ids, then exactly 49 appear — the 47 plus
    `sessions` and `availability`; `python scripts/build_catalog.py` and
    `python scripts/build_role_html.py` regenerate cleanly.
15. Given Accept, when 007 closes, then `README.md` §5–§7, `tutor-platform-architecture.html`,
    `product-viewer.html`, and `work-log.html` name 007 and the two new screens.

## Out of scope

- Live Google/Outlook calendar sync, two-way free/busy, booking pages, buffers (blueprint B1 v3).
- Student-facing availability picker / self-serve booking UI beyond the existing 006 `POST` path.
- Recurring-session generator (RRULE), series edits, drag-to-reschedule.
- A 50th screen, custom roles, lifting the mock-port guard, rewriting the 002 spine.
- Attendance/anti-fraud changes; `record` screen redesign.

## Definition of done

- [ ] [tasks.md](tasks.md) complete.
- [ ] AC evidenced in `test-report.md`.
- [ ] Ports remain mock; 002–006 green.
- [ ] Catalog is 49 ids; role HTML regenerated.
