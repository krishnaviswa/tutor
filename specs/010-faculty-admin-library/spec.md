# spec.md — 010-faculty-admin-library

**Branch status (2026-10-31):** In Progress — implemented on branch `feat/local-complete` and still unverified (full suite and browser not done). Not Accepted.

**Accepted** means the tester has run the checks, product has agreed, and README plus the architecture HTML, the catalog, and the work-log are updated in the same change. This feature is not Accepted. Checkboxes in this file stay as written. The frozen plan below is unchanged.

### Implemented on the branch

- Own profiles for student, teacher, and faculty admin: phone, address, and expertise; the student also saves a board label. Student and teacher saves confirm with OTP. Faculty-admin saves confirm with OTP and email.
- Reduced cards. A student sees teacher name, subjects, and organization email. A teacher sees student grade, board, and subject-level study info. Phone and address stay on the owner's profile.
- Faculty admin is a grant on the teaching role, not a second login. Teacher and faculty are the same teaching role. The admin can see attendance, grant or withhold parent and student contact, edit or delete a teacher profile, and hand the faculty-admin grant to someone else. Workspace ownership stays with the owner. Controls sit on the existing `sessions` screen. Catalog id `profile` is already in the closed set (50).
- Student attendance and teacher attendance on the session.
- The assigned teacher hands a session, its subject, and library content to another teacher in the same organization. That teacher chooses the colleague. Revert is on the sessions list and requires the faculty-admin grant.
- Content library, separate from the whiteboard: board label, subject, and unit; office, PNG, SVG, PDF, and Draw.io.
- Student feedback on a teacher. A student can reschedule or decline a 1-on-1.
- Dark and light theme, and a notification indicator, in the one shell.
- One Back control in the header of faculty/owner (`AppChrome`), student (`PhoneChrome`), and parent (`ParentChrome`). Nested screens return to the menu parent from `resolveBreadcrumb`. Nav homes hide it. A non-menu screen can step back through in-app history only. It never leaves `/app`. An open dialog does not navigate. Escape and the scrim still close the dialog. 200ms fade. `prefers-reduced-motion` skips the slide. Files: `frontend/components/ShellBack.tsx`, `frontend/lib/shell-back.ts`, the three chrome components, `frontend/app/globals.css`. Not clicked through in the browser. The app and API were not running.
- The rail and sign-in use four wide campus aerials, listed only in `frontend/components/CampusAtmosphere.tsx` lines 7–10: `europe-essex.jpg` (University of Essex, lawns and sports grounds), `india-iiser.jpg` (IISER Thiruvananthapuram), `us-uc-davis.jpg` (UC Davis, canopy and fields), and `china-xiamen.jpg` (Xiamen University). Deleted and no longer referenced: `europe-potsdam.jpg`, `india-bits-2014.png`, `us-stanford.jpg` (Memorial Church), and `china-zhejiang.jpg` (clock tower and facade). Wikimedia Commons, CC BY / CC BY-SA. Portrait quotes unchanged. Not a new screen. Still not browser-checked.
- The three 009 behaviors (paint whiteboard, 15-minute availability, doubt-clarified notice) are on this same branch and stay specified in [../009-board-availability-notice/spec.md](../009-board-availability-notice/spec.md). 010 does not rebuild them.

### Still open

- Browser pass.
- Full pytest. Reported so far: `backend/tests/test_010_handoff.py` — 2 passed. `test_directory_hides_private_and_withhold_contact` was started. This note does not record a result for the rest of `backend/tests/test_010_faculty_admin_library.py`.
- Production build.
- Architecture HTML, catalog bookkeeping beyond the existing `profile` id, and the work-log. They are outside this documentation note.

Frozen 2026-10-31. This table is the plan, including row 21 (sunny green aerial campuses) and the parallel waves in [plan.md](plan.md). Do not add scope without a new human decision.

| Field | Value |
|---|---|
| **Status** | In Progress — implemented on branch `feat/local-complete` and still unverified (full suite and browser not done). Not Accepted. |
| **Role** | PM (specify + clarify) + Architect (plan, checklist, analyze) + tasks + tester plan |
| **Feature directory** | `specs/010-faculty-admin-library` |
| **Action items** | [tasks.md](tasks.md). Human OK is already recorded there (2026-10-31). This note does not check further boxes and does not mark the feature done. |
| **Not** | Testing or Accepted |

If a later sentence conflicts with the frozen table, the table wins.

## Frozen plan

Teacher and faculty are one teaching role. Faculty admin is the supervisor, not a synonym for teacher, and not a new login role. The login roles stay `owner`, `teacher`, `assistant`, `student`, and `parent`. Assistant stays the helper the product already has.

Profiles are build slice 1 after a later human OK to implement. Do not implement now.

Library and whiteboard are two doors. Local upload on the board always works. Placing a library file on the board is optional.

Boards (IB, ICSE, CBSE, Matric) are workspace labels, not a shipped syllabus. Constitution: subject-neutral, G3 taxonomy, no syllabus tables. ICC, IBC, and BC in the request mean ICSE, IB, and CBSE as examples of those labels.

Navigation is one existing app shell. The movement map is Home, Sessions, Availability, Library, Whiteboard, People, Profile, using the screens that already exist for that person. Theme, the notification indicator, and Profile sit in that bar for every signed-in role. There is no second navigation system. A role is not given a new door to a screen they cannot use. The only proposed catalog addition is the id `profile`. It cannot be built until `catalog/screens.json` and `tutor-platform-demo.html` both gain that id. This pass does not add it.

The only permissioned undo is reversing a session handoff, and only with faculty-admin permission. There is no global undo.

Faculty-admin succession transfers the faculty-admin grant, not workspace ownership.

Test isolation: each row has its own acceptance cases and must pass without the features in its "Tested without" column.

Rows 10, 14, and 17 stay in `specs/009-board-availability-notice`. 010 does not rebuild them.

Order after a future build OK:

1. Own profile
2. Profile step-up
3. Who sees what
4. Faculty admin edits a teacher
5. Faculty admin succession
6. Faculty admin role
7. Contact provision
8. Student attendance
9. Teacher attendance
10. Intra-hour availability (009)
11. Student changes a 1-on-1
12. Teacher hands off a session
13. Revert a handoff
14. Paint whiteboard (009)
15. Content library
16. Place library item on the board
17. Doubt clarified (009)
18. Feedback
19. Theme
20. Notifications
21. Sunny green aerial campuses

### Rows

1. **Own profile.** Student, teacher, and faculty admin create and save phone, address, and expertise. A student also saves the board they are studying. Outcome: the person sees their full profile and can add it. Tested without library, whiteboard, attendance, handoff. **010.**

2. **Profile step-up.** Student or teacher confirms a save with the one-time code. Faculty admin confirms with that code and email. Outcome: a student or teacher save requires the code; an admin save requires both. Tested without theme, feedback, content files. **010.**

3. **Who sees what.** Reduced card, not the full profile. Student sees teacher name, subjects, and organization email. Teacher sees student grade, board, and subject-level study info. Phone and home address stay on the owner's own profile. Tested without scheduling and whiteboard. **010.**

4. **Faculty admin edits a teacher.** Admin corrects or removes a teacher profile when that person joins or leaves. Outcome: the teacher card changes or disappears. Student profiles stay the student's to edit. Tested without session handoff and library. **010.**

5. **Faculty admin succession.** Admin hands the faculty-admin role to another person in the organization. Outcome: the new person can supervise. The workspace owner is unchanged. Tested without teaching content and student profiles. **010.**

6. **Faculty admin role.** One person may also be a teacher. The admin grant does not put them in every session. Outcome: they can group teachers, oversee the schedule, and see attendance. They teach only sessions assigned to them. Tested without paint tools and profile photos. **010.** Profile photos are not a feature.

7. **Contact provision.** Admin or owner grants a teacher the right to speak with students and parents. Outcome: a teacher without that grant does not get those conversations. The admin can still talk to students and parents and align the work to a teacher. Tested without whiteboard files. **010.**

8. **Student attendance.** Mark whether the student was in the session. Outcome: faculty admin can see it when planning. Tested without teacher handoff and library. **010.** Uses the attendance rows that already exist. No second student-attendance store.

9. **Teacher attendance.** Mark whether the teacher was in the session. Outcome: faculty admin can see both attendances on the session. Tested without student feedback and theme. **010.** This mark lives on the existing session record. `started_at` stays the class-started time.

10. **Intra-hour availability.** Teacher publishes 15-minute windows inside a day (10:00–10:30 and 10:45–11:15). Outcome: the student tied to that teacher sees those windows. A whole day is not required. Tested without profiles and content library. **009. Do not rebuild.**

11. **Student changes a 1-on-1.** Student reschedules or declines because they are unavailable or unwell. Outcome: the session moves or is declined, and the other person can see that. Tested without file upload and admin succession. **010.**

12. **Teacher hands off a session.** Teacher sends the session, subject, and content to another teacher in the same organization. Outcome: the colleague receives the session. The faculty admin does not pick the substitute. Tested without theme toggle and doubt notice. **010.**

13. **Revert a handoff.** Faculty admin allows the handoff to be reversed. Outcome: the session and its content return. Other edits are left as they are. Tested without availability and profiles. **010.**

14. **Paint whiteboard.** Existing live board: pen, ten colors, eraser, text box, pointer, crop, and upload of an image, PDF, or other file from the computer. Outcome: people can write on top of the placed file. Text is one face and one size. Tested without the content library. **009. Do not rebuild.**

15. **Content library.** The teacher who will take the session files material by board, subject, and unit. Office files, PNG, SVG, PDF, and Draw.io are accepted. Outcome: the material sits in the library for that teacher's session. The live board still works if the library is empty. **010.**

16. **Place library item on the board.** Teacher chooses a library file for that session's board. Outcome: the file appears on the board. Uploading from the computer still works if they skip this. Tested without attendance and feedback. **010.**

17. **Doubt clarified.** Teacher marks the doubt clarified. The notice reaches the student. Outcome: the student may accept it or ignore it. Either one is complete. Tested without scheduling and profiles. **009. Do not rebuild.**

18. **Feedback.** Student sends feedback on a teacher. Outcome: the feedback is stored against that teacher. Tested without whiteboard and handoff. **010.** This is not the grade comment on a student's assignment.

19. **Theme.** Dark or light control in the shell. Outcome: the signed-in screens follow the choice. Tested without depending on any feature above; they must not depend on it either. **010.**

20. **Notifications.** A notification indicator in the same shell. Outcome: a new notice, including a clarified doubt, is visible without opening each feature. Tested without library and attendance. **010.**

21. **Sunny green aerial campuses.** Swap the inspire set for wide sunny lush drone-style campus frames. Outcome: a person signing in or using the rail sees green campuses from the air, not a close religious building. Tested without every product feature. The image swap must not be required for profiles, whiteboard, attendance, or library tests. **010.** Shell atmosphere only. Not a new screen. Keep the geographic spread already in the product: Europe, India, United States, China. The subject is the campus landscape, not a faith. No altars, stained glass, crosses, or chapel-dominant frames. Wide enough that the campus reads as landscape, not a building facade or a chapel interior.

## Navigation shell

| Map name | Existing home |
|---|---|
| Home | `teacher-dash`, `student-dash`, `owner`, or `parent-home` |
| Sessions | `schedule`, `sessions`, and the student's next session on `student-dash` |
| Availability | `availability` |
| Library | `library` |
| Whiteboard | `live-teacher` or `live-student` |
| People | `roster`, `cohort-builder`, `messages` |
| Profile | Proposed id `profile` after the closed set is updated. Until then the bar entry has nowhere legal to go, so it is not built in this pass |

Theme and the notification indicator are controls on `AppChrome`, `PhoneChrome`, and `ParentChrome`. They are not screens. The brand mark still returns home. Breadcrumbs stay. A refused action states why and links back to that screen or home.

## What the repo already decided

Student attendance is the `attendance` table (`present` or `absent`), written by join and by the session record. Teacher attendance is missing. Class start time is not that mark.

There is no profile screen. Organization email is the workspace email identity. Phone and home address are saved on the profile that belongs to that person (row 1) and are not copied onto the reduced card (row 3). Grade is the study level that person records, a label, not a national grade table.

The inspire rail today is close architecture: Radcliffe Camera, King's College Chapel, the IIT Bombay main building, IISc, the MIT Great Dome, and the Tsinghua west gate, plus separate quote portraits. Row 21 replaces the campus frames only. This pass does not download images and does not edit the rail.

A teacher without the contact grant does not get student and parent conversations (row 7). Faculty admin still can, and can align that work to a teacher. Holding the faculty-admin grant does not assign them as teacher of someone else's session.

## Acceptance criteria

1. Given a student, a teacher, or a faculty admin, when they add and save their profile, then they can store phone, address, and expertise, and a student can also store the board they are studying. A later read by that person returns the full profile. The case passes with no library, whiteboard, attendance, or handoff.
2. Given a student or teacher save, when the one-time code is missing, then the save is refused. When the code from the existing OTP path is present, then the save succeeds and no second account is created. Given a faculty-admin save, when either the code or the email confirmation is missing, then the save is refused. When both are present, then it succeeds. The email confirmation does not sign them in again and does not send student WhatsApp. The case passes with no theme, feedback, or content files.
3. Given a student looking at a teacher, when the card is shown, then it shows name, subjects, and organization email, and it does not show phone or home address. Given a teacher looking at a student, when the card is shown, then it shows grade, board, and subject-level study info, and it does not show phone or home address. Phone and home address remain on the profile of the person who saved them. The case passes with no scheduling and no whiteboard. Grade and board are workspace labels, not a syllabus table.
4. Given a faculty admin, when they correct a supervised teacher's profile, then the teacher card shows the correction. When they remove that teacher profile, then the card disappears from active use. Student profiles remain editable by the student. The case passes with no session handoff and no library.
5. Given succession, when the faculty admin hands the grant to another person in the workspace, then that person can supervise and the workspace owner is unchanged. Private teaching notes, board ink, and library files are not copied. The case passes with no teaching content and no student profiles.
6. Given a person who holds the faculty-admin grant and is also a teacher, when they supervise, then they can group teachers, oversee the schedule, and see attendance. They are the teacher only on sessions assigned to them. The case passes with no paint tools and no profile photos.
7. Given a teacher with no contact grant, when they try to speak with students or parents, then the conversation is refused. Given the faculty admin or the owner grants it, then those conversations open. The faculty admin can talk to students and parents and align that work to a teacher. The case passes with no whiteboard files.
8. Given a session, when student presence is marked, then it is the existing student attendance row, and a faculty admin can see it while planning. The case passes with no teacher handoff and no library.
9. Given the same session, when teacher presence is marked on the session record, then a faculty admin can see student attendance and teacher attendance together. The case passes with no student feedback and no theme.
10. Satisfied by 009. 010 does not restate the build. The student tied to that teacher sees 10:00–10:30 and 10:45–11:15, and a whole day is not required. Tested without profiles and content library.
11. Given a 1-on-1 the student belongs to, when they decline because they are unavailable or unwell, or they reschedule, then the session is declined or moved and the other person can see that. The case passes with no file upload and no admin succession.
12. Given the assigned teacher, when they hand the session to another teacher in the same organization, then that colleague receives the session, subject, and content. A faculty admin submitting that handoff is refused. The case passes with no theme toggle and no doubt notice.
13. Given that handoff, when a faculty admin allows the reversal, then the session and its content return. Other edits stay as they are. A reversal without faculty-admin permission is refused. There is no control that undoes an arbitrary earlier action. The case passes with no availability and no profiles.
14. Satisfied by 009. Pen, ten colors, eraser, text box, pointer, crop, and a local image, PDF, or other file. People write on top of the file. Text is one face and one size. Tested without the content library.
15. Given the library, when the teacher who will take the session files material by board, subject, and unit, then Office files, PNG, SVG, PDF, and Draw.io are accepted and the item sits in the library for that session. The live board still works if the library is empty. Board, subject, and unit are workspace topics.
16. Given a library item, when the teacher places it on that session's board, then the file appears there. Skipping that step still allows a computer upload. The case passes with no attendance and no feedback.
17. Satisfied by 009. The student may accept the clarified notice or ignore it. Either is complete. Tested without scheduling and profiles.
18. Given a student with a session with a teacher, when they send feedback, then it is stored against that teacher and is not an assignment grade comment. The case passes with no whiteboard and no handoff.
19. Given any signed-in shell, when the person chooses dark or light, then the signed-in screens follow that choice. The case does not depend on rows 1–18 or 20–21, and those rows do not depend on this one.
20. Given a new in-app notice, including a clarified doubt, when the person is in the shell, then the indicator shows it without opening each feature. The case passes with no library and no attendance.
21. Given sign-in or the inspire rail, when the campus frames are shown, then they are wide, sunny, green, lush, aerial views of university grounds from Europe, India, the United States, and China. They do not use an altar, stained glass, a cross, or a chapel-dominant frame as the subject, and they do not read as a close facade. The case passes with no profile, whiteboard, attendance, or library behavior. No new screen id.
22. Given this document, status is Specified. Human OK on tasks.md is unchecked. This pass does not implement, does not change application code, and does not download images.

## Out of scope

- Starting the parallel builders. The waves in the plan are a handoff for later, after human OK.
- A sixth login role, owner transfer, billing, quotas, or student WhatsApp.
- Profile photos, a global undo, a syllabus database, and merging the library with the whiteboard.
- Rebuilding 009.
- Quote portraits on the rail. Row 21 swaps the campus frames.

## Definition of done

- [x] Spec, plan, checklist, analyze, tasks, and test plan contain the frozen rows, including row 21.
- [ ] Human OK recorded on [tasks.md](tasks.md). **Unchecked. Blocks implement.**
- [ ] Builder implements only after that OK. Not this pass.
- [ ] Tester executes [test-plan.md](test-plan.md). Not this pass.
- [ ] PM Accept only after that report.
