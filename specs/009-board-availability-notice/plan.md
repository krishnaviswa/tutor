# plan.md — 009-board-availability-notice

| Field | Value |
|---|---|
| **Status** | Specified |
| **Role** | Architect |
| **Spec** | [spec.md](spec.md) · **Tasks** | [tasks.md](tasks.md) |
| **Gate** | Human OK on tasks.md is unchecked. No application code in this pass. |

Technical approach only. Stack is unchanged. No new screen id. No live vendor.

## Stack

| Layer | Choice | 009 note |
|---|---|---|
| UI | Next.js 15, one route per catalog id | Enrich `live-teacher`, `live-student`, `availability`, `schedule`, `student-dash`, `doubt-teacher`, `doubt-student`, `timeline`. No new route. |
| API | FastAPI `/api/v1` | Same path ids. Richer JSON. Logic in services. Routers stay thin. |
| Data | Compose Postgres locally; pytest SQLite | No new table. `scheduled_sessions.board` JSON grows. `staff_availability` rows gain a validation rule, not new columns. |
| Auth | OTP + JWT, existing roles | Student read of availability is new. Student WhatsApp flag is not changed. |
| Ports | Mock / local | Storage port for placed files. `create_app` still refuses non-mock providers. |

## Layers

```
live-teacher / live-student
  → existing GET/PUT /api/v1/sessions/{id}/board
  → services/sessions.py (board document)
  → storage port local_put inside the service
  → QuotaGuard on meter "storage" before the put

availability / schedule / student-dash
  → existing PUT /api/v1/staff/{id}/availability
  → existing GET /api/v1/availability
  → existing GET /api/v1/me/dashboard
  → services/internal_v2.py staff_available (already interval-based)
  → validation helper next to it (15-minute, overlap, multi-window)

doubt-teacher
  → existing PATCH /api/v1/doubts/{id}
  → timeline.append (ledger) then in-app delivery
  → notify.dispatch_after_timeline unchanged (student WhatsApp only if owner flag already on)
```

Do not call the storage port, WhatsApp, or disk from a router.

## Screen ids (closed set)

| Id | 009 behavior |
|---|---|
| `live-teacher` | Paint toolbar for owner and teacher. Shared finite board. |
| `live-student` | Same toolbar for a student in the session. |
| `availability` | Many 15-minute windows per weekday, plus date exceptions on the same grid. Student opens this id read-only for their teachers. |
| `schedule` | Overlay shows sub-hour gaps, not a single shaded block per day. Student read-only for their teachers. |
| `student-dash` | Lists those published windows so the student can track them from home. |
| `doubt-teacher` | Resolve control is the clarified action. Owner and teacher only. |
| `timeline` | Student sees one `doubt.answered` event when the doubt first becomes resolved. |
| `doubt-student` | Same doubt shows resolved, with the answer. |
| `sessions` | Unchanged. Booked sessions, not the free-window editor. |
| `notif-prefs` | Unchanged. Do not add a control that turns student WhatsApp on. |

Catalog `roles` on `schedule` and `availability` may add `student` as a reader. That is not a new id. Routes stay the existing ones. Student nav may link to those existing ids; it must not add a route that is absent from `catalog/screens.json`.

## API contract (existing paths, additive JSON)

| Path | Change |
|---|---|
| `GET /api/v1/sessions/{id}/board` | Still returns legacy `strokes` and `updated_at`. Also returns `texts` and `placements`. A board saved before this feature has empty `texts` and `placements`. |
| `PUT /api/v1/sessions/{id}/board` | Body grows: `strokes` (pencil segments: id, x1, y1, x2, y2, color), `erases` (id, x1, y1, x2, y2 — remove marks, not placements), `texts` (id, x, y, body, color), `placements` (id, kind `image` \| `pdf-page` \| `sheet`, name, storage_path, page, x, y, w, h, crop `{x,y,w,h}` or null). Optional `file` on a placement `{name, media_type, bytes_b64}` is stored by the service via the storage port; the router does not touch disk. Response is the same document. |
| `GET /api/v1/availability` | Returns every window, not one per weekday. Student role allowed. A student may pass `teacher_id` only for a teacher on a session they belong to; otherwise 404. Owner and assistant may read any staff member in the workspace. A teacher may read their own. |
| `PUT /api/v1/staff/{id}/availability` | Same body `{windows, blocks}`. Service rejects a window or block that is not on a 15-minute boundary, has end ≤ start, or overlaps another interval of the same kind on that day or date. Multiple windows per weekday are stored as multiple `staff_availability` rows (`kind=window`). Adjacent intervals are kept as separate rows. |
| `POST /api/v1/sessions` | No new fields. `staff_available` already tests whether `starts_at` falls inside any window. A start in the 10:30–10:45 gap fails the existing "outside availability" rule. Do not change the no-rows workspace fallback. |
| `GET /api/v1/me/dashboard` | Add `teacher_windows`: `{teacher_id, display_name, windows: [{weekday, start, end}]}` for the student's teachers. Keep existing keys (`next_session`, `doubt`, and the rest). |
| `PATCH /api/v1/doubts/{id}` | On transition of `status` into `answered`, after the row is updated: `timeline.append` with event type `doubt.answered` and a body that says the doubt was clarified (include a short slice of the answer when present). Then `notify.deliver_in_app` for that `student_id`. Then the existing `dispatch_after_timeline`. If status was already `answered`, do not append another `doubt.answered`. Other patches may keep today's `doubt_updated` write so older callers still get a ledger line. |
| `GET /api/v1/students/{id}/timeline` | No new path. The new event is visible to the student who owns it, and to faculty/parent who can already read that timeline. |
| `GET /api/v1/doubts` | No new path. `status` `answered` is what `doubt-student` renders as clarified. |
| `GET /api/v1/notifications/inbox` | No new path. The in-app row is what the student inbox already lists. |

No new `/api/v1` path id. File bytes ride on the existing board PUT. If a builder finds base64 on that PUT too large for the storage port, they stop and ask — they do not invent a screen, and they do not add a path id without a catalog edit in the same change. Preferred design is the same path.

## Board document

`scheduled_sessions.board` stays JSON on the existing column (`workspace_id` already on the session row).

```
{
  strokes: [...],
  erases: [...],
  texts: [...],
  placements: [...],
  updated_at: iso
}
```

- Finite page. Keep the current view box (1600×1000). Do not add pan/zoom-to-infinity.
- Draw order: placements on the bottom, then strokes, then texts. Erases remove strokes and texts they hit; they do not remove placements.
- Crop is `placements[].crop` in the image's own box. The other client paints that rectangle.
- `kind=pdf-page` is one placement per page, with `page` index, stored as an image the storage port wrote. `kind=sheet` is the non-image, non-PDF case: name only, no crop tool.
- Colors stored as the ten named values: `black`, `white`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `brown`, `gray`. Clients map them to paint. Reject any other color on PUT.
- Legacy strokes that used ad-hoc CSS colors still **read**. A new save rewrites colors to the ten names.

Toolbar on both live screens, one row: pencil, the ten colors, eraser, text, pointer, crop. Crop is enabled only when a placement of kind `image` or `pdf-page` is selected. Pointer does not emit strokes.

Access stays `assert_board_access`: owner and teacher read/write; student in the session read/write; assistant read-only; parent forbidden; student not in the session 404.

## Availability rule

007 model (do not add columns):

```
kind window | block
weekday Mon..Sun     (window)
on_date YYYY-MM-DD   (block)
start_time HH:MM
end_time HH:MM
```

New validation, in the service, before rows are replaced:

- Parse `HH:MM`. Minutes must be 0, 15, 30, or 45.
- `end > start` on the same day (no overnight window in this feature).
- Same weekday, two windows overlap → 400. Touching endpoints do not overlap.
- Same date, two blocks overlap → 400.
- Replace-all on PUT stays (007 behavior), so the saved list is the full set.
- `staff_available` already returns true when any window covers the instant and a same-day block can override. Do not collapse windows in the API or in `AvailabilityScreen` (today the UI keeps `Record<weekday, one window>` — that is the bug to remove).
- Schedule overlay shades the complement of the union of windows, at least to the 15-minute step, so 10:30–10:45 is visibly closed.

Student teacher set: distinct `teacher_user_id` on sessions where `student_id` is the student, or `cohort_id` is a cohort with an active enrollment for the student. Empty set → empty `teacher_windows` and 404 on a `teacher_id` probe.

Booking: no new student POST. 007's outside-availability 400 remains the enforcement for staff-created sessions.

## Doubt notice

Resolve actor: `require_roles("owner", "teacher")` on the existing PATCH. Do not add `assistant`.

Transition: previous status ≠ `answered` and new status = `answered`.

Ledger first:

- `event_type`: `doubt.answered` (catalog name on `doubt-teacher`).
- Body, subject-neutral, for example: `Doubt clarified.` plus up to 80 characters of the answer when the answer is non-empty.
- `student_id` is the doubt's student. `actor_user_id` is the teacher or owner.

Then channel, never instead of the ledger:

- `deliver_in_app` for that student id (existing in-app path).
- `dispatch_after_timeline` as today. It adds the student WhatsApp role only when `student_whatsapp` is already true. This feature must not set that flag.

`doubt-student` copy: status `answered` is shown as clarified. `student-dash` already surfaces a doubt outcome from status; leave that field, and make sure an `answered` doubt still reads as resolved there.

Idempotent: a second PATCH that leaves status `answered` does not append another `doubt.answered`.

## RBAC

| Action | Owner | Teacher | Assistant | Student | Parent |
|---|---|---|---|---|---|
| Write board | yes | yes | no | if in the session | no |
| Read board | yes | yes | yes | if in the session | no |
| Edit own availability | yes | yes | own row only if 007 already allows; 007 PUT forbids non-owner editing someone else | no | no |
| Edit another staff member's availability | yes | no | no | no | no |
| Read any staff availability | yes | self; assistant as 007 (any in workspace) | as 007 | only their teachers | no |
| Book from the grid | unchanged (staff) | unchanged | unchanged | no new path | no |
| Resolve doubt | yes | yes | no | no | no |
| Read own clarified timeline | — | if they can already read that student | same | own student row | linked child, existing rule |

Workspace isolation on board, availability, and timeline. Cross-workspace id → 404.

## Ports and QuotaGuard

- Storage: service calls the storage port's existing local put. Router does not. Before put, `quota.decide_paid_send(db, workspace_id, "storage")`. If not allowed, 400 (or the quota module's block result) and do not change the board. Increment the storage meter by 1 per successful new file (not per poll, not per ink save).
- Replacing ink/text/crop without a new file does not increment storage.
- WhatsApp / email / push: no new send for Epic A or B. Epic C uses the existing dispatch. Student WhatsApp remains default off (`DEFAULT_ROLE_CHANNELS` student whatsapp false, and the owner flag).
- Board sync and timeline read are always-on. They are not metered.
- `live_calls` stays 0. Tests use mocks only.

## Data impact

- No new entity id. `catalog/entities.json` unchanged.
- No syllabus / subject table. Placements are files, not topics. A doubt may already have `topic_id`; this feature does not require one.
- `workspace_id` remains on the session, the availability row, the doubt, and the timeline event.
- Postgres `create_all` / existing JSON column. No Alembic. pytest SQLite in memory.

## Catalog copy (implement time, not this pass)

When a human has said OK and a builder lands the behavior, update `shows` text for the screens in the table above through `scripts/build_catalog.py` contracts. Do not add a screen. Do not paste demo HTML into `product-viewer.html`. Demo `R['live-teacher']` / `R['live-student']` / `R['availability']` may gain the paint tools and multi-window editor so gold matches the wired UI. That is a builder task after the gate.

## Risks

- PUT board with base64 can blow the JSON body. Cap follows the storage quota; reject oversize before `local_put`.
- Legacy three-color strokes must still load.
- Availability UI must stop keying windows by weekday alone, or the second window in the hour is silently dropped.
- Writing `doubt.answered` plus the old `doubt_updated` on the same transition would double the ledger. Only `doubt.answered` on the resolving transition.
- Student read of `GET /availability` must not list every teacher in the tenant.
- Do not flip `student_whatsapp` while wiring the notice.

## Tests (for the later builder)

`backend/tests/test_009_board_availability_notice.py` covering AC in [test-plan.md](test-plan.md). Do not retitle or weaken `test_007_sessions_timetable.py`. The no-rows availability fallback test must stay green. `live_calls == 0`.

## What this plan does not do

No implement. No commit. Status stays Specified. 007 and 008 artifacts are not edited.
