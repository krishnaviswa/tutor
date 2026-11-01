# Fix log — content track

Date: 2026-11-01. No commit. No git config change. No Playwright suite (`npx playwright test` / `npm run e2e` were not run).

Browser MCP did not reconnect, so the signed-in pages were not clicked. The running API on `http://127.0.0.1:8000` was checked after uvicorn reloaded. Frontend copy was checked in source. `ReadLints` on the edited screens reported no issues.

## D-009 — fixed

Profile chips are no longer exam-board labels.

- Files: `frontend/components/wired/ProfileScreen.tsx`
- Expertise chips: One-to-one, Small group, Concept teaching, Guided practice, Revision, Mentoring.
- Subject chips: Language, Numeracy, Performance, Making, Movement, General studies.
- Student board options: School, College, Independent study, Workplace training.
- Phone, address, and a Custom expertise/subject line are unchanged.
- What the UI proves: `/app/faculty/profile` has no button named NEET UG, JEE Advanced, or Biology, and no CBSE option in the preset lists.
- Tests: no API change. Browser click was not available.
- Left alone: `FacultyAdminPanel.tsx` (Sessions faculty-admin card) still has NEET UG / JEE Advanced chips. That card is not the profile page.

## D-010 — fixed

The seeded live class roll uses the cohort when no class list was saved.

- Files: `backend/app/services/sessions.py`, `backend/app/api/v1/sessions.py`, `backend/app/services/record.py`, `backend/app/services/faculty_admin.py`, `backend/tests/test_roster_topics_record.py`
- A saved list, including an empty one, stays the roll. `class_student_ids` left unset (the seed) uses that cohort’s active enrollments. A newly created cohort session stores `[]`, so it still starts empty.
- What the UI proves: the record screen reads `session.student_ids`. On the running API the first session is “Vectors & Relative Motion — Live Class” with Aarav Sharma and Diya Patel (both already in the seed). Mark All Attended renders when that list is non-empty, and Save still shows “Saved”.
- Tests: `python -m pytest tests/test_roster_topics_record.py tests/test_session_class_roster.py tests/test_004_gaps.py::test_record_skips_foreign_student_attendance tests/test_010_faculty_admin_library.py::test_unmarked_attendance_is_not_stored_as_present -q` — 8 passed.
- Live API: `GET /api/v1/sessions/{first}/record` returned those two names. Browser click of Mark All / Save was not available.

## D-011 — fixed

Joined is the person record’s `created_at`, not a hard-coded em dash.

- Files: `backend/app/api/v1/students.py` (`joined_at`), `frontend/components/wired/RosterScreen.tsx`
- What the UI proves: Aarav Sharma’s Joined cell formats that timestamp (live value `2026-10-31T18:55:43.526982+00:00`, shown as a date in Asia/Kolkata). A student with no timestamp shows “Not recorded”. A newly saved student returns `joined_at` on create and on the next list.
- Tests: covered by `test_roster_joined_at_is_a_timestamp` in the pytest command above (passed). Browser click was not available.
- Status on the roster row is still the existing “active” pill. The proof for this id is the Joined cell.

## D-012 — fixed

The occupied default slot uses the sentence already in the schedule screen.

- Files: `frontend/components/wired/ScheduleScreen.tsx` (`explainSessionError`)
- `409` / `teacher conflict` is mapped before the raw `detail` is shown. Other details still pass through. “outside availability” still becomes “That time is outside the teacher's availability.”
- What the UI proves: submitting the occupied slot shows “That slot conflicts with another class.” and does not show the raw detail. A free slot is unchanged (the existing 07:15 create path).
- Tests: no e2e suite. Live API `POST /api/v1/sessions` at the first seeded start returned `409 {"detail":"teacher conflict"}` and did not create a row. Browser click was not available. No expected-string change in the e2e suite.

## D-014 — fixed

`GET /api/v1/topics` lists workspace taxonomy rows. No syllabus table.

- Files: `backend/app/api/v1/topics.py`, `backend/app/factory.py`, `catalog/apis.json`, `catalog/screens.json` (schedule apis/entities), `catalog/embed.js`, `scripts/build_catalog.py`, `README.md` (one line under the domain model)
- Response fields: `id`, `name`, `taxonomy_id`.
- What the UI proves: opening “+ New session” calls a route that exists. Schedule still treats a failed topics call as an empty preset list.
- Tests: `test_topics_route_lists_workspace_topics` in the pytest command above (passed). Unauthenticated call is 401. Live teacher call was 200 and included “Unit 1: Kinematics & Vectors”.
- The live workspace also has other topic names already stored (including Biology and CBSE). Those are existing taxonomy rows, not new presets.

## D-015 — fixed

An empty thread list stays empty.

- Files: `frontend/components/wired/MessagesScreen.tsx`
- Removed the two sample threads and the “Example thread…” line. Empty list copy is “No messages yet.” / “No conversations yet.”
- What the UI proves: an empty `/api/v1/threads` response does not show “Could we revisit the last example before Thursday?” or “I sent the notes from today’s session.”
- Tests: no API change. Live exam-prep has 2 real threads, and neither last body is those sentences, so the empty branch was not on screen. Browser click was not available. No e2e assertion was weakened.

## D-018 — fixed

Catalog status matches the wired routes. No new screen id.

- Generator: `scripts/build_catalog.py` `wiring_status()` reads each route’s `page.tsx`. A page that imports `components/wired/` and does not use `ScreenShell` is `wired`. `python scripts/build_catalog.py --status-only` writes `catalog/screens.json` and refreshes screen status in `catalog/embed.js` without rebuilding the rest of the catalog from the demo.
- Result: 50 wired, 0 shell. Every catalog route renders a wired screen component.
- Also updated: `README.md` §3, `product-book/product-viewer.html` lede (catalog status is wired on all 50), `product-book/work-log.html` (2026-11-01, task D-018).
- Architecture pills read `catalog/embed.js` (`product-book/tutor-platform-architecture.html` script `../catalog/embed.js`). Status in that file is `wired`. The HTML file has no hard-coded `shell` status to edit.
- `scripts/check_architecture_parity.py` failed on the five `tutor-platform-role-*.html` files being out of sync with the demo. Those files were not edited here. They were already out of sync with the demo renderer. Not regenerated.

## Commands

- `python scripts/build_catalog.py --status-only` — 50 wired, 0 shell
- `python -m pytest tests/test_roster_topics_record.py tests/test_session_class_roster.py tests/test_004_gaps.py::test_record_skips_foreign_student_attendance tests/test_010_faculty_admin_library.py::test_unmarked_attendance_is_not_stored_as_present -q` — 8 passed
- Live API on port 8000 (teacher OTP, exam-prep): topics 200, roster `joined_at` present, Vectors record names Aarav Sharma and Diya Patel, conflict POST 409 `teacher conflict` (not created), threads 200 with 2 real threads
- `python scripts/check_architecture_parity.py` — fail, role HTML only (see D-018)
- Not run: `npx playwright test`, `npm run e2e`

## Left failing

- No pytest failure in the command above.
- Architecture parity: role HTML children out of sync with the demo. Pre-existing relative to this track. Not fixed.
- Browser click of profile, roster, class record, schedule conflict, and empty chat was not done. The browser tool did not reconnect.
