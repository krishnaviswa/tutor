# test-plan.md — 009-board-availability-notice

| Field | Value |
|---|---|
| **Status** | Plan only. **Tests were not executed.** |
| **Role** | Tester |
| **When** | After a future build that followed human OK and tasks T9.1–T9.7. Not before. |
| **Report** | Do not write `test-report.md` until this plan has actually been run. |
| **Converge** | `/speckit.converge` compares the tree to spec/plan/tasks after implement. This file is the case list, not a converge result. |
| **Recommendation** | No Ship / Rework call. There is nothing to ship from this planning pass. |

Mock providers only. Do not call live WhatsApp, Meet, SMS, email, or a real object store. Assert `live_calls == 0`. pytest stays on in-memory SQLite.

Map: every spec AC has a case below. Automated means `backend/tests/test_009_board_availability_notice.py` unless marked manual.

## Epic A — paint board

| Case | AC | Kind | Steps and expected result |
|---|---|---|---|
| A1 | 1 | Manual on `live-teacher` and `live-student` | Open both for one session. Page does not pan infinitely. Toolbar has pencil, eraser, text, pointer, crop. No rectangle, ellipse, arrow, sticky, or frame control. |
| A2 | 2 | Manual | Pencil drag adds a mark. Switch to pointer and drag on empty page: mark count unchanged. |
| A3 | 3 | Automated + manual | PUT with each of the ten names (`black`, `white`, `red`, `orange`, `yellow`, `green`, `blue`, `purple`, `brown`, `gray`) succeeds. An eleventh color is rejected. The toolbar shows those ten and no more. Text is one face and one size (frozen). Tested without the content library. |
| A4 | 4 | Automated | PUT a placement plus a stroke and a text. GET returns the placement and the marks. Document order is placement under marks (assert fields, not pixels). |
| A5 | 5 | Automated | Teacher PUT with an image placement (`file` bytes, media type image). Student in the session GET sees `storage_path` and kind `image`. Repeat with a PDF (`kind` `pdf-page` or equivalent pages). Student PUT is visible to the teacher. |
| A6 | 6 | Automated + manual | PUT move (`x`,`y` change) without shifting unrelated stroke coordinates. PUT `crop` and GET returns that crop for the other role. Manual: crop control stays disabled until an image or PDF page is selected. |
| A7 | 7 | Automated | PUT an erase over a stroke id's span. GET no longer returns that stroke. Placement id is still present. A separate delete of the placement removes it. |
| A8 | 8 | Automated | Parent PUT → 403. Assistant PUT → 403. Assistant GET → 200. Student not in the session GET → 404. Student in the session PUT → 200. Owner and teacher PUT → 200. |
| A9 | 9 | Automated | Storage policy `block` at 100% used. PUT with a new file → refused, previous board JSON unchanged, meter not incremented past the cap. PUT of strokes only does not increment storage. |

## Epic B — intra-hour availability

| Case | AC | Kind | Steps and expected result |
|---|---|---|---|
| B1 | 10 | Automated + manual | PUT windows `10:00–10:30` and `10:45–11:15` on the same weekday. GET returns both. Manual: the availability screen does not drop the second window. |
| B2 | 11, 12 | Automated | `10:07–10:22` → 400. `10:30–10:00` → 400. Overlap `10:00–10:30` and `10:15–10:45` → 400. Adjacent `10:00–10:30` and `10:30–11:00` → 200. A date exception off the 15-minute grid → 400. Note in the test name that the grid is 15 because 007 stored `HH:MM` without a slot atom. |
| B3 | 13 | Manual on `schedule` | With B1's windows, the overlay shows 10:00–10:30 and 10:45–11:15 open and 10:30–10:45 closed. |
| B4 | 14 | Automated + manual | Student dashboard JSON includes `teacher_windows` for a teacher tied to that student (a teacher on a session the student belongs to), including both windows and not the gap as a window. A whole day is not required. GET availability for that teacher as the student → 200. GET for an unrelated teacher → 404. Student PUT availability → 403. No new student booking control on the screen. Tested without profiles and without the content library. |
| B5 | 15 | Automated | POST session at 10:15 for that teacher → success. POST at 10:35 → 400 outside availability. Clear the teacher's rows and POST inside the workspace window → success (007 fallback). |
| B6 | 16 | Automated | Workspace B GET and dashboard do not contain workspace A's windows. |

## Epic C — doubt clarified

| Case | AC | Kind | Steps and expected result |
|---|---|---|---|
| C1 | 17 | Automated + manual | Student POST doubt. Teacher PATCH `status=answered` with an answer. GET that student's timeline includes one `doubt.answered` whose body says the doubt was clarified. GET `/doubts` as the student shows `answered` and the answer. Manual: `doubt-student` reads as clarified; `timeline` shows the line. |
| C2 | 18 | Automated | Same PATCH writes an in-app `notification_deliveries` row for that student (`channel=in_app`). With student WhatsApp off, no student WhatsApp send is in `sent`. Workspace `student_whatsapp` is still false. Teacher/parent/admin dispatch behavior is unchanged (mock). |
| C3 | 19 | Automated | PATCH `answered` again. Timeline count of `doubt.answered` for that doubt stays 1. |
| C4 | 20 | Automated | Other workspace student, and another student in the same workspace, do not see the event on their timeline. |
| C5 | 21 | Automated | Assistant PATCH to `answered` → 403. Doubt stays open. No `doubt.answered` event. |
| C6 | 17, frozen row 17 | Manual | After the notice exists, the student can accept it or ignore or dismiss it. Either path is complete. The test does not require an acceptance click. Tested without scheduling changes and without profiles. |

## Housekeeping

| Case | AC | Kind | Steps and expected result |
|---|---|---|---|
| H1 | 22 | Automated | `catalog/screens.json` length is 49. Ids `live-teacher`, `live-student`, `availability`, `schedule`, `student-dash`, `doubt-teacher`, `doubt-student`, `timeline` still exist. No id was added. |
| H2 | 23 | Automated | `cd backend; python -m pytest` including this file and 002–008 files that already exist. `live_calls == 0`. Factory still refuses a non-mock provider. |
| H3 | 24 | Review | Spec status is still not Accepted unless PM Accept happened in a later pass. This planning document does not satisfy H3. |

## Out of suite

Do not assert Biology content, a new screen, student self-serve booking, or student WhatsApp turning on.

## After a real run

Write `test-report.md` with pass/fail per case, the pytest count, and `live_calls`. Recommend Ship only if A1–A9, B1–B6, C1–C5, and H1–H2 passed. Otherwise Rework. Then `/speckit.converge`. PM Accept is separate.
