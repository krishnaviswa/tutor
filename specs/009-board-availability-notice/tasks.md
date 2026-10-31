# tasks.md — 009-board-availability-notice

| | |
|---|---|
| **Status** | Specified |
| **Spec** | [spec.md](spec.md) · [plan.md](plan.md) |
| **Rule** | Same 49 screen ids. Same `/api/v1` path ids. Mock ports. No student WhatsApp by default. |
| **Do not** | Implement before the gate below is checked by a person. Do not commit from the planning pass. Do not edit 007 or 008 spec artifacts. Do not set this feature to In Progress, Testing, or Accepted. |

## Gate — human OK

- [ ] **Human OK to implement.** A person checks this box. Until then every task below stays undone.
- [ ] `/speckit.implement` has not been run for this directory.

Nothing under T9 is authorized while the gate is open.

## T9.1 — Board document (service)

Depends on the gate.

- **Files:** `backend/app/services/sessions.py` (and the board PUT model next to `backend/app/api/v1/sessions.py` only as a thin body). Do not put storage or quota decisions in the router.
- **Do:** Extend the board JSON with `texts`, `placements`, `erases`, ten named colors, crop rect, legacy `strokes` still readable. Storage port `local_put` only from the service. `quota.decide_paid_send(..., "storage")` before a new file. Reject unknown colors. Erases do not delete placements.
- **AC:** 1–9.

## T9.2 — Paint toolbar (existing live screens)

Depends on T9.1.

- **Files:** `frontend/components/studio/SessionBoard.tsx`, `frontend/components/wired/LiveTeacherScreen.tsx`, `frontend/components/wired/LiveStudentScreen.tsx`. No new route, no new screen id.
- **Do:** Finite page. Toolbar: pencil, ten colors (black, white, red, orange, yellow, green, blue, purple, brown, gray), eraser, text, pointer/select, crop. Text is one face and one size. Pointer does not draw. Crop only on a selected image or PDF page. Placed file stays under the ink. Both live screens share one saved board. This task stays in 009. Do not rebuild it under 010.
- **AC:** 1–7.

## T9.3 — 15-minute multi-window availability

Depends on the gate. Independent of T9.1.

- **Files:** `backend/app/api/v1/availability.py` (thin), `backend/app/services/internal_v2.py` (validation + student teacher set). `frontend/components/wired/AvailabilityScreen.tsx`, `frontend/components/wired/ScheduleScreen.tsx`.
- **Do:** Accept many windows per weekday, including 10:00–10:30 and 10:45–11:15. A whole day is not required. Reject off-grid, reversed, and overlapping intervals. Keep 007 no-rows fallback. Schedule overlay shows the 10:30–10:45 gap as unavailable. The student who can read the windows is a student tied to that teacher. Do not add columns. Do not add a screen. This task stays in 009. Do not rebuild it under 010.
- **AC:** 10–13, 15–16.

## T9.4 — Student can track windows

Depends on T9.3.

- **Files:** `backend/app/services/progress.py` (`teacher_windows` on the student dashboard), `frontend/components/wired/StudentDashScreen.tsx`. Student read of existing `schedule` and `availability` screens only — read-only, their teachers only.
- **Do:** No booking control. No new screen id. Catalog role reader for student on those two ids if the nav link needs it; regenerate catalog from the script, do not hand-invent an id.
- **AC:** 14, 16.

## T9.5 — Doubt clarified notice

Depends on the gate. Independent of T9.1 and T9.3.

- **Files:** `backend/app/api/v1/comms.py` (thin PATCH), timeline + `notify.deliver_in_app` from the service path the router already uses. `frontend` doubt-teacher resolve label, `doubt-student`, `timeline` if the event is not already visible from the existing list.
- **Do:** Transition into `answered` writes one `doubt.answered` timeline event whose body says the doubt was clarified, then an in-app delivery for that student, then existing channel dispatch. The student may accept the notice or ignore or dismiss it. Either is complete. Do not require acceptance. Do not set `student_whatsapp`. Do not notify twice. Do not add assistant resolve. This task stays in 009. Do not rebuild it under 010.
- **AC:** 17–21.

## T9.6 — Tests

Depends on T9.1–T9.5.

- **Files:** `backend/tests/test_009_board_availability_notice.py`.
- **Do:** Cover the cases in [test-plan.md](test-plan.md). Mock ports only. `live_calls == 0`. Do not weaken 002–008 tests. 007 fallback (no availability rows) stays green.
- **AC:** 22–23.

## T9.7 — Catalog shows (after behavior exists)

Depends on T9.2, T9.4, T9.5.

- **Files:** `scripts/build_catalog.py` contract `shows` text for the existing ids only, then `python scripts/build_catalog.py`. Demo `R` for `live-teacher`, `live-student`, `availability` if gold would otherwise lie. Do not copy demo HTML into `product-viewer.html`.
- **Do:** Screen count stays 49.
- **AC:** 22.

## T9.8 — Tester and PM (later)

Depends on T9.6 and T9.7.

- **Do:** Execute test-plan.md. Write `test-report.md` only after tests actually run. `/speckit.converge` then. PM Accept is a separate human step. Not part of planning.
- **Do not:** Mark this box during the planning pass.

## Explicitly not tasks

- Implementing during planning.
- New screen ids.
- Editing `specs/007-sessions-timetable/*` or `specs/008-billing-v2/*`.
- Enabling student WhatsApp.
- Committing or pushing unless a person asks in a later message.
