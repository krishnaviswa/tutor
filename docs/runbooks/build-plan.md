# Build plan — 2026-10-31

Decision record for the TutorComp-like pass and UX humanization pass. This is not a Spec Kit spec and not a new screen list.

## This pass

Shipped. The role runbooks describe the product as it runs.

1. Role runbooks, in HTML and Markdown, for faculty (teacher `Dr. Meera Krishnan` `+9101t`, assistant `Rohan Deshmukh` `+9101a`, and the faculty-admin grant), workspace admin (owner `Vikram Nair` `+9101o`), student (`Aarav Sharma` `+9101s`), parent (`Rajesh Sharma` `+9101p`), and tech admin.
2. Humanized demo personas, cohorts, sessions, and practice content across all three seeded tenants (`exam-prep` Apex Science Academy, `language-1on1` Polyglot Language Studio, `music` Swar Sangam Music Academy), plus the 1-click **Workspace & Demo Persona Picker** (`Demo Persona Quick-Select` and `Workspace` dropdowns) on sign-in and the direct **Workspace Owner / Admin** door on `/app/student/router`.
3. Horizontal **Section Sub-Tabs** (`SectionTabs.tsx`) across multi-screen workflows: `Schedule`, `Students`, `Practice & Assessments` (numbered 1–6), `Doubts & Comms`, `Records & Reports`, `Owner Console`, `Student Classes/Practice/You`, and `Parent Home/Reports`.
4. Structured `<select>` dropdowns, collapsible `+ New` / `+ Add` creation forms (progressive disclosure), Rupee (`₹`) billing inputs and currency formatting, and the **3-step Attendance & Class Summary flow** (`/app/faculty/record`) with live lesson-pack consequence previews before saving.
5. Parent home keeps attendance (`present / total`), the last class note, and the fee that is due plus the latest paid receipt. It also shows the lesson-pack balance when `GET /api/v1/parent/home` includes `lesson_pack.balance_minutes`. If that balance is missing, the page asks `GET /api/v1/students/{id}/lesson-pack`, which returns `balance_minutes` and `purchased_minutes`. Hours are a count of hours, for example 8 hours or 7 hours 30 minutes. The exam-prep demo pack is 8 hours (480 minutes) only after a seed that includes `seed_internal_v2` lesson packs. `seed_all` skips a workspace that already exists. The existing payments screen shows the same balance when the API returns it. If the balance is missing, the pack card stays hidden. No new route.
6. Parent home shows whether the latest assignment was turned in only when the payload includes `latest_assignment.submitted`. If that flag is absent, the page shows nothing.
7. A parent books an open hour from home. `GET /api/v1/parent/open-hours` lists 60-minute starts in the next 7 days inside the teacher’s published week. The parent posts `{start}` to `/api/v1/parent/bookings`. Booking does not use the hour. If the balance is under 60 minutes, the post returns 400 and the page shows that detail (`balance under 60 minutes`). If the open-hours route is missing, the card stays hidden. After a restart on the current API, the card shows.
8. Burn rule. Attended and no-show use the session length, which is 60 minutes when the session has no end. A student cancel or a reschedule uses that length only inside 24 hours. At or outside 24 hours it stays. A teacher cancel does not use it. The owner can waive a forfeit. A reschedule response includes `hour` of `stays` or `used`. Before Save time, Schedule says **Hour stays** or **Hour is used**. For the owner the line is **Hour stays because the owner can waive it.**
9. On the 3-step session record (`/app/faculty/record`), each student is Attended, No-show, Student cancel, or Teacher cancel, with live lesson-pack consequence previews. Unmarked stays unmarked. A stored present still reads as Attended, and absent as No-show.
10. `GET /api/v1/payouts` adds `delivered` and `hours`.
11. `POST /api/v1/owner/enquiries` with `{name, phone, hours}` is owner only. It creates a student and a pack. The owner console form is that call.
12. Sign-in phones stay owner `+9101o` (`Vikram Nair`), teacher `+9101t` (`Dr. Meera Krishnan`), assistant `+9101a` (`Rohan Deshmukh`), student `+9101s` (`Aarav Sharma`), parent `+9101p` (`Rajesh Sharma`). The one-time code is `000000`.
13. The faculty-admin card is on Sessions for the teacher who holds the grant (`Dr. Meera Krishnan`, `+9101t`). It is not a separate login.

No new catalog screen id.

## Not shipped

- Multi-branch.
- A quality spot-check of a recording.

## Closed

Do not build these.

- A new catalog screen id.
- A syllabus or exam database.
- A sixth login role.
- Student WhatsApp on by default.
- An in-app video platform.
- Replacing OTP with username and password.

Biology / NEET is an example tenant only, not the product domain.
