# plan.md — 010-faculty-admin-library

| Field | Value |
|---|---|
| **Status** | Specified |
| **Role** | Architect |
| **Spec** | [spec.md](spec.md) · **Tasks** | [tasks.md](tasks.md) |
| **Gate** | Human OK on tasks.md is unchecked. Freezing this plan is not permission to start builders. No application code in this pass. |

Technical approach only. Stack is unchanged. Mock ports. Subject stays tenant taxonomy.

## Stack

| Layer | Choice | This feature |
|---|---|---|
| UI | Next.js 15, one route per catalog id | Existing shells and the screens named in the frozen rows. One proposed id, `profile`, only after human OK updates the closed set and the demo together. |
| API | FastAPI `/api/v1` | Logic in services. Routers stay thin. New paths are catalogued in the same build that adds them, not in this pass. |
| Data | Compose Postgres locally; pytest SQLite | `workspace_id` on every new business row. No syllabus table. No exam-board enum. |
| Auth | Existing OTP and email port | Step-up consumes a challenge. It does not call the magic-link sign-in that issues a session. |
| Ports | Mock / local | Storage, SMS, and email. `create_app` still refuses a non-mock provider. |

## Screen ids

| Id | Use |
|---|---|
| `profile` | **Proposed catalog addition.** Own profile for student, teacher, and faculty admin. Cannot be built until the closed set and the demo both include it. Not created in this pass. |
| `library` | Content library. Not the whiteboard. |
| `live-teacher`, `live-student` | Paint board. 009 owns the tools. 010 may later place a library item here (row 16). |
| `record`, `teacher-dash`, `schedule` | Student attendance that already exists, plus teacher present/absent on the session record. Faculty admin planning. |
| `availability` | 009 intra-hour windows. Not rebuilt here. |
| `doubt-teacher`, `doubt-student`, `timeline` | 009 doubt notice. Not rebuilt here. |
| `sessions`, `student-dash` | Student decline or reschedule of a 1-on-1. |
| Shells | `AppChrome`, `PhoneChrome`, `ParentChrome`. Theme, notice indicator, Profile entry. Not new screens. |
| Inspire rail | `CampusAtmosphere` and `frontend/public/inspire` campus frames. Not a screen. |

No other new id.

## Data and RBAC (for the later build)

- **Profile.** One workspace-scoped profile per person. Fields the frozen rows name: phone, address, expertise, and for a student the board label plus the grade and subject-level study info the teacher card shows. Board, subject, and unit are topic ids in the tenant taxonomy. Grade is a label the student saves, not a grade table. Organization email is the existing workspace email identity, not a new column of private contact.
- **Reduced card.** Student→teacher: name, subjects, organization email. Teacher→student: grade, board, subject-level study info. Phone and home address stay on the profile of the person who saved them.
- **Faculty-admin grant.** A grant on the person, not a value in the login role list. Supervision links point at teachers. They are not student cohorts. The grant does not set `teacher_user_id`.
- **Contact grant.** Absent means the teacher does not get student or parent conversations. Faculty admin or owner may grant it. Faculty admin can still hold those conversations.
- **Attendance.** Student rows stay in `attendance`. Teacher present/absent is a field on the existing session record. That is not a profile migration.
- **Handoff.** The assigned teacher sets the other teacher. Content and subject stay on the session. Revert restores the previous teacher and is allowed only with the faculty-admin grant. Nothing else is undone.
- **Library.** Existing content items, tagged with board, subject, and unit topics. Allowed types: Office, PNG, SVG, PDF, Draw.io. Storage quota gates the upload.
- **Feedback.** Its own store against the teacher. Not `submissions.feedback`.
- **Step-up.** Existing OTP for student and teacher saves. Faculty admin also confirms by the email port. QuotaGuard on SMS and email. A blocked send leaves the profile unchanged.

Routers do not call SMS, email, disk, or WhatsApp. Services do, through ports.

## Parallel build

A later coordinator may hand these streams to separate builders **after** human OK. This section is not that OK. Maximum parallelism, one owner per file set. Two builders must not edit the same files. Each stream ends with its own cases in [test-plan.md](test-plan.md). A last integration pass runs only where a row touches another: place a library item on the board, handoff of content, and the shell indicator showing a clarified doubt.

Do not parallelize rows that share a schema migration. Sequence those.

### Wave A — independent, safe to run together

| Stream | Rows | May touch | Must not touch |
|---|---|---|---|
| Campus imagery | 21 | Inspire assets (`frontend/public/inspire` campus frames) and the rail list in the campus atmosphere component | Shell chrome, profile, board, library, attendance, any API |
| Theme | 19 | Theme control and the three shells' headers, including removing a second floating toggle so only one control remains | Inspire image list, profile, board, library |
| Paint whiteboard | 14, owned by 009 | Live board component and the board API only | Library screen, profile, inspire assets |
| Intra-hour availability | 10, owned by 009 | Staff availability service and the schedule screen only | Profile, library, board component |
| Doubt-clarified notice | 17, owned by 009 | Doubt status and the student notice only | Shell indicator, library, profile |
| Content library storage | 15 | Library API and library screen only | Board placement, live board component |
| Attendance | 8 and 9 | Session record and the existing student attendance rows; record screen and the planning read on the teacher dashboard | Profile tables, library, live board component, schedule screen (that file belongs to availability) |

Attendance stays in Wave A. Student presence already has a table. Teacher presence is one field on the existing session record. Neither waits on the profile migration. The session-record change is owned only by this stream. Wave B and Wave C do not edit that migration; they start after it is merged.

Wave A file collision to avoid: the model file is edited only by the attendance stream. The whiteboard stream must keep using the board document that already exists and must not add a column in the same wave.

### Wave B — after the own-profile schema exists

The profile migration is one schema change. It runs first inside this wave, then the other Wave B streams that do not touch that migration may proceed together.

| Stream | Rows | May touch | Must not touch | Sequence inside the wave |
|---|---|---|---|---|
| Profile | 1, 2, 3 | Profile service, the proposed `profile` screen, reduced cards, step-up confirm | Library files, whiteboard, theme, inspire assets | Owns the profile schema. Finishes before anyone else edits the profile service |
| Faculty admin | 4, 5, 6, 7 | Grant, supervision, contact provision, teacher-profile edit and removal, succession | Session reschedule files, whiteboard, student profile deletion | Starts only after the profile schema is merged. Teacher-profile edit waits until the profile stream has released the profile service. Grant tables are a separate migration from the profile table |
| Student 1-on-1 change | 11 | Session screen and session time/status behavior | Profile files, whiteboard, inspire assets | After Wave A attendance has merged, so it does not redo the session-record column |
| Feedback | 18 | Feedback store and the student send control | Whiteboard, profile service, handoff | Own store. The teacher-dashboard file is released by the faculty-admin stream before this stream adds a read of feedback there, if both would otherwise edit that file |
| Notification indicator | 20 | Shell indicator only | Library, attendance, doubt-status service | After Wave A theme has merged, so the shells have one owner at a time. May show a clarified-doubt notice. Must pass with no library |

### Wave C — only after the two sides exist

| Stream | Rows | Waits for | May touch |
|---|---|---|---|
| Place library item on the board | 16 | Library stream and whiteboard stream | Board placement plus a library reference on the live board. Not attendance. Not feedback |
| Handoff and revert | 12 and 13 | Session behavior (Wave B) and library (so content can travel) | Session handoff and the faculty-admin revert. Not theme. Not the doubt notice. Not profile schema |

One owner for each Wave C stream. They are sequential relative to their inputs and must not edit each other's files at the same time. Handoff may read a library item id. It does not redesign the library screen.

## QuotaGuard

Storage gates library uploads and board file placement. SMS gates the OTP. Email gates the faculty-admin second factor. A blocked send does not half-save the profile. Board sync, theme, the notice indicator, and the image swap are not metered sends. Student WhatsApp stays off unless the owner already enabled it. This feature does not enable it.

## Catalog adjustment

The closed set has no profile screen. `profile` is the only proposed id. Row 21 does not add an id. Rows 10, 14, and 17 do not add an id. Navigation does not add a second shell.
