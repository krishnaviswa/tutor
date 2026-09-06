# spec.md — 005-dashboard-density

| Field | Value |
|---|---|
| **Status** | Specified |
| **Role** | PM (specify) + Architect (plan) |
| **Feature directory** | `specs/005-dashboard-density` |
| **Action items** | [tasks.md](tasks.md) |

## Why

004 wired all 47 catalog screens onto existing `/api/v1`. The routes work. The **picture of a running academy does not**. Wired dashboards return counts (`upcoming_sessions`, `attempts`, quota `used/cap`). Demo gold already shows named next class, due practice, attendance bars, at-risk students, receipts, and a parent marksheet. Compared with a coaching OS such as iSeekAcademy, the live app feels empty because it is empty — not because a 48th screen is missing.

005 lifts **demo density** onto the **same screen ids** and the **same API paths**. Backend computes named operating facts from the existing ledger. Frontend renders them the way `tutor-platform-demo.html` already does. No new catalog screen. No marketplace. No live Razorpay. Biology / NEET remains an example tenant pack.

Human OK to specify this feature is the 2026-09-06 comparison chat. **Do not `/speckit.implement` until a later human OK on these tasks.**

## User stories

### Student

1. **As** a student, **I want** `student-dash` to show the next session by title and time, due practice with unanswered count, this-week test, latest doubt outcome, and weak tags, **so that** opening the app is a next action, not a hunt through counts.

### Teacher

2. **As** a teacher, **I want** `teacher-dash` to show attendance %, weekday bars, practice completion by set, doubt backlog, and named students to chase with reasons, **so that** morning briefing is cohort health, not three integers.

### Owner

3. **As** an owner, **I want** `owner` to show sessions delivered, active students, practice completion, doubt SLA, revenue booked, and churn risk **plus** the existing quota bars, **so that** the console is an operating scorecard, not only F2 meters.

### Parent

4. **As** a parent, **I want** `parent-home` to show attendance fraction, latest practice, latest test, and fee due with date for my linked child only, **so that** I do not phone the teacher for numbers the ledger already has.

### Payer

5. **As** a student or parent, **I want** `payments` to show due amount + date and receipt history, **so that** pay is a fee desk, not an invoice id list.

### Learner (content)

6. **As** a student, **I want** `library` / `lesson` to show kind, duration, progress, and notes, **so that** content is a library, not title+body rows.

### Faculty (reports)

7. **As** a teacher or parent, **I want** `reports` to show a term slice (attendance, practice, latest test, teacher note), **so that** export is a marksheet, not a JSON dump of ids.

### Operator (repo)

8. **As** an operator, **I want** aggregates computed in a service from existing tables, **so that** routers stay thin, tenants stay isolated, and `live_calls == 0`.
9. **As** an operator, **I want** seed rows rich enough that every density field has a real example after `--reset`, **so that** local try is not empty-state theatre.
10. **As** an operator, **I want** README, catalog `shows`, demo WHY, product-viewer tiles, and work-log to name 005, **so that** the product map does not still say “wired means done.”

## Acceptance criteria

1. **Given** demo gold for `student-dash`, **when** a seeded student opens `/app/student`, **then** they see a named next session (title + start), due practice with unanswered/total, this-week item, doubt outcome if any, and weak tags — not only `N` sessions / `N` attempts.
2. **Given** demo gold for `teacher-dash`, **when** a seeded teacher opens that screen, **then** they see attendance %, weekday series, practice completion by set, doubt backlog, and at least one named chase row with a reason.
3. **Given** demo gold for `owner`, **when** a seeded owner opens the console, **then** they see ledger scorecard fields (sessions, students, practice %, SLA or backlog, revenue, churn risk) **and** existing quota meters.
4. **Given** a linked parent, **when** they open `parent-home`, **then** they see numeric slices for the linked child only (attendance, latest practice, latest test, fee due). Unlinked children stay hidden.
5. **Given** `payments`, **when** invoices exist, **then** the UI shows due amount + date, paid history / receipts, and paid vs pending vs overdue mix from status — mock checkout stays mock.
6. **Given** `library` / `lesson`, **when** content exists, **then** rows show kind, duration or progress, and lesson notes — not title-only.
7. **Given** `reports`, **when** a parent or teacher opens it, **then** they see a term slice from the timeline/attempts, not an empty list or raw id dump.
8. **Given** two workspaces A and B, **when** density APIs run, **then** no row or aggregate from B appears in A. 002 isolation tests still pass.
9. **Given** this feature, **when** anyone lists screens, **then** only existing `catalog/screens.json` ids appear. No 48th screen. No public academy homepage. No certificates. No find-a-tutor marketplace.
10. **Given** dashboard JSON, **when** it is produced, **then** it is computed in `services/` from existing tables (`scheduled_sessions`, `attendance`, `attempts`, `doubts`, `invoices`, `content_items`, `timeline_events`, `backlog_items`). Routers stay thin. No new syllabus tables.
11. **Given** `python -m app.seed_cli --reset`, **when** a human logs in as exam-prep student/teacher/owner/parent, **then** every density field above has a non-empty example. Attendance for “present today” still comes from join/enter, not a fake pre-write of live class attendance.
12. **Given** pytest, **when** 005 lands, **then** 002 + 003 suites stay green and `live_calls == 0`. New tests cover student/teacher/owner/parent density payloads.
13. **Given** Accept, **when** 005 closes, **then** the same change updates `catalog/screens.json` `shows`, `README.md` §11–§12, `product-viewer.html` tiles, and `work-log.html`.

## Out of scope

- New catalog screen ids (public academy homepage, certificates, leads CRM).
- Live Razorpay / WhatsApp / Meet / AI vendors.
- Student-finds-tutor marketplace.
- Inventing STT captions.
- Rewriting 002 spine or 003 path list.
- Biology-only copy as product requirements (seed may use tenant topic names).

## Dependencies

- 002 Accepted (protected). 003 Accepted (APIs). 004 Accepted (wired chrome).
- Catalog seed pack on `cursor/004-seed-catalog-pack` (lists on every screen) — 005 **extends** those rows with named facts, it does not replace identity seed.

## Definition of done

- [tasks.md](tasks.md) T7.1–T7.12 complete.
- AC 1–13 evidenced in `test-report.md`.
- Demo HTML remains gold; Next.js matches it on the density screens.
- Product map (README, hub, work-log) says 005 Accepted.
