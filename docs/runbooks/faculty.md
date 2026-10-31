# Faculty

This guide is for a teacher (`Dr. Meera Krishnan`, Senior Faculty / Faculty Admin `+9101t`) and for an assistant (`Rohan Deshmukh`, Assistant `+9101a`). Faculty admin is a grant on that same teaching login. It is not a separate account.

The steps use the exam-prep demo workspace (**Apex Science Academy**). The one-time code is always `000000`. There is no username and password.

## Demo Personas (Exam-Prep Workspace)

- **Owner / Admin:** `Vikram Nair` (`+9101o`)
- **Senior Faculty / Faculty Admin:** `Dr. Meera Krishnan` (`+9101t`)
- **Teaching Assistant:** `Rohan Deshmukh` (`+9101a`)
- **Student:** `Aarav Sharma` (`+9101s`, enrolled in `Grade 11 Evening Batch (Mon–Fri)`)
- **Parent:** `Rajesh Sharma` (`+9101p`)

## Sign in

1. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). The site sends you to the role doors at `/app/student/router` (**I’m here to learn**, **I’m a teacher**, **I’m a parent**, and the direct **Workspace Owner / Admin** door).
2. Teacher: choose **I’m a teacher**. On exam-prep that door opens the dashboard sign-in and skips staff sign-in. Use the 1-click **Workspace & Demo Persona Picker** (`Demo Persona Quick-Select` and `Workspace` dropdowns) to pick **Teacher — Dr. Meera Krishnan (`+9101t`)** or keep the prefilled `+9101t` and `000000` code. Click **Verify & Continue** to land on **Dashboard** at `/app/faculty/teacher-dash`.
3. Assistant: on the role doors, use **other staff sign-in** (`/app/faculty/staff-login`) or select **Teaching Assistant — Rohan Deshmukh (`+9101a`)** in the **Demo Persona Quick-Select** dropdown, code `000000`. You land on the same dashboard.
4. The workspace dropdown defaults to the exam-prep seed (`Coaching exam-prep`). You can switch to `Language 1-on-1`, `Music studio`, or a custom workspace ID from the dropdown.

Exam-prep hides staff sign-in from the main door on purpose. The “other staff sign-in” link and the 1-click **Workspace & Demo Persona Picker** let an assistant or the owner switch personas immediately.

## Where you land & Section Sub-Tabs

The faculty rail is: Dashboard, Schedule, Whiteboard, Availability, Students, Practice, Doubts, Records, Library, Profile.

The header has Back (on a screen that sits under a nav item), the place name, a sun or moon theme icon, a bell icon, **Terms**, and Sign out. Below the header, multi-screen workflows display horizontal **Section Sub-Tabs** so you can move across related screens in 1 click:

- **Schedule Sub-Tabs:** `Week Calendar` (`/app/faculty/schedule`) · `Sessions & Supervision` (`/app/faculty/sessions`) · `Pre-Class Prep` (`/app/faculty/session-pre`) · `My Availability` (`/app/faculty/availability`)
- **Students Sub-Tabs:** `Student Roster` (`/app/admin/roster`) · `Cohorts & Batches` (`/app/faculty/cohort-builder`) · `Mentor Backlog` (`/app/faculty/mentor`)
- **Practice & Assessments Sub-Tabs:** `1. Question Bank` (`/app/faculty/qbank`) · `2. Practice Builder` (`/app/faculty/practice-build`) · `3. Issue Homework` (`/app/faculty/assign-issue`) · `4. Grade Work` (`/app/faculty/assign-grade`) · `5. Mock Tests` (`/app/faculty/test-setup`) · `6. Cohort Analysis` (`/app/faculty/analysis`)
- **Doubts & Comms Sub-Tabs:** `Doubts Queue` (`/app/faculty/doubt-teacher`) · `Direct Messages` (`/app/faculty/messages`) · `Announcements` (`/app/faculty/announce`)
- **Records & Reports Sub-Tabs:** `Class Record & Roll` (`/app/faculty/record`) · `Session Recordings` (`/app/faculty/session-video`) · `Progress Reports` (`/app/faculty/reports`)

The bell lists in-app notices from the notification inbox, including class started, class cancelled, and a clarified doubt. **Terms** opens the workspace terms. The text is the file `docs/legal/terms-and-conditions.md`. A tech admin edits that file.

Availability is an Outlook-style week: click an empty quarter, drag a block, and drag an edge to resize. It snaps to 15 minutes. **Every week** repeats; **One date** paints time off or an extra slot for that day. It does not connect to an Outlook mailbox. Schedule is the class week in Asia/Kolkata.

## What each nav item does

**Dashboard** (`/app/faculty/teacher-dash`). The cohort name (`Grade 11 Evening Batch (Mon–Fri)`), how many students are in it, attendance percent, practice done, the doubt backlog, and a chase list of students (`Aarav Sharma`, `Diya Patel`, `Kabir Verma`) to check on. Class notices sit on this page. From here you can open a student’s timeline, the mentor backlog, or the whiteboard.

**Schedule** (`/app/faculty/schedule`). The week, in Asia/Kolkata. Use the collapsible **+ New Session** form and structured `<select>` dropdowns (cohort or 1-on-1 student, subject, time slot) to create a session, move its time, or cancel it. Cancelling tells parents and the admin. A teacher cancel keeps the hour. A 1-on-1 session is booked against one student on the roster. Before **Save time** on a move, the page shows a live consequence preview saying **Hour stays** or **Hour is used**. The save response is `hour` of `stays` or `used`. A move at or outside 24 hours says Hour stays. Inside 24 hours it says Hour is used, and that move uses the session length (60 minutes when the session has no end). When you are the owner, the line is **Hour stays because the owner can waive it.** Use the **Schedule** section sub-tabs to jump to **Sessions & Supervision** (`/app/faculty/sessions`), **Pre-Class Prep** (`/app/faculty/session-pre`), and **My Availability** (`/app/faculty/availability`).

**Whiteboard** (`/app/faculty/live-teacher`). The shared class canvas for the session, plus cohort chat when the session belongs to a cohort. The assigned teacher can hand the session, its subject, and a library item to a colleague in the same organization using structured `<select>` pickers. From the board you can open the session record.

**Availability** (`/app/faculty/availability`). The Outlook-style week above. Save availability. You see your own row (`Dr. Meera Krishnan`). The owner (`Vikram Nair`) can pick another staff member from the `<select>` dropdown and edit theirs. Parents (`Rajesh Sharma`) book an open hour only inside the week you publish, and only in the next 7 days.

**Students** (`/app/admin/roster`). The roster. The rail stays the faculty rail when a teacher opens it from Students, and the **Students** section sub-tabs link `Student Roster`, `Cohorts & Batches`, and `Mentor Backlog`. Click the collapsible **+ Add student** button, import a CSV, paste a WhatsApp list (one `name,phone` per line), or pick a student from the `<select>` dropdown to mint a parent invite token. Cohorts are on the same page, and **Cohorts & Batches** is `/app/faculty/cohort-builder` (class chat included). Open a student (`Aarav Sharma`) to see the card a teacher is allowed to see: grade, board, and study info. Phone and home address stay on that person’s own profile.

**Practice** (`/app/faculty/qbank`). The question bank, with a collapsible **+ Add Question** form (structured Option A–D inputs, `<select>` dropdowns for correct answer, difficulty, and topic, plus tag chips). The horizontal **Practice & Assessments** section sub-tabs walk through the 6-step workflow:

- `1. Question Bank`: `/app/faculty/qbank`
- `2. Practice Builder`: `/app/faculty/practice-build`
- `3. Issue Homework`: `/app/faculty/assign-issue`
- `4. Grade Work`: `/app/faculty/assign-grade`
- `5. Mock Tests`: `/app/faculty/test-setup`
- `6. Cohort Analysis`: `/app/faculty/analysis`

**Doubts** (`/app/faculty/doubt-teacher`). The queue, paired with the **Doubts & Comms** section sub-tabs (`Doubts Queue`, `Direct Messages`, `Announcements`). Open a doubt, write the answer (or insert a preset reply), and mark it clarified. That writes the timeline. WhatsApp is only the channel after the timeline write, and the student channel stays off unless the owner turns it on. The student can accept or ignore the clarified notice. Message threads are `/app/faculty/messages` and announcements are `/app/faculty/announce`.

**Records** (`/app/faculty/record`). The **3-step Attendance & Class Summary flow**, paired with the **Records & Reports** section sub-tabs (`Class Record & Roll`, `Session Recordings`, `Progress Reports`):

1. **Step 1 · Pick Session:** Choose the scheduled session from the `<select>` dropdown.
2. **Step 2 · Mark Attendance Roll (Teacher & Students):** Mark the Lead Teacher (`Present` or `Absent`) and each student (`Attended`, `No-show`, `Student cancel`, or `Teacher cancel`, or use **Mark All Attended**). A student you do not mark stays unmarked. A stored present still reads as Attended, and absent as No-show. A live **Lesson-Pack Hour Impact** badge previews how many student packs will have 1 hour deducted (`Attended` and `No-show`) versus preserved (`Teacher cancel`).
3. **Step 3 · Save Class Summary Note:** Insert a 1-click summary template or write the class note, review the **Consequence Preview Before Saving** card, and click **Save Class Record**. Saving writes each student’s timeline. Attended and No-show use the session length from the pack, 60 minutes when the session has no end. A student cancel inside 24 hours uses that same length. A teacher cancel keeps it. Session video is `/app/faculty/session-video`.

**Library** (`/app/student/library`). Content for this workspace. The address is the library screen. The shell follows whoever is signed in, so a teacher still has the faculty rail. A teacher can open the collapsible **+ Add item** form to add an item (title, body, `<select>` file kind such as pdf, png, svg, drawio, docx, pptx, xlsx, plus board, subject, and unit labels). Students open the same library and then a lesson.

**Profile** (`/app/faculty/profile`). Your phone, address, expertise, and subjects. Saving asks for the one-time code. Phone and address are not shown on the card other people see.

## Faculty admin

Sessions (`/app/faculty/sessions`) includes a **Faculty admin** card. The card is drawn only when `GET /api/v1/faculty-admin/me` says this person holds the grant. If the grant is missing, the card is not shown.

The exam-prep seed writes that grant for Senior Faculty `Dr. Meera Krishnan` (`+9101t`), granted by owner `Vikram Nair` (`+9101o`). Assistant `Rohan Deshmukh` (`+9101a`) does not get a grant row. After a normal seed, `Dr. Meera Krishnan` sees the card on Sessions and `Rohan Deshmukh` does not.

A tech admin confirms it by signing in as that person and calling `GET /api/v1/faculty-admin/me`, or by looking for a row in `faculty_admin_grants` for that user and workspace.

When the card is there you can:

- Mark planning attendance for each student: Attended, No-show, Student cancel, or Teacher cancel. Unmarked stays unmarked. A stored present still reads as Attended, and absent as No-show. The teacher line on that card is Present or Absent.
- Read teacher profiles (name, subjects, expertise, organization email) and correct one. Phone and home address stay off this card.
- Grant or remove a teacher’s permission to contact students and parents.
- Transfer the faculty-admin grant to someone else. The workspace owner does not change.
- Revert a handoff. That returns the session to the previous teacher.

A faculty-admin save on Profile also asks for an email code. That email step is not a new login.

## A teaching day

1. Sign in via the **Workspace & Demo Persona Picker** (`Dr. Meera Krishnan`, `+9101t`) and read the chase list on the dashboard.
2. Check the week under **Schedule** (using the `Week Calendar`, `Sessions & Supervision`, `Pre-Class Prep`, and `My Availability` sub-tabs). Create or move a session, or cancel it if the class will not run.
3. Publish the hours you can teach on Availability.
4. Open the whiteboard when the class starts. Hand it off only if a colleague should take that session.
5. After class, open **Records** and complete the 3-step Attendance & Class Summary flow: pick the session, mark `Attended`, `No-show`, `Student cancel`, or `Teacher cancel` while checking the live lesson-pack consequence preview, and save the class summary note. Parents (`Rajesh Sharma`) read that note, and the hours left, on their home screen.
6. Clear the doubt queue under **Doubts & Comms**. Mark a doubt clarified when it is done.
7. Add or issue practice across the 6 **Practice & Assessments** sub-tabs when the cohort needs work.

Announcements live at `/app/faculty/announce`. The mentor backlog is linked from the dashboard and the **Students** sub-tabs at `/app/faculty/mentor`: book a backlog item onto a session.

The exam-prep child (`Aarav Sharma`) starts with an 8-hour pack. Parents see the hours left on Home and on Fees. Booking an open hour does not use one. The owner (`Vikram Nair`) creates a student and a pack from the owner console (name, phone, hours). Payouts lists delivered sessions. Faculty admin stays the card on Sessions. It is not a separate login. Sign-in phones stay owner `+9101o` (`Vikram Nair`), teacher `+9101t` (`Dr. Meera Krishnan`), assistant `+9101a` (`Rohan Deshmukh`), student `+9101s` (`Aarav Sharma`), parent `+9101p` (`Rajesh Sharma`), code `000000`.

## Not shipped

- More than one branch.
- A quality spot-check of a recording.
