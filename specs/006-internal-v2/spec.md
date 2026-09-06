# spec.md — 006-internal-v2

| Field | Value |
|---|---|
| **Status** | Accepted |
| **Role** | PM (specify) + Architect (plan) |
| **Feature directory** | `specs/006-internal-v2` |
| **Action items** | [tasks.md](tasks.md) |

## Why

005 Accepted the picture of a running academy (named dashboard facts). Vendor ports stay **mock**. Blueprint module ladders still have in-app v2 that does not need Google, MSG91, SES, Razorpay, Stripe, FCM, Meta, or S3.

006 ships that depth on the **same 47 screen ids** and **same `/api/v1` paths** (additive JSON). Timeline remains the ledger. Notify still writes mock deliveries. `create_app` still refuses non-mock providers.

Human OK to implement is the 2026-09-06 plan chat (separate vendor ports; rest in-app). T8.1–T8.11 implemented; T8.12 Accept 2026-09-06.

## User stories

### Identity (phase A)

1. **As** an owner, **I want** per-module permission toggles on staff (fixed roles), **so that** an assistant cannot open owner billing.
2. **As** a family, **I want** more than one guardian on a student, with fee visibility per link, **so that** a second adult can see the child without always seeing invoices.
3. **As** an owner, **I want** invite links and a waitlist on a cohort, **so that** intake is not only CSV paste.
4. **As** a student, **I want** the workspace to offer OTP and magic link together, **so that** either stub still signs me in (mock SMS/email).

### Classroom (phase B)

5. **As** a student, **I want** to book a slot inside teacher availability with conflict detection, **so that** the calendar does not double-book a teacher.
6. **As** a teacher and student, **I want** in-app live chat and MCQ polls on the live screens, **so that** engagement is on the platform, not Meet events.
7. **As** a teacher, **I want** chat/poll/board-photo capture on the session record (local storage path), **so that** the record is more than notes.
8. **As** a teacher, **I want** playlists, drip release, and view tracking on library items, **so that** content is sequenced without S3.
9. **As** a teacher, **I want** assignment rubrics, resubmission, and late tracking, **so that** homework is not a single grade stamp.

### Practice (phase C)

10. **As** a teacher, **I want** difficulty lanes, usage stats, and dedupe hints on the question bank.
11. **As** a teacher, **I want** auto-assemble of a practice set by tag/difficulty, with time-on-question on attempts.
12. **As** a student, **I want** test sections, negative marking, a palette, and resume.
13. **As** a teacher, **I want** partial credit and a rubric grading queue.
14. **As** a teacher, **I want** analysis rows that cannot close without a forced action, with cohort vs student view.
15. **As** a student, **I want** a rule-based next item from weak tags, **so that** adaptive practice needs no LLM.

### Record (phase D)

16. **As** a student and teacher, **I want** queue position, SLA timer, canned answers, and a clip flag on doubts.
17. **As** a teacher, **I want** message attachments, read state, and templates.
18. **As** an owner, **I want** scheduled announcements and a stored channel matrix; send stays mock.
19. **As** a teacher, **I want** timeline filters, export, and dispute annotations.
20. **As** anyone, **I want** per-event notification prefs; SMS/WhatsApp rows still mock-backed.

### Ops (phase F/G)

21. **As** an owner, **I want** auto-invoice from a plan with proration and reminder rows (delivery mock).
22. **As** an owner, **I want** coupons / trials on plans, and payout statements without Stripe.
23. **As** an owner, **I want** G1 preview / staged module flags and G4 automation that actually writes backlog from misses.
24. **As** an operator, **I want** remaining useful spine screens on the five focused demo tracks (same ids; exam-prep still omits `staff-login`).

## Acceptance criteria

1. Given a seeded assistant with restricted modules, when they call an off-module `/api/v1` path, then they get **404** (G1 hide), not a live vendor error.
2. Given two accepted parent links on one student, when each parent opens `parent-home`, then both see the child; only the link with `fee_visible` sees `fee_due`.
3. Given a cohort invite token and waitlist, when an owner lists cohorts, then JSON includes `invite_token` and `waitlist`.
4. Given workspace `auth_methods` including otp and magic, when `/auth/me` runs, then both methods are listed; OTP `000000` and mock magic still work.
5. Given overlapping `starts_at` for the same teacher, when a second session is posted, then the API returns **409**. Student booking only succeeds inside stored availability windows.
6. Given `POST /sessions/{id}/engagement` with `kind=chat` or `mcq`, when live is fetched, then the event is in `engagement` (not a Meet payload).
7. Given a content item with playlist/drip/view fields, when library/lesson load, then those fields appear; storage stays `local`.
8. Given an assignment with rubric and due_at, when a submission is after due, then `late` is true; resubmit is allowed when flagged.
9. Given questions with difficulty/tags, when practice-sets are created with `auto_assemble`, then the set is filled from matching questions.
10. Given a test with sections and `negative_mark`, when submitted, then score can go below raw correct count; resume returns last answers.
11. Given analysis, when a row is patched without `action`, then it stays open; with action it closes.
12. Given open doubts, when queue is listed, then each row has `queue_position` and `sla_hours`.
13. Given threads, when a message is posted with `attachment` or `template_id`, then list shows `unread` / `read`.
14. Given an announcement with `scheduled_at` and `channels`, when listed, then those fields persist; Notify still mock.
15. Given timeline `event_type` filter or `export=1`, when a teacher reads a student timeline, then the slice matches.
16. Given a plan and coupon, when invoices are auto-issued, then amount is prorated and a reminder delivery row exists with mock channel.
17. Given two missed practices and an enabled miss-rule, when automation runs, then a backlog item exists.
18. Given pytest, when 006 lands, then 002–005 stay green and `live_calls == 0`. Factory still raises if a provider is not mock/local.
19. Given catalog screens, when anyone lists ids, then only the existing 47 appear.
20. Given Accept, when 006 closes, then README §11–§12, hub, and work-log name 006.

## Out of scope

- Live Meet / Teams attendance, MSG91, SES/Postmark, S3/R2, Razorpay, Stripe, FCM, Meta WhatsApp (outbound or inbound).
- SSO, custom roles, STT, LLM, marketplace, certificates, public academy homepage, 48th screen.
- Lifting `RuntimeError` in `create_app` for live providers.
- Rewriting 002 spine.

## Definition of done

- [x] [tasks.md](tasks.md) T8.1–T8.12 complete.
- [x] AC evidenced in `test-report.md`.
- [x] Ports remain mock.
