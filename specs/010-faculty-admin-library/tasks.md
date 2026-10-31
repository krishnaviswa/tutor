# tasks.md — 010-faculty-admin-library

| | |
|---|---|
| **Status** | Specified |
| **Spec** | [spec.md](spec.md) · [plan.md](plan.md) |
| **Rule** | Frozen 2026-10-31, including row 21 and the parallel waves. One owner per file set when a later coordinator starts builders. |
| **Do not** | Implement before the gate below is checked by a person. Do not commit from the planning pass. Do not set this feature to In Progress, Testing, or Accepted. Do not rebuild 009 inside these tasks. |

## Gate — human OK

- [x] **Human OK to implement.** Checked 2026-10-31 when the build was approved. Freezing the plan does not check this box.
- [ ] `/speckit.implement` has not been run for this directory.

Nothing below the gate is authorized while it is open.

## Which rows belong where

| Rows | Owner |
|---|---|
| 1–9, 11–13, 15–16, 18–21 | **010.** Tasks below. |
| 10 Intra-hour availability, 14 Paint whiteboard, 17 Doubt clarified | **009.** Already specified. Do not rebuild. 010 tests cite them and do not add a second implementation. |

Order after a future build OK is the row order in the spec. Waves in the plan are how parallel builders may split that work. They are not a license to start.

## Wave A tasks (010 only)

009 rows 10, 14, and 17 are not tasks here. Their builders, after 009's own human OK, use `specs/009-board-availability-notice/tasks.md`.

### T10.21 — Sunny green aerial campuses

Depends on the gate. Independent of every other task.

- **Area:** inspire assets and the campus atmosphere list (the rail and sign-in backgrounds).
- **Do:** Replace the campus frames with wide, sunny, green, lush aerial campus landscapes. Keep Europe, India, the United States, and China. No altar, stained glass, cross, or chapel-dominant frame. No close facade. Not a new screen. Do not download files in the planning pass.
- **Tested without:** every product feature.
- **Row:** 21.

### T10.19 — Theme

Depends on the gate. Independent.

- **Area:** theme control and the three existing shells.
- **Do:** One dark/light control in the shell. Signed-in screens follow it. No other feature may be required for this task, and this task is not required for the others.
- **Row:** 19.

### T10.15 — Content library storage

Depends on the gate. Independent of the board.

- **Area:** library API and library screen.
- **Do:** The teacher who will take the session files material by board, subject, and unit. Accept Office files, PNG, SVG, PDF, and Draw.io. Topics are workspace labels. The live board still works if the library is empty. No board placement in this task.
- **Row:** 15.

### T10.8 — Student and teacher attendance

Depends on the gate. One stream. Not a profile migration.

- **Area:** existing student attendance rows and the session record; record screen and the planning read.
- **Do:** Student present/absent stays the current attendance rows. Teacher present/absent is stored on the session record. Faculty admin can see both when planning. Do not add a second student attendance store. Do not edit the library or the live board component.
- **Tested without:** handoff and library (student); feedback and theme (teacher).
- **Rows:** 8, 9.

## Wave B tasks

Start only after the profile schema exists. See the plan for which of these may run beside each other.

### T10.1 — Own profile, step-up, and who sees what

Depends on the gate, and on the closed set gaining `profile` in the same build as the demo. This is the first product slice.

- **Area:** profile service and the proposed `profile` screen.
- **Do:** Student, teacher, and faculty admin save phone, address, and expertise. A student also saves the board they are studying, plus the grade and subject-level study info the teacher card shows. The person sees their full profile. Student or teacher save requires the OTP. Faculty admin save requires OTP and email, without issuing a new login. Reduced cards match row 3. Phone and home address stay on that person's own profile. No library, whiteboard, attendance, or handoff in the own-profile case.
- **Rows:** 1, 2, 3.

### T10.4 — Faculty admin grant

Depends on the profile schema being merged. Teacher-profile edit starts only after the profile stream releases the profile service.

- **Area:** faculty-admin grant, supervision, contact provision, succession.
- **Do:** One person may also be a teacher. The grant does not put them in every session. They group teachers, oversee the schedule, and see attendance. They teach only assigned sessions. They can correct or remove a teacher profile. Student profiles stay the student's. Succession transfers the grant only. The workspace owner is unchanged. A teacher without the contact grant does not get student or parent conversations. Faculty admin or owner may grant it. Faculty admin can still talk to students and parents. No paint tools. No profile photos. No whiteboard files in the contact case.
- **Rows:** 4, 5, 6, 7.

### T10.11 — Student changes a 1-on-1

Depends on the gate and on Wave A attendance having merged. Does not edit profile files.

- **Area:** session screen.
- **Do:** The student reschedules or declines because they are unavailable or unwell. The session moves or is declined. The other person can see that.
- **Tested without:** file upload and admin succession.
- **Row:** 11.

### T10.18 — Feedback

Depends on the gate. Own store.

- **Area:** feedback store and the student send control. Not the whiteboard.
- **Do:** Feedback is stored against that teacher. It is not an assignment grade comment.
- **Tested without:** whiteboard and handoff.
- **Row:** 18.

### T10.20 — Notification indicator

Depends on Wave A theme having merged, so the shells have one editor at a time.

- **Area:** shell indicator only.
- **Do:** A new notice, including a clarified doubt, is visible without opening each feature. Must pass with no library and no attendance. Do not edit the doubt-status service.
- **Row:** 20.

## Wave C tasks

### T10.16 — Place library item on the board

Depends on T10.15 and on 009's whiteboard.

- **Area:** board placement and a library reference. One owner.
- **Do:** The teacher may place a library file on that session's board. A computer upload still works if they skip it.
- **Tested without:** attendance and feedback.
- **Row:** 16.

### T10.12 — Handoff and revert

Depends on session behavior and on the library, so content can travel. One owner.

- **Area:** session handoff.
- **Do:** The assigned teacher sends the session, subject, and content to another teacher in the organization. Faculty admin does not pick the substitute. Faculty admin may reverse that handoff. The session and its content return. Other edits stay. No global undo.
- **Tested without:** theme and doubt notice (handoff); availability and profiles (revert).
- **Rows:** 12, 13.

## Explicitly not tasks

- Implementing during planning.
- Downloading campus images during planning.
- Editing `frontend/` or `backend/` in the planning pass.
- Rebuilding rows 10, 14, or 17.
- Marking In Progress, Testing, or Accepted.
