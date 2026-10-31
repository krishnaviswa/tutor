# Student

This guide is for the learner (`Aarav Sharma`, Student `+9101s`, enrolled in `Grade 11 Evening Batch (Mon–Fri)`). The steps use the exam-prep demo (**Apex Science Academy**). The one-time code is `000000`. There is no password.

## Demo Personas (Exam-Prep Workspace)

- **Owner / Admin:** `Vikram Nair` (`+9101o`)
- **Senior Faculty / Faculty Admin:** `Dr. Meera Krishnan` (`+9101t`)
- **Teaching Assistant:** `Rohan Deshmukh` (`+9101a`)
- **Student:** `Aarav Sharma` (`+9101s`)
- **Parent:** `Rajesh Sharma` (`+9101p`)

## Sign in

1. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). You arrive at the role doors (`/app/student/router`: **I’m here to learn**, **I’m a teacher**, **I’m a parent**, and **Workspace Owner / Admin**).
2. Choose **I’m here to learn**. That opens `/app/student/student-login`.
3. In the 1-click **Workspace & Demo Persona Picker**, **Student — Aarav Sharma (`+9101s`)** and the `Coaching exam-prep` workspace are already selected. Code `000000`. Click **Verify** to land on Home at `/app/student`.
4. Phone OTP is the default. **Magic link** on the same screen uses the student email `student@exam-prep.sim` and returns the same kind of stub sign-in. It is not a live mailbox.

The workspace dropdown defaults to the exam-prep seed (`Coaching exam-prep`). You can switch to `Language 1-on-1`, `Music studio`, or a custom workspace ID from the dropdown.

## Where you land & Section Sub-Tabs

The bottom nav is: Home, Classes, Whiteboard, Practice, Doubts, You, Profile.

The header has Back when you are on a nested screen, a sun or moon theme icon, a bell icon, **Terms**, and Sign out. Below the header, multi-screen student workflows display horizontal **Section Sub-Tabs**:

- **Student Classes Sub-Tabs:** `Study Library` (`/app/student/library`) · `Lesson View` (`/app/student/lesson`) · `Join Class` (`/app/student/join`) · `Live Whiteboard` (`/app/student/live-student`)
- **Student Practice Sub-Tabs:** `Practice Sets` (`/app/student/practice-play`) · `Mock Tests` (`/app/student/test-runner`) · `My Results` (`/app/student/practice-result`)
- **Student You Sub-Tabs:** `Activity Timeline` (`/app/student/timeline`) · `Fees & Packs` (`/app/student/payments`) · `Alerts` (`/app/student/notif-prefs`) · `My Profile` (`/app/faculty/profile`)

The bell lists in-app notices (class started, class cancelled, a clarified doubt). **Terms** shows the workspace file `docs/legal/terms-and-conditions.md`.

Your WhatsApp channel is off unless the owner turns it on. Notices you act on are in the app.

## What each nav item does

**Home** (`/app/student`). Your name (`Aarav Sharma`), the next class (`Vectors & Relative Motion — Live Class` with `Dr. Meera Krishnan`), due practice, this week’s test, and an open doubt if one is answered. For a 1-on-1 you can say you are unwell (decline) or pick another time (“I am unavailable then”) using structured `<select>` options. You can send feedback about the teacher. That feedback is stored on the teacher. It is not an assignment grade. Home also links to the whiteboard, the join waiting room, practice, and doubts. Class notices sit on this page.

**Classes** (`/app/student/library`). Lessons and files for this workspace, with a kind and a progress bar, paired with the **Student Classes** section sub-tabs (`Study Library`, `Lesson View`, `Join Class`, `Live Whiteboard`). Open one to read the lesson (`/app/student/lesson`). You do not add library items. A teacher does.

**Whiteboard** (`/app/student/live-student`). The shared class canvas and, for a cohort session, the class chat. If nothing is upcoming, join from the waiting room (`/app/student/join`) when a class is on the calendar. The join token for the exam-prep seed is `join-exam-prep` (selectable from the `<select>` session picker). The class runs on the mock video link stored on the session. TutorOS does not host the video call.

**Practice** (`/app/student/practice-play`). Pick a set (`Practice Set 1: Projectile & Relative Motion`), answer, and submit. Use the **Student Practice** section sub-tabs (`Practice Sets`, `Mock Tests`, `My Results`) to view your result at `/app/student/practice-result` or take a timed mock test at `/app/student/test-runner`.

**Doubts** (`/app/student/doubt-student`). Open the collapsible **+ Ask a Doubt** form, pick a topic or subject from the `<select>` dropdown, write your question, and send it to the queue. When `Dr. Meera Krishnan` marks it clarified, you can **Accept** or **Ignore**. Either one finishes the notice.

**You** (`/app/student/timeline`). Your timeline: the ledger the teacher writes from the 3-step Attendance & Class Summary screen (`/app/faculty/record`). Use the **Student You** section sub-tabs to switch between `Activity Timeline` (`/app/student/timeline`), `Fees & Packs` (`/app/student/payments`), `Alerts` (`/app/student/notif-prefs`), and `My Profile` (`/app/faculty/profile`). On `Fees & Packs` (`/app/student/payments`), you see the lesson-pack balance in hours (the exam-prep pack is 8 hours, or less after a class uses time from it) and invoices formatted in Rupees (`₹`). `GET /api/v1/students/{id}/lesson-pack` returns `balance_minutes` and `purchased_minutes`. The demo pack is 480 minutes only after a seed that includes `seed_internal_v2`. You can pay an open invoice with the mock checkout. A paid row shows a receipt. Notification choices are `/app/student/notif-prefs`. Student WhatsApp stays off unless the owner enables it.

**Profile** (`/app/faculty/profile`). The same profile screen, in the student shell. You can save phone, address, expertise, and a board label. Saving asks for the one-time code. Teachers see your grade, board, and study info. They do not see your phone or address on that card.

## Jobs you can do today

1. Sign in via the 1-click **Workspace & Demo Persona Picker** as `Aarav Sharma` (`+9101s`) and read the next class on Home.
2. Join the whiteboard when the class is up, or open `Join Class` in the **Classes** sub-tabs with the session token.
3. Finish the practice set that Home marks as due, and read the result under the **Practice** sub-tabs.
4. Ask a doubt via `+ Ask a Doubt`, then accept or ignore it after the teacher clarifies it.
5. On a 1-on-1, decline or propose another time, and send teacher feedback if you want to.
6. Pay a mock invoice in Rupees (`₹`) and keep the receipt on `Fees & Packs`. Read the hours left on that same screen when the pack balance is there.
7. Read your `Activity Timeline` in the **You** sub-tabs when you want the class history in one list.

On a 1-on-1 you can decline or propose another time from Home. A move at or outside 24 hours keeps the time on the pack. Inside 24 hours that move uses the session length. Attended and No-show use that length, which is 60 minutes when the session has no end. A student cancel inside 24 hours uses it too. A teacher cancel does not. The owner can waive a forfeit. Home does not print “Hour stays”; Schedule does, before the teacher saves the move. The save response is `hour` of `stays` or `used`.

You do not file attendance yourself. The teacher (`Dr. Meera Krishnan`) does, on the 3-step session record: Attended, No-show, Student cancel, or Teacher cancel, with live lesson-pack consequence previews. Unmarked stays unmarked. A stored present still reads as Attended, and absent as No-show. Your parent (`Rajesh Sharma`) sees the count on their home, and can book an open hour in the next 7 days inside the teacher’s published week. That booking does not use an hour. Sign-in phones stay owner `+9101o` (`Vikram Nair`), teacher `+9101t` (`Dr. Meera Krishnan`), assistant `+9101a` (`Rohan Deshmukh`), student `+9101s` (`Aarav Sharma`), parent `+9101p` (`Rajesh Sharma`), code `000000`.

## Not shipped

- More than one branch.
- A quality spot-check of a recording.
