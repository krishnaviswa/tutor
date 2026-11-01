# Parent

This guide is for a guardian (`Rajesh Sharma`, Parent `+9101p`) linked to a child (`Aarav Sharma`, Student `+9101s`) in the workspace. You see that child only. The steps use the exam-prep demo (**Apex Science Academy**). The one-time code is `000000`. There is no password.

## Demo Personas (Exam-Prep Workspace)

- **Owner / Admin:** `Vikram Nair` (`+9101o`)
- **Senior Faculty / Faculty Admin:** `Sudhakshina` (`+9101t`)
- **Teaching Assistant:** `Rohan Deshmukh` (`+9101a`)
- **Student:** `Aarav Sharma` (`+9101s`, enrolled in `Grade 11 Evening Batch (Mon–Fri)`)
- **Parent:** `Rajesh Sharma` (`+9101p`)

## Sign in

1. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). You arrive at the role doors (`/app/student/router`: **I’m here to learn**, **I’m a teacher**, **I’m a parent**, and **Workspace Owner / Admin**).
2. Choose **I’m a parent**. That opens `/app/parent/parent-link`.
3. In the 1-click **Workspace & Demo Persona Picker**, **Parent — Rajesh Sharma (`+9101p`)** and the `Coaching exam-prep` workspace are selected. Code `000000`.
4. Confirm the invite token from the `<select>` dropdown (`link-exam-prep — Aarav Sharma (Accepted)`). The exam-prep seed token is `link-exam-prep`, and that link is already accepted for `Aarav Sharma`. Submit it. You land on Family at `/app/parent`.

If you open `/app/parent` directly after the code, and the link is already accepted, you are on the home screen without another invite. A second child (`Diya Patel`, parent `Sunita Patel`) stays hidden until a teacher or the owner mints a link and you accept it.

The owner (`Vikram Nair`) or a teacher (`Sudhakshina`) creates an invite from the roster, or from the same parent-link page while they are signed in. They pick the student from the `<select>` dropdown and get a token. You select or paste that token and choose **Link my account**.

## Where you land & Section Sub-Tabs

The bottom nav is: Home, Activity, Reports, Fees, Chat.

The header has Back on a nested screen, a sun or moon theme icon, a bell icon, **Terms**, and Sign out. Below the header, multi-screen parent workflows display horizontal **Section Sub-Tabs**:

- **Parent Home Sub-Tabs:** `Family Overview` (`/app/parent`) · `Alert Preferences` (`/app/student/notif-prefs`)
- **Parent Reports Sub-Tabs:** `Progress Report` (`/app/faculty/reports`) · `Test Results` (`/app/student/practice-result`)

The bell lists in-app notices, including class started and class cancelled. **Terms** shows `docs/legal/terms-and-conditions.md`.

You do not need Chat to see attendance, the last class note, the lesson pack, open hours, or fees. Those are on Home.

## What each nav item does

**Home** (`/app/parent`). Your linked child (`Aarav Sharma`), in this workspace only, paired with the **Parent Home** section sub-tabs (`Family Overview`, `Alert Preferences`).

On the page, without opening Chat:

- **Attendance** is the count on file (`present / total`). The teacher (`Sudhakshina`) marks each student Attended, No-show, Student cancel, or Teacher cancel on the 3-step session record. A student left unmarked stays unmarked.
- **Lesson pack** is the hours left when home includes `lesson_pack.balance_minutes`. If that field is missing, the page asks `GET /api/v1/students/{id}/lesson-pack`. The number is hours, for example 8 hours, or 7 hours 30 minutes. The exam-prep child (`Aarav Sharma`) starts with an 8-hour pack. If the API sends no balance, this card is absent.
- **Latest assignment** appears only when home includes `latest_assignment.submitted`. The line is Turned in or Not turned in. If that flag is absent, Home does not show a done mark.
- **Last class note** is the newest teacher note on a session this child attended, or a 1-on-1 booked for this child, published from Step 3 of the teacher’s Attendance & Class Summary flow. If the teacher has not saved a note, the card says so.
- **Fees** shows the open amount in Rupees (`₹`) and the date it is due, and the latest paid receipt (amount in `₹` and receipt id). If the guardian link hides fees, this block is hidden.
- **Open hours** lists 60-minute starts from `GET /api/v1/parent/open-hours`, in the next 7 days, inside `Sudhakshina`’s published week. You pick one. That posts `{start}` to `/api/v1/parent/bookings`. Booking does not use the hour. If the balance is under 60 minutes, the post returns 400 and the page shows that detail (`balance under 60 minutes`). If the open-hours route is not there, the card is absent. After a restart on the current API, the card shows.

You also see the latest practice score, the latest test score, and class notices. Links from Home open Activity, the marksheet, the practice result, Fees, and Chat when you want the longer page.

**Activity** (`/app/student/timeline`). `Aarav Sharma`’s timeline, the same ledger the teacher writes. The shell stays the parent shell. You do not see another family’s child.

**Reports** (`/app/faculty/reports`). A marksheet for your child (`Aarav Sharma`), paired with the **Parent Reports** section sub-tabs (`Progress Report` at `/app/faculty/reports` and `Test Results` at `/app/student/practice-result`): attendance, practice, latest test, and the teacher note. You do not get the owner export or the other students.

**Fees** (`/app/student/payments`). The same lesson-pack balance, when the API returns it, plus open invoices and paid receipts formatted in Rupees (`₹`). **Pay (mock)** checks out through the mock payments port. Nothing is charged on a live Razorpay account. If your link has fees hidden, Home already says fees are hidden and this list is not the place to discover another child’s bill. The pack balance is not a second child’s bill.

**Chat** (`/app/faculty/messages`). A thread with the teacher (`Sudhakshina`), on the record. Use it when you need to write to them. Attendance, the class note, the pack balance, and the fee summary do not depend on this thread.

Notification choices are `/app/student/notif-prefs` (also reachable from the `Alert Preferences` sub-tab on Home). Your own channels can be set there. The student’s WhatsApp stays off unless the owner enables it.

## Jobs you can do today

1. Sign in via the 1-click **Workspace & Demo Persona Picker** as `Rajesh Sharma` (`+9101p`) and read attendance, the last class note, the fee line in Rupees (`₹`), and the hours left on Home.
2. Book an open hour in the next 7 days. That hold does not use an hour from the pack.
3. Read whether the latest assignment was turned in, when Home shows that line.
4. Open Activity when you want every timeline line, not only the latest class note.
5. Open Reports (and switch between `Progress Report` and `Test Results` sub-tabs) for the marksheet.
6. Pay an open invoice in Rupees (`₹`) on Fees and keep the receipt. Home then shows that receipt as the latest paid one. Fees shows the same pack balance when the API returns it.
7. Message `Sudhakshina` on Chat when the note is not enough.

If Home says there is no linked child, the invite was not accepted for this login. Go back to parent-link and submit the token the academy gave you.

Attended and no-show use the session length, which is 60 minutes when the session has no end. A student cancel or a move inside 24 hours uses that length. At or outside 24 hours the length stays. A teacher cancel does not. The owner (`Vikram Nair`) can waive a forfeit. Booking the open hour does not itself use the hour.

## Not shipped

- More than one branch.
- A quality spot-check of a recording.
