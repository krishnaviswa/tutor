# spec.md — 009-board-availability-notice

**Branch status (2026-10-31):** In Progress — implemented on branch `feat/local-complete` and still unverified (full suite and browser not done). Not Accepted.

The three behaviors in this spec are on that branch: the paint whiteboard on `live-teacher` and `live-student` (pen, ten colors, eraser, text at one face and one size, pointer, crop, and a local file on the board); 15-minute availability with more than one window in a day, visible to the student tied to that teacher; and the doubt-clarified in-app notice, which the student may accept or ignore. This note does not set the feature to Testing or Accepted. Checkboxes in [tasks.md](tasks.md) stay as they are.

**Accepted** means the tester has run the checks, product has agreed, and README plus the architecture HTML, the catalog, and the work-log are updated in the same change. Browser pass, full pytest, production build, and the architecture HTML are still open. This feature adds no screen id. Catalog id `profile` belongs to 010; the closed set is 50. The sentences below are the frozen plan.

| Field | Value |
|---|---|
| **Status** | In Progress — implemented on branch `feat/local-complete` and still unverified (full suite and browser not done). Not Accepted. |
| **Role** | PM (specify + clarify) + Architect (plan, checklist, analyze) + tasks + tester plan |
| **Feature directory** | `specs/009-board-availability-notice` |
| **Action items** | [tasks.md](tasks.md). This note does not check human-OK boxes and does not mark the feature done. |
| **Not** | Testing or Accepted |

## Why

Three jobs are thin on screens that already exist.

The live class already shares a finite board on `live-teacher` and `live-student`. That board is a pencil with three inks. A class that works on a page needs the old paint-program interaction: place a page, write on it, point at it, crop the picture, and pick from a real set of colors. It does not need an infinite canvas or a shape library.

Staff availability (007) stores clock times as `HH:MM` and allows more than one row per weekday, but the availability screen edits **one window per day**. A teacher who can teach 10:00–10:30 and again 10:45–11:15 cannot publish that. Students have no place to track those windows.

When a teacher resolves a doubt, the student timeline does not receive a clarified notice the student can rely on. Channels must not become the ledger, and student WhatsApp must stay off unless the owner already enabled it.

## Feature boundary (not an extension of 007)

**This is a new feature directory. It does not extend 007, and it does not edit 008.**

| Candidate | Decision |
|---|---|
| `specs/007-sessions-timetable` | **Do not extend.** 007 is session state, 1-on-1 booking, and per-staff weekly windows plus date exceptions. Its tasks are already checked and its spec is in Testing (`feature.json`) while the product book still says In Progress. Its out of scope already excludes a student booking UI. Folding a paint board and a doubt notice into that spec would break the boundary and reopen a feature that is not this plan. Intra-hour windows **do** reuse 007's `staff_availability` rows and the existing `availability` / `schedule` screens. That reuse is scoped inside this spec. 007's own spec, plan, and tasks stay as they are. |
| `specs/008-billing-v2` | **Do not extend.** 008 is Draft platform subscription, ledger hardening, and hourly cohort billing. These three jobs are not money. 008's spec stays Draft and is not the active directory after this plan. |
| Next directory | **`specs/009-board-availability-notice`.** 001–008 already occupy those numbers. A 2026-10-30 work-log line also used the label `009` for a local interface/board/chat/billing pass. That line is a different event. This directory is the Spec Kit feature for the three jobs below. |

Active pointer: `.specify/feature.json` is `specs/010-faculty-admin-library`. This 009 directory stays its own spec. Its three behaviors are implemented on `feat/local-complete` with 010 and are not Accepted. `/speckit.implement` is not recorded as a status change in this note.

007's recorded status is inconsistent across the repo (Testing vs In Progress). This spec does not change 007's status.

## Epics

One spec, three epics. Same rule as 008: shared catalog (no new screen id) and one human gate, with stories that a builder can land in order. Epic B depends on 007's availability rows already existing. Epics A and C do not depend on Epic B.

- **A — Paint board** on `live-teacher` and `live-student`.
- **B — Intra-hour availability** on `availability`, `schedule`, and `student-dash`.
- **C — Doubt clarified** on `doubt-teacher`, `timeline`, and `doubt-student`.

Closed catalog stays **49** screen ids. No new id.

## User stories

### Epic A — Paint-style board (`live-teacher`, `live-student`)

1. **As** a teacher, **I want** the live board to behave like a classic paint program (pencil, color, eraser, text, pointer, crop) on a finite page, **so that** I can mark a page during class without learning a diagram editor.
2. **As** a student in that session, **I want** the same tools on `live-student`, **so that** I can mark the same page the teacher sees.
3. **As** a teacher or student in the session, **I want** to place an image, a PDF, or another document on the board and write on top of it, **so that** the page is the thing we are discussing.
4. **As** a teacher or student, **I want** ten pen colors, **so that** marks stay distinguishable.
5. **As** a teacher or student, **I want** a text box, **so that** I can label or point at the page in words.
6. **As** a teacher or student, **I want** a pointer / select cursor that does not draw, **so that** I can move a placed image or a text box without adding a line.
7. **As** a teacher or student, **I want** to crop a placed image after selecting it, **so that** only the relevant part of the picture stays on the page.
8. **As** the other person in the session, **I want** placed pages, ink, text, and crops to show up on my board, **so that** we are looking at one page.

### Epic B — Intra-hour availability (`availability`, `schedule`, `student-dash`)

9. **As** a teacher, **I want** to publish more than one available window on the same day, including two windows inside the same hour, **so that** a gap in the hour is really unavailable.
10. **As** a teacher, **I want** those windows on a 15-minute grid, **so that** 10:00–10:30 and 10:45–11:15 are valid and a time like 10:07 is not.
11. **As** an owner, **I want** to see and edit any staff member's sub-hour windows, **so that** the office can publish the same grid the teacher uses.
12. **As** a student, **I want** to see and track my teachers' published windows on the scheduling surfaces I already have, **so that** I know when they are free without a new screen and without booking myself.
13. **As** a teacher looking at `schedule`, **I want** the availability overlay to show gaps inside the hour, **so that** I do not place a session in the 10:30–10:45 hole.
14. **As** a teacher, **I want** a session booked in a published window to succeed and a session booked in a gap to be refused, **so that** the grid is enforced, not decorative.

### Epic C — Doubt clarified (`doubt-teacher`, `timeline`, `doubt-student`)

15. **As** a teacher (or owner — the roles that can already resolve a doubt), **I want** marking a doubt resolved to be the clarified moment, **so that** I do not have a second queue.
16. **As** a student, **I want** that moment written on my timeline, **so that** the ledger — not a chat app — is where I see that the doubt was clarified.
17. **As** a student, **I want** the same doubt on `doubt-student` to show as clarified, with the answer, **so that** I can open the doubt and the timeline and see the same fact.
18. **As** an owner, **I want** student WhatsApp to stay off unless I already turned it on, **so that** this notice does not become a paid student-WhatsApp send by default.

### Housekeeping

19. **As** anyone listing catalog screens, **I want** the same 49 ids and no 50th, **so that** the closed set holds.

## Acceptance criteria

### Epic A

1. Given `live-teacher` and `live-student` for the same session, when either person opens the board, then the page is a finite paint surface (not an infinite pan/zoom canvas) and the toolbar offers pencil, eraser, text, pointer/select, and crop, and nothing that inserts shapes (rectangle, ellipse, arrow, sticky, frame).
2. Given the pencil is active, when the person drags, then a mark is drawn in the selected color. Given the pointer/select tool is active, when the person drags on empty page, then no mark is drawn.
3. Given the color control, when it is opened, then it offers exactly these ten colors: black, white, red, orange, yellow, green, blue, purple, brown, gray. Pencil and text use the selected color.
4. Given a placed image, a placed PDF, or another placed document, when the person draws or adds a text box, then the marks sit on top of that placement and the placement remains visible underneath.
5. Given the teacher places an image on the board and saves, when the student in that session opens `live-student`, then the image is on their board. The same is true student → teacher, and for a PDF.
6. Given a placed image is selected with the pointer, when the person moves it, then the image moves and ink that was not part of the image stays put. When they crop it, then only the chosen rectangle of that image remains, and the crop is what the other person sees after save.
7. Given the eraser, when it passes over pencil marks or text, then those marks are removed and the placed document is not deleted. Deleting a placement is a separate action on the selected placement.
8. Given a parent, or an assistant using a write action, when they try to change the board, then the write is refused. A student who is not in the session cannot read or write that board. A student in the session can. Owner and teacher can.
9. Given the storage meter is at its block threshold, when a person places a file, then the place is refused and the existing board is unchanged. Board sync itself is not a metered send.

### Epic B

10. Given the availability editor, when a teacher saves two windows on the same weekday — 10:00–10:30 and 10:45–11:15 — then both are stored and both come back on read. The editor must not collapse a day to a single window.
11. Given a window whose start or end is not on a 15-minute boundary (`:00`, `:15`, `:30`, `:45`), or whose end is not after its start, or which overlaps another window that day, when it is saved, then the save is refused. Adjacent windows (10:00–10:30 and 10:30–11:00) are allowed. The same 15-minute rule applies to a one-off date exception.
12. **Why 15 minutes:** 007 stores `start_time` / `end_time` as `HH:MM` and does not snap. It did not choose a 5-minute or 10-minute slot. The wired editor is one window per weekday via a clock input. This spec sets the **publish grid** at 15 minutes so the example (a gap inside the hour) is representable and unambiguous. Storage stays `HH:MM`. Existing rows that are not on the grid remain readable; a new save must align.
13. Given those two windows, when `schedule` shows that teacher's availability, then 10:00–10:30 and 10:45–11:15 read as available and 10:30–10:45 reads as not available.
14. Given a student who is in a session (cohort or 1-on-1) with that teacher, when they open `student-dash`, then they see that teacher's published windows and can tell the gap is closed. When they open `schedule` or `availability`, they can read the same windows for their teachers and cannot edit them and cannot see unrelated staff. They cannot book a session from this feature.
15. Given a booking inside 10:00–10:30, then it is inside availability. Given a booking inside 10:30–10:45, then it is refused as outside availability. A teacher with no availability rows still falls back to the workspace window (007 / 006 behavior).
16. Given workspace B, when it reads availability, then no window from workspace A is returned.

### Epic C

17. Given an open doubt, when the teacher or owner marks it resolved (the existing resolved state, stored as `answered`, labeled clarified to the student), then the student's timeline gains one event whose text says the doubt was clarified, and `doubt-student` shows that doubt as clarified with the answer.
18. Given that same action, when the student opens the timeline (`timeline`) they see the event, and the existing in-app notice path has a notice for that student. Student WhatsApp is not sent when the workspace has student WhatsApp off. Teacher, parent, and admin channels stay on their existing rules.
19. Given the doubt was already resolved, when it is saved again, then a second clarified timeline event is not written.
20. Given a student in another workspace, or a student who does not own the doubt, when they read timelines, then they do not see this event.
21. Given an assistant, when they are not already allowed to resolve doubts, then this feature does not grant that permission. Today resolve is owner and teacher.

### Housekeeping

22. Given `catalog/screens.json`, when ids are listed, then the count is still 49. No new screen id. `live-teacher`, `live-student`, `availability`, `schedule`, `sessions`, `student-dash`, `doubt-teacher`, `doubt-student`, `timeline`, and `notif-prefs` are the only surfaces this feature may touch, and `sessions` / `notif-prefs` are not redesigned.
23. Given pytest after a future build, then 002–008 suites that already pass stay green, ports stay mock, and `live_calls == 0`. This planning pass does not run those tests and does not claim they passed.
24. Given this document, status is Specified. Accept, In Progress, and Testing are out of this pass. README, architecture HTML, and demo gold are updated only after Accept, not in this plan.

## Clarifications (resolved from the repo)

Asked against the code and catalog. Folded in above. Not left open.

| Question | Resolution |
|---|---|
| Extend 007 or new directory? | New directory. See boundary section. |
| What sub-hour unit? | 15 minutes. 007's column is minute-precision `HH:MM` with no slot atom. See AC 12. |
| Where does the student track availability? | `student-dash` (required) plus read-only `schedule` and `availability` for their teachers. No new screen. `sessions` stays the booked-session list. Tracking is not self-serve booking. |
| What is "clarified"? | The existing resolve. Stored status remains `answered`. Student-facing copy says clarified. Catalog event name is `doubt.answered`. |
| Does the eraser punch through the PDF? | No. Marks sit on top. Eraser removes marks. The file stays until the selected placement is deleted or the image is cropped. |
| Who may upload? | Whoever may already write the board: owner, teacher, and a student in the session. Assistant stays read-only. Parent stays out. |
| Infinite canvas or shapes? | Out. Finite page. No shape library. |
| Turn student WhatsApp on? | No. |

## Out of scope

- A new screen id, a student booking page, or a public booking link.
- Excalidraw-style canvas, shape library, sticky notes, frames, connectors, multi-page infinite pan/zoom, font menu, undo stack, laser pointer as a separate network cursor.
- Cropping raw pencil strokes as a pixel lasso. Crop applies to a placed image (a PDF page, once placed, is an image and can be cropped).
- Office-document conversion to pages. A file that is neither an image nor a PDF is one named sheet people can write on; it is not cropped.
- Changing 007 session states, 1-on-1 rules, or the 90-minute default end.
- 008 billing, payouts, or platform tiers.
- Enabling student WhatsApp by default, SMS blasts, or a second inbox.
- Granting assistants doubt-resolve or board-write.
- Parent view of the paint board or of the availability grid.
- Live Meet, WhatsApp, email, storage vendors. Mock / local ports only.
- Subject tables, exam-board modules, or Biology as the domain.

## Dependencies

- 007 `staff_availability` rows, `availability` and `schedule` screens, and the booking check. This feature adds the 15-minute multi-window rule on top. It does not rewrite 007's spec.
- Existing session board on `live-teacher` / `live-student` (finite page, shared per session). This feature replaces the three-ink pencil with the paint tools. It does not add a screen.
- Existing doubt resolve by owner and teacher, student timeline, and in-app notice path. Student WhatsApp flag stays the owner's.
- Storage meter and QuotaGuard for placed files. Always-on board sync is not a paid send.
- Closed screen set in `catalog/screens.json` (49).

## Definition of done

- [x] Spec, plan, checklist, analyze, tasks, and test plan exist for all three epics.
- [ ] Human OK recorded on [tasks.md](tasks.md). **Unchecked. Blocks implement.**
- [ ] Builder implements only after that OK. Not this pass.
- [ ] Tester executes [test-plan.md](test-plan.md) and writes a report. Not this pass.
- [ ] PM Accept only after that report. Status must not be set to Accepted here.

## Assumptions left for a human

These do not block Specified. Reverse any unmarked item before human OK if it is wrong.

**Frozen 2026-10-31. Do not reopen. These rows stay in this feature. 010 does not rebuild them:**

- Intra-hour availability is accepted as specified (Epic B: more than one window in a day, 15-minute grid, including 10:00–10:30 and 10:45–11:15). A whole day is not required. The student who sees the windows is a student tied to that teacher.
- A student may accept the doubt-clarified notice or ignore or dismiss it. Both are success. This feature does not require acceptance. Item 6 is unchanged: the stored status stays `answered`.
- Item 5 is confirmed.
- Item 7 is confirmed. Text on the paint board is one face and one size.

1. A non-image, non-PDF file is one named sheet (no conversion). Images and PDF pages are placed pictures.
2. There is no extra page-count cap. Placement stops when the storage quota blocks. A human may want a small page limit (for example the first few PDF pages) before build.
3. Students who can already draw may also place a file. A human may restrict placement to the teacher.
4. Pointer/select moves whole placements and text boxes. It does not lasso ink. Eraser removes ink and text, not the file.
5. "My teacher" means a teacher on a session the student belongs to (cohort or 1-on-1), not every staff member in the workspace. **Confirmed 2026-10-31.**
6. The stored doubt status stays `answered`. Only the student-facing words say clarified. A human may want the stored value itself to be `clarified`.
7. Text is one face and one size. **Confirmed 2026-10-31.**
8. No undo stack.
