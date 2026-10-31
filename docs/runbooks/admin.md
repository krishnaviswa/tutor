# Workspace admin

This guide is for the workspace owner (`Vikram Nair`, Owner `+9101o`). That login is the role `owner`. Faculty admin is a grant a teacher (`Dr. Meera Krishnan`, `+9101t`) can hold. It does not replace the owner, and handing the grant to someone else leaves you as owner.

The steps use the exam-prep demo (**Apex Science Academy**). The one-time code is `000000`. There is no username and password.

## Demo Personas (Exam-Prep Workspace)

- **Owner / Admin:** `Vikram Nair` (`+9101o`)
- **Senior Faculty / Faculty Admin:** `Dr. Meera Krishnan` (`+9101t`)
- **Teaching Assistant:** `Rohan Deshmukh` (`+9101a`)
- **Student:** `Aarav Sharma` (`+9101s`, enrolled in `Grade 11 Evening Batch (Mon–Fri)`)
- **Parent:** `Rajesh Sharma` (`+9101p`)

## Sign in

1. Open [http://127.0.0.1:3000](http://127.0.0.1:3000). You arrive at the role doors (`/app/student/router`).
2. Choose the direct **Workspace Owner / Admin** door (`/app/admin`), or click **other staff sign-in** (`/app/faculty/staff-login`).
3. In the 1-click **Workspace & Demo Persona Picker**, **Owner / Admin — Vikram Nair (`+9101o`)** and the `Coaching exam-prep` workspace are selected (or select them from the `<select>` dropdowns), with code `000000`.
4. Click **Verify & Continue** to land on the owner console at `/app/admin`.

## Where you land & Section Sub-Tabs

The owner rail is: Owner console, Billing, Reports, Cohorts, Schedule, Records, Integrations, Profile.

The header has Back on a nested screen, the place name, a sun or moon theme icon, a bell icon, **Terms**, and Sign out. Below the header, multi-screen admin and teaching workflows display horizontal **Section Sub-Tabs**:

- **Owner Console Sub-Tabs:** `Scorecard & Enquiries` (`/app/admin`) · `Teacher Payouts` (`/app/admin/payouts`) · `Subscription & Quotas` (`/app/admin/subscription`) · `Automations` (`/app/admin/automation`) · `Templates` (`/app/admin/template-gallery`) · `Branding` (`/app/admin/branding`) · `Workspace Setup` (`/app/admin/wsetup`)
- **Schedule Sub-Tabs:** `Week Calendar` (`/app/faculty/schedule`) · `Sessions & Supervision` (`/app/faculty/sessions`) · `Pre-Class Prep` (`/app/faculty/session-pre`) · `My Availability` (`/app/faculty/availability`)
- **Students / Cohorts Sub-Tabs:** `Student Roster` (`/app/admin/roster`) · `Cohorts & Batches` (`/app/faculty/cohort-builder`) · `Mentor Backlog` (`/app/faculty/mentor`)
- **Records & Reports Sub-Tabs:** `Class Record & Roll` (`/app/faculty/record`) · `Session Recordings` (`/app/faculty/session-video`) · `Progress Reports` (`/app/faculty/reports`)

The bell is the in-app notice list. **Terms** shows `docs/legal/terms-and-conditions.md`. A tech admin changes that file.

Availability is an Outlook-style week (click, drag, resize, 15-minute snap, every week or one date). It does not connect to an Outlook mailbox. Schedule is the class week.

## What each nav item does

**Owner console** (`/app/admin`). The operating scorecard: sessions delivered against the plan, active students, practice completion, doubt SLA, revenue in Rupees (`₹`) and collected percent, teachers, and cohort margin. The same page loads usage meters. The **Enquiry** form on this page takes name, phone, and pack hours (via structured `<select>` presets such as 8 hours). **Save enquiry** posts `{name, phone, hours}` to `POST /api/v1/owner/enquiries`. That call is owner only. It creates a student and a lesson pack. The exam-prep child (`Aarav Sharma`) already has an 8-hour pack; parents (`Rajesh Sharma`) read that balance on Home and on Fees. The horizontal **Owner Console** section sub-tabs give 1-click access to **Teacher Payouts** (`/app/admin/payouts`), **Subscription & Quotas** (`/app/admin/subscription`), **Automations** (`/app/admin/automation`), **Templates** (`/app/admin/template-gallery`), **Branding** (`/app/admin/branding`), and **Workspace Setup** (`/app/admin/wsetup`).

On **Subscription & Quotas** (`/app/admin/subscription`) you read the meters, change a cap, and pause WhatsApp for 24 hours. Caps throttle paid sends. The teaching record still writes. Student WhatsApp stays off unless you enable that channel.

On **Teacher Payouts** (`/app/admin/payouts`), `GET /api/v1/payouts` adds `delivered` and `hours`: classes the student attended with the teacher present (`Dr. Meera Krishnan`), and the hours on the statement the teacher checks, formatted in Rupees (`₹`). You can move a row from pending to approved to paid.

**Templates** (`/app/admin/template-gallery`) and **Automations** (`/app/admin/automation`) sit directly in the **Owner Console** section sub-tabs. The gallery applies a template (a set of module toggles and a starter topic list). Automation turns a rule on or off, such as the seeded “Post-class summary notification” timeline write, or adds a new rule via the collapsible **+ New Rule** form with structured trigger and action `<select>` dropdowns.

Also in the **Owner Console** sub-tabs: **Workspace Setup** (`/app/admin/wsetup`), **Branding** (`/app/admin/branding`), and the onboarding kind selector (`/app/admin/onboard-kind`).

**Billing** (`/app/admin/billing`). Issue an invoice for a student (`Aarav Sharma`, `Diya Patel`, `Kabir Verma`) using `<select>` dropdowns for Student, Plan (`Monthly Tuition Plan`), Rupee (`₹`) fee presets (`₹2,500`, `₹4,500`, `₹9,000`, `₹18,000`, or custom `₹` amount—automatically converted to cents under the hood), and Coupon (`SAVE10`, `EARLYBIRD`). Run renewals, and open the invoice trail (pay, receipt, refund on the mock payments port). The prepaid pack is the enquiry on the owner console, not a second form on this screen. Attended and no-show use the session length, which is 60 minutes when the session has no end. A student cancel or a move inside 24 hours uses that length. At or outside 24 hours it stays. A teacher cancel does not use it. You can waive a forfeit: on Schedule, before Save time, your line is **Hour stays because the owner can waive it.** The save response is `hour` of `stays` or `used`.

**Reports** (`/app/faculty/reports`). The owner is allowed in, and the shell follows the owner, so you keep the owner rail. You see each student’s attempts, attendance, practice, latest test, and teacher note, plus platform subscription revenue and student fees collected in Rupees (`₹`). Export writes a report file from that slice. A parent who opens this route sees only the linked child, as a marksheet, without the export button.

**Cohorts** (`/app/admin/roster`). The student list (`Aarav Sharma`, `Diya Patel`, `Kabir Verma`) and cohorts (`Grade 11 Evening Batch (Mon–Fri)`, `Weekend Fast-Track Batch`): open the collapsible **+ Add student** form, import CSV, paste a WhatsApp list, pick a student in the `<select>` dropdown to mint a parent invite, and open cohorts. New cohort is `/app/faculty/cohort-builder` in the **Students** sub-tabs.

**Schedule** (`/app/faculty/schedule`). This item opens the faculty week calendar with the **Schedule** section sub-tabs (`Week Calendar`, `Sessions & Supervision`, `Pre-Class Prep`, `My Availability`). The owner is allowed to use it. You can create a session via the collapsible **+ New Session** form, change its time, or cancel it. Cancel notifies parents and admin. A teacher cancel keeps the hour. A 1-on-1 picks a roster student. Before **Save time** the page says **Hour stays** or **Hour is used**, and for you **Hour stays because the owner can waive it.** On **My Availability** (`/app/faculty/availability`) you can select any staff member (`Dr. Meera Krishnan`, `Rohan Deshmukh`) from the `<select>` dropdown and edit their Outlook-style week. That week does not sync Outlook.

**Records** (`/app/admin/audit`). The workspace journal (with action filter chips). Export posts a data export. This is the audit log. The class note a teacher files is on the 3-step faculty Records screen (`/app/faculty/record`), not here.

**Integrations** (`/app/admin/integrations`). Mock connect for each named integration. The page says mock OAuth. Live Google, Meta, Outlook, Razorpay, and WhatsApp are not connected.

**Profile** (`/app/faculty/profile`). Phone, address, expertise, and subjects. Saving confirms with the one-time code. If you also hold the faculty-admin grant, the save asks for an email code as well. That email step does not create a new login.

## Jobs you can do today

1. Sign in via the direct **Workspace Owner / Admin** door as `Vikram Nair` (`+9101o`) and read the scorecard and meters before you change a cap.
2. Save an enquiry with name, phone, and pack hours when a new student needs a pack. Parents then see the hours left on Home.
3. Issue or renew a fee in Rupees (`₹`) on Billing, then leave pay and receipts on the mock port. Parents see the open amount and the latest paid receipt on their home screen when the parent link allows fees.
4. Mint a parent invite from Cohorts, or from `/app/parent/parent-link` while signed in as owner. The parent accepts the token.
5. Put a class on the week, or cancel one. Before Save time, read Hour stays or Hour is used. The cancelled row stays on the calendar. A teacher cancel keeps the hour.
6. Pause WhatsApp, or leave student WhatsApp off.
7. Open **Teacher Payouts** from the **Owner Console** sub-tabs and read the delivered sessions, then move a row when you are ready to mark it approved or paid.
8. Read the audit journal if you need to see what changed.
9. Apply a template from the **Templates** sub-tab only when you mean to change the module set for this workspace.

The exam-prep seed gives the faculty-admin grant to Senior Faculty `Dr. Meera Krishnan` (`+9101t`), not to you. You (`Vikram Nair`, `+9101o`) remain the owner. The teacher uses the Faculty admin card on Sessions. You can still sign in as owner and use the owner rail. A tech admin checks the grant with `GET /api/v1/faculty-admin/me` or the `faculty_admin_grants` table.

Student attendance on the 3-step session record (`/app/faculty/record`) is Attended, No-show, Student cancel, or Teacher cancel, with live lesson-pack consequence previews before saving. Unmarked stays unmarked. A stored present still reads as Attended, and absent as No-show. The faculty-admin card is on Sessions for the teacher `+9101t`. It is not a separate login. Sign-in phones stay owner `+9101o` (`Vikram Nair`), teacher `+9101t` (`Dr. Meera Krishnan`), assistant `+9101a` (`Rohan Deshmukh`), student `+9101s` (`Aarav Sharma`), parent `+9101p` (`Rajesh Sharma`), code `000000`.

## Not shipped

- More than one branch.
- A quality spot-check of a recording.
