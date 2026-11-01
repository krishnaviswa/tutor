# Tech admin

This guide is for the person who runs the stack on a machine. It is not a login role. The product roles are owner, teacher, assistant, student, and parent. You use those humanized demo personas and phones when you need to click through the app.

Biology / NEET in this repository is an example tenant pack. It is not a separate product and not a syllabus database.

## Run the local stack

Follow README section 1. Postgres is the local database. Pytest is the only SQLite path.

Start Postgres. The container name is `tutoros-postgres`. Wait until it is healthy.

```bash
docker compose up -d postgres
```

The database URL the API expects is `postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros`.

From `backend/`, install dependencies and start the API:

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

From `frontend/`, start the site:

```bash
npm run dev
```

The site is [http://127.0.0.1:3000](http://127.0.0.1:3000). It redirects to `/app/student/router`. The browser calls the API at `http://127.0.0.1:8000` unless `NEXT_PUBLIC_API_BASE` is set.

`docker compose up -d --build` also starts the API container and the web container (site on port 3000, API on port 8000). Inside Compose the API uses the hostname `postgres`, not `127.0.0.1`. Copy `.env.example` when you need a file. Do not commit secrets.

Wipe the local Postgres seed and load it again:

```bash
cd backend
python -m app.seed_cli --reset
```

`seed_all` skips a workspace that already exists, so a normal API start does not add the lesson-pack rows or humanized persona names to an old database. Demo students (`Aarav Sharma`, `Diya Patel`) receive an 8-hour pack (480 minutes on `balance_minutes` and `purchased_minutes`) only when the seed includes `seed_internal_v2`. If parent home has no hours line or shows legacy names after the current API is up, run the reset above. That wipes local app data. Leave the Postgres volume in place.

Seeded workspaces are `exam-prep` (**Apex Science Academy**), `language-1on1` (**Polyglot Language Studio**), and `music` (**Swar Sangam Music Academy**). Exam-prep personas and phones are:

- **Owner / Admin:** `Vikram Nair` (`+9101o`)
- **Senior Faculty / Faculty Admin:** `Sudhakshina` (`+9101t`)
- **Teaching Assistant:** `Rohan Deshmukh` (`+9101a`)
- **Student:** `Aarav Sharma` (`+9101s`, plus `Diya Patel` and `Kabir Verma` in `Grade 11 Evening Batch (Mon–Fri)`)
- **Parent:** `Rajesh Sharma` (`+9101p`, plus `Sunita Patel`)

The OTP code is `000000` for every role. Language (`+9102`) seeds `Elena Rostova` (owner), `Claire Dubois` (teacher), `Liam O'Connor` (assistant), `Maya Lin` (student), `David Lin` (parent). Music (`+9103`) seeds `Pandit Ravi Kulkarni` (owner), `Ananya Sen` (teacher), `Karthik Iyer` (assistant), `Zoya Khan` (student), `Farhan Khan` (parent).

## Tests

Pytest uses an in-memory SQLite database. It does not use the Compose Postgres. From `backend/`:

```bash
python -m pytest
```

Vendor ports stay mock. A test run asserts that no live vendor call was made. Product checks that need the real seed go through `/api/v1` on Postgres, not through pytest.

## Mock ports

Defaults are mock. Nothing in a normal local run calls a live vendor.

| Port | Env | Default |
|---|---|---|
| Calendar and video | `VIDEO_PROVIDER` | `mock` |
| SMS | `SMS_PROVIDER` | `mock` |
| Email | `EMAIL_PROVIDER` | `mock` |
| Storage | `STORAGE_PROVIDER` | `local` |
| Student payments | `PAYMENTS_STUDENT_PROVIDER` | `mock` |
| Platform payments | `PAYMENTS_PLATFORM_PROVIDER` | `mock` |
| Push | `PUSH_PROVIDER` | `mock` |
| WhatsApp | `WHATSAPP_PROVIDER` | `mock` |

The catalog names live options (Google or Microsoft video, Razorpay, Stripe, Meta WhatsApp, and others). Those are not turned on. The Integrations screen is mock connect. Availability is an Outlook-style week in the app (click, drag, resize, 15-minute snap). It does not sync an Outlook mailbox. Schedule is the class week, also TutorOS data.

WhatsApp, when the mock channel runs, is for teacher, parent, and admin. Student WhatsApp is off unless the owner enables it. The timeline is written first. A failed send does not roll back the record.

## Sign-in, Section Sub-Tabs, and the shell

Auth is the stub: phone OTP `000000`, an optional magic link for the student or staff, and a JWT. There is no username and password. Every sign-in gate (`LoginGate`, `StudentLoginScreen`, `StaffLoginScreen`, `ParentLinkScreen`) includes the 1-click **Workspace & Demo Persona Picker** (`Demo Persona Quick-Select` and `Workspace` `<select>` dropdowns).

Role doors on `/app/student/router`:

- Student `Aarav Sharma` (`+9101s`) uses **I’m here to learn** and lands on `/app/student`.
- Teacher `Sudhakshina` (`+9101t`) uses **I’m a teacher** and lands on `/app/faculty/teacher-dash`. Exam-prep skips staff sign-in on that door.
- Owner `Vikram Nair` (`+9101o`) uses the direct **Workspace Owner / Admin** door (or **other staff sign-in**) and lands on `/app/admin`.
- Assistant `Rohan Deshmukh` (`+9101a`) uses **other staff sign-in** (or selects the assistant persona in the picker) and lands on the faculty dashboard.
- Parent `Rajesh Sharma` (`+9101p`) uses **I’m a parent**, accepts invite `link-exam-prep` (`Aarav Sharma`), and lands on `/app/parent`.

The signed-in header (faculty, owner, student, and parent) includes a sun or moon theme icon, a bell icon, and **Terms**. Below the header, horizontal **Section Sub-Tabs** (`SectionTabs.tsx`) group multi-screen workflows across `Schedule`, `Students`, `Practice & Assessments`, `Doubts & Comms`, `Records & Reports`, `Owner Console`, `Student Classes/Practice/You`, and `Parent Home/Reports`. The bell reads `GET /api/v1/notifications/inbox` and lists those notices. **Terms** reads `docs/legal/terms-and-conditions.md` through `GET /api/v1/terms`.

`/operator` is a jump list of screens for you. It is not a catalog screen id.

## Terms

The terms text is the markdown file [docs/legal/terms-and-conditions.md](../legal/terms-and-conditions.md). The API route `GET /api/v1/terms` reads that file from disk on every request. Edit the markdown. The next time someone opens **Terms**, they see the file as it is now. You do not restart the process for a text edit. If the file is missing, the API returns 404 and the dialog says the terms file is not on disk.

## Faculty-admin grant

Faculty admin is a row in `faculty_admin_grants`, not a login role. The Sessions screen draws the Faculty admin card only when `GET /api/v1/faculty-admin/me` returns `faculty_admin: true`.

The seed writes that row for the exam-prep Senior Faculty (`Sudhakshina`, `+9101t`), granted by the owner (`Vikram Nair`, `+9101o`). The assistant (`Rohan Deshmukh`, `+9101a`) does not get a row. If the card is missing, the grant row is missing. Check the table, or call `GET /api/v1/faculty-admin/me` with that person’s token. Transferring the grant does not change the workspace owner.

## What the app is doing

Usage guides for the four logins are next to this file: [faculty](faculty.md), [admin](admin.md), [student](student.md), [parent](parent.md). HTML copies are linked from [index.html](index.html).

Parent home (`GET /api/v1/parent/home`) returns, for each linked child (`Aarav Sharma`), attendance, the latest class note, the open fee in Rupees (`₹`), and the latest paid receipt. It also adds `lesson_pack` and `latest_assignment.submitted`. When the payload includes `lesson_pack.balance_minutes`, Home shows that balance in hours. If home has no balance yet, the page also calls `GET /api/v1/students/{id}/lesson-pack`, which returns `balance_minutes` and `purchased_minutes`. The exam-prep pack is 8 hours (480 minutes) only after a seed that includes `seed_internal_v2`. The same balance is on `/app/student/payments` when the API returns it. An assignment line appears only when `latest_assignment.submitted` is present. If the pack, that flag, or the open-hours route is missing, Home hides that card. After a restart on the current API, those cards show. Open hours are `GET /api/v1/parent/open-hours`. A booking is `POST /api/v1/parent/bookings` with `{start}`. Booking does not use the hour. A balance under 60 minutes returns 400 with detail `balance under 60 minutes`, and the page shows that detail.

Attended and no-show use the session length, which is 60 minutes when the session has no end. A student cancel or a reschedule uses that length only inside 24 hours. At or outside 24 hours it stays. A teacher cancel does not use it. The owner can waive a forfeit. A reschedule response includes `hour` of `stays` or `used`. Schedule says **Hour stays** or **Hour is used** before Save time. On the 3-step Attendance & Class Summary screen (`/app/faculty/record`), student marks are Attended, No-show, Student cancel, and Teacher cancel, with live lesson-pack consequence previews before saving. Unmarked stays unmarked. A stored present still reads as Attended, and absent as No-show. Billing (`/app/admin/billing`) accepts Rupee (`₹`) presets or custom `₹` amounts via `<select>` dropdowns and converts them to `amount_cents` for the API. `GET /api/v1/payouts` adds `delivered` and `hours`. `POST /api/v1/owner/enquiries` with `{name, phone, hours}` is owner only and creates a student and a pack. Faculty admin is the card on Sessions for `+9101t` (`Sudhakshina`), not a separate login.

## Not shipped

- More than one branch.
- A quality spot-check of a recording.

## Closed

Not a setup task: a new screen id, a syllabus database, a sixth login role, student WhatsApp on by default, an in-app video platform, or replacing the one-time code with a password.
