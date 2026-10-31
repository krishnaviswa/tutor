# test-plan.md — 010-faculty-admin-library

| Field | Value |
|---|---|
| **Status** | Plan only. **Tests were not executed.** |
| **Role** | Tester |
| **When** | After a future build that followed human OK. Not before. |
| **Rule** | Each row passes without the features in its "Tested without" column. |
| **Recommendation** | No Ship / Rework call. Nothing was built in this pass. |

Mock providers only. Do not call live WhatsApp, Meet, SMS, email, or a real object store. Assert `live_calls == 0`. pytest stays on in-memory SQLite.

Rows 10, 14, and 17 are executed from `specs/009-board-availability-notice/test-plan.md`. 010 does not add a second suite for them. The isolation line below still applies.

## Row 1 — Own profile

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Library, whiteboard, attendance, handoff |
| **Expected** | A student, a teacher, and a faculty admin save phone, address, and expertise. A student also saves the board they are studying. That person sees the full profile and can add it from empty. |

## Row 2 — Profile step-up

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Theme, feedback, content files |
| **Expected** | A student or teacher save without the one-time code is refused. With the code, it succeeds. A faculty-admin save without both the code and email is refused. With both, it succeeds. No second account. No new login session from the email step. |

## Row 3 — Who sees what

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Scheduling and whiteboard |
| **Expected** | The student card of a teacher shows name, subjects, and organization email. The teacher card of a student shows grade, board, and subject-level study info. Phone and home address stay on the profile of the person who saved them and are absent from the reduced card. |

## Row 4 — Faculty admin edits a teacher

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Session handoff and library |
| **Expected** | A correction shows on the teacher card. Removing the teacher profile takes that card out of active use. A faculty admin delete of a student profile is refused. |

## Row 5 — Faculty admin succession

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Teaching content and student profiles |
| **Expected** | The recipient can supervise. The workspace owner is unchanged. Board ink and library files are not copied across. |

## Row 6 — Faculty admin role

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Paint tools and profile photos |
| **Expected** | A person who is also a teacher can group teachers, oversee the schedule, and see attendance. They are the teacher only on assigned sessions. No profile-photo field is required. |

## Row 7 — Contact provision

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Whiteboard files |
| **Expected** | A teacher with no grant cannot hold student or parent conversations. After the faculty admin or owner grants it, they can. The faculty admin can talk to students and parents without that teacher grant. |

## Row 8 — Student attendance

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Teacher handoff and library |
| **Expected** | Marking the student in the session uses the existing attendance row. Faculty admin can see it when planning. |

## Row 9 — Teacher attendance

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Student feedback and theme |
| **Expected** | Marking the teacher in the session is stored on the session record. Faculty admin sees it beside student attendance. |

## Row 10 — Intra-hour availability

| | |
|---|---|
| **Owner** | 009. Do not rebuild. |
| **Tested without** | Profiles and content library |
| **Expected** | Windows 10:00–10:30 and 10:45–11:15. The student tied to that teacher sees them. A whole day is not required. Cases live in the 009 test plan. |

## Row 11 — Student changes a 1-on-1

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | File upload and admin succession |
| **Expected** | Decline because unavailable or unwell, or a reschedule. The session moves or is declined. The other person can see that. |

## Row 12 — Teacher hands off a session

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Theme toggle and doubt notice |
| **Expected** | The colleague in the same organization receives the session, subject, and content. Faculty admin picking the substitute is refused. |

## Row 13 — Revert a handoff

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Availability and profiles |
| **Expected** | With faculty-admin permission, the session and its content return. Other edits remain. Without that permission, the reversal is refused. |

## Row 14 — Paint whiteboard

| | |
|---|---|
| **Owner** | 009. Do not rebuild. |
| **Tested without** | Content library |
| **Expected** | Pen, ten colors, eraser, text box, pointer, crop, local image, PDF, or other file. Marks sit on the file. Text is one face and one size. Cases live in the 009 test plan. |

## Row 15 — Content library

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | A populated whiteboard. The live board still works if the library is empty. |
| **Expected** | Material filed by board, subject, and unit. Office, PNG, SVG, PDF, and Draw.io are accepted. The item sits in the library for that teacher's session. |

## Row 16 — Place library item on the board

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Attendance and feedback |
| **Expected** | The chosen library file appears on that session's board. Skipping it still allows a computer upload. |

## Row 17 — Doubt clarified

| | |
|---|---|
| **Owner** | 009. Do not rebuild. |
| **Tested without** | Scheduling and profiles |
| **Expected** | The notice reaches the student. Accepting it or ignoring it are both complete. Cases live in the 009 test plan, including the accept-or-ignore case. |

## Row 18 — Feedback

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Whiteboard and handoff |
| **Expected** | Student feedback is stored against that teacher and does not write the assignment grade comment. |

## Row 19 — Theme

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Every other row. Those rows must also pass without theme. |
| **Expected** | Dark or light in the shell. Signed-in screens follow the choice. |

## Row 20 — Notifications

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Library and attendance |
| **Expected** | The shell indicator shows a new notice, including a clarified doubt, without opening each feature. |

## Row 21 — Sunny green aerial campuses

| | |
|---|---|
| **Owner** | 010 |
| **Tested without** | Every product feature. Profiles, whiteboard, attendance, and library tests must pass with no image swap. |
| **Expected** | Sign-in and the inspire rail show wide sunny green aerial campuses from Europe, India, the United States, and China. The frame is landscape, not a chapel, altar, stained glass, cross, or close facade. Not a new screen. |

## Integration cases (only where a row touches another)

| Case | Rows | Expected |
|---|---|---|
| I1 | 16 | A library item can be placed on the 009 board, and a local upload still works with an empty library. |
| I2 | 12 | Handoff carries subject and library content with the session. |
| I3 | 20 and 17 | The shell indicator can show the 009 clarified-doubt notice without opening the doubt screen and without a library item. |

## Not this pass

Do not write `test-report.md`. Do not recommend Ship. Do not claim pytest was run.
