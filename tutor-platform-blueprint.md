# TutorOS — platform blueprint

> **`TutorOS` is a working placeholder.** Find-and-replace it when you pick a real name.
> This file is the written half of the pivot; the interactive half is
> [tutor-platform-explorer.html](tutor-platform-explorer.html) — open it in a browser, tick the
> modules you want, and read the screens, build concepts, evolution ladders, price tier and build
> order it produces.

Companion to the single-tenant work: [tutor-loop-ui-kit.html](tutor-loop-ui-kit.html) (16 screens for
one solo NEET Biology faculty) and [tutor-operating-loop.md](tutor-operating-loop.md). Those stay as
the **worked example**. This document generalises them into a product many tutors rent.

---

## 1. The shift

| | Single-tenant (what you built) | Multi-tenant (this blueprint) |
|---|---|---|
| **Who runs it** | You, one Biology faculty | Any tutor or tuition program, any subject, any country |
| **Opinion** | Hard refuse-list baked in | Neutral platform — every module is a toggle |
| **The loop** | The product | *One* template among several |
| **Auth** | 2 roles, 1 owner seat | Owner + staff + students + parents, many seats |
| **Deployment** | One app | Isolated workspace per tenant |
| **Revenue** | Your student fees | A minimal monthly subscription from each tenant, metered |

**The thesis that makes this a product:** strip away subject and pedagogy and almost every tutoring
business runs the same seven jobs — *let people in, schedule and deliver a session, give practice,
answer doubts, keep a record, show progress, take money*. The loop is one arrangement of those jobs.
A language tutor, a K-12 homework centre, a music teacher, a bootcamp — different arrangement, same
jobs.

**The wedge — "see your own operation."** A tutor does not switch platforms to get new features; they
switch to stop losing track. Before TutorOS changes how anyone teaches, it answers: *who showed up,
who is behind, which doubts are unanswered past a day, who hasn't paid, which topic wrecked the last
test.* Sell the visibility first; the workflow follows.

---

## 2. Product model

### 2.1 Multi-tenancy

- **One workspace per tenant.** `acme.tutoros.app` (subdomain, Starter) → `learn.acmebio.com` (custom
  domain, Institute) → full white-label (no TutorOS branding, add-on).
- **Students are siloed to a workspace.** A student of two tutors has two accounts. No cross-tenant
  identity, no marketplace, no shared directory — that is a different (harder, riskier) product.
- **Nothing is shared between tenants** except the codebase and the platform's own billing meter.

### 2.2 Roles

| Role | Has | Typical scope |
|---|---|---|
| **Owner / Admin** | Everything: config, billing, staff, data export | The tutor who signs up, or the institute director |
| **Teacher** | Their sessions, content, practice, doubts, their cohorts' analytics | A faculty member |
| **Assistant / TA** *(optional module)* | Doubt triage, attendance, grading — no config, no billing | Present only in team workspaces |
| **Student** | Their sessions, practice, doubts, timeline, dashboard | The learner |
| **Parent / Guardian** *(optional module)* | Read-mostly view of a linked student: attendance, reports, fees | K-12 and school-age contexts |

### 2.3 "Fully configurable" — what it means and what it costs

Every module in §4 is on/off per workspace. There is **no refuse-list in the product** — if a tenant
wants a timetable-style attendance register or a parent portal, they switch it on.

Your original refuse-list does not disappear; it moves. It becomes:

1. **Template defaults** — the "Exam-prep loop" template ships with the backlog-chases-skipped-work
   arrangement and *without* a homework-policing lecture flow. Opinion lives in the preset, not the
   engine.
2. **Automation rules you can choose** (§5.3) — e.g. *"block publishing a live session that has no
   same-day practice artefact"* is a rule a tenant opts into, not a law.

**The tax of neutrality — call it out now:**

- **Support surface explodes.** Every toggle combination is a possible bug report and a possible "how
  do I…" ticket. Mitigation: ship templates, not a blank slate.
- **Onboarding paralysis.** A blank workspace with 35 switches converts badly. Mitigation: the first
  screen after signup is *"pick what kind of tutoring you do"*, which sets ~15 toggles.
- **Analytics get shallow.** Cross-tenant benchmarking ("your doubt SLA vs similar tutors") needs
  comparable data; total configurability fights that. Accept it for v1.

### 2.4 Templates / presets

A template is a named set of toggles + default automation rules + starter taxonomy. Shipped set:

| Template | Shape | Turns on (indicative) |
|---|---|---|
| **Exam-prep loop** | Cohort, high-frequency, practice-heavy | Enrollment, cohorts, scheduling, session record, content library, question bank, practice sets, tests, analysis, doubts queue, mentor/backlog, all dashboards |
| **1-on-1 subject tutor** | Language, maths, science; individual | Scheduling, session record, assignments, message threads, timeline, student dashboard, billing |
| **K-12 homework help** | After-school, parent-facing | Parent accounts, scheduling, session record, assignments, doubts queue, message threads, teacher dashboard, reports |
| **Skills / cohort course** | Bootcamp, hobby, professional | Cohorts, session record, content library, assignments, tests, announcements, billing |
| **Music / arts** | Recital-oriented, guardian-facing | Scheduling, session record, parent accounts, message threads, reports, billing, payments |
| **Everything** | Institute exploring the full surface | All modules on |

Templates are a starting point — the tenant edits from there.

---

## 3. The universal record model (the spine)

This is the part you singled out. Three linked ideas.

### 3.1 Student timeline — the record log

Every student has **one timeline**. Everything that happens to them lands on it as an event:

```
Sep 03  Session attended   "Cell Cycle"       joined 18:02, left 19:14 (72 min)
Sep 03  Practice completed  DPP · Cell Cycle   8/12 · 2 misconception tags
Sep 03  Doubt asked         "why does S-phase…" → answered Sep 04 09:11
Sep 05  Test                Genetics mock      31/45 · median 33
Sep 05  Report sent         to guardian
Sep 06  Payment             ₹2,000 · Sep fee
```

The timeline is the answer to "show me this student." It is also the audit trail for disputes
("you never told me she missed four classes"). It is generated, not typed — modules write to it.

### 3.2 Session event transcript

Every session produces a structured record. **This is an event log, not a speech-to-text
transcript** — set that expectation with tenants explicitly.

| Captured | Source | Needs |
|---|---|---|
| Scheduled time, topic, cohort | Scheduling module | — |
| Video link | Generated (§3.3) | Google connection |
| Join / leave per participant → attendance | Join page / Meet events | Students join *through* the platform |
| In-session chat | Live console, if used | In-session engagement module |
| Polls / quick-checks fired + response spread | In-session engagement module | — |
| Doubts raised during class | Doubts module | — |
| Teacher post-class notes, board photos, recording URL | Manual, after class | Storage |

The bundle attaches to the **session** and fans out a summary event to **each attendee's timeline**.

> **Speech-to-text is deliberately out of scope for now.** It is a real cost and accuracy commitment
> (≈ $0.02–0.04 per audio-minute, plus review). Leave a clean seam: the session record has a
> `transcript_segments` slot that a future STT job fills. Tenants who want it today paste their own
> Google Meet / Zoom transcript.

### 3.3 Video link model

| Mode | How | Marginal cost | Recording owner |
|---|---|---|---|
| **Generated (default)** | Platform creates a Google Meet link via the tenant's connected Google account (Calendar API `conferenceData`) | $0 | Tenant's Google Drive |
| **Bring-your-own** | Tenant pastes any Zoom / Teams / Jitsi link | $0 | Tenant |
| **Hosted rooms** *(add-on, later)* | Platform-run rooms (LiveKit / Daily / 100ms) — needed only for tenants with no Google and who want in-app video | ≈ $0.004 / participant-minute | Platform storage |

Default path is Generated: it is free, the tenant already trusts Google, and attendance/events come
back through the Google account. BYO is the fallback and keeps event transcript limited to what the
tenant marks plus platform-side join tracking.

---

## 4. Module catalog

Seven domains, ~35 modules. Each carries: **what it is · screens · v1→v2→v3 evolution · depends on ·
data entities · integrations · build effort (1–5) · risk · default tier**. The explorer renders all
of this interactively; this table is the reference.

### A. Identity & Access

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| A1 | Workspace & branding | — | 2 | Starter |
| A2 | Student accounts (OTP / email / magic link) | A1 | 3 | Starter |
| A3 | Staff accounts & roles | A1 | 3 | Starter |
| A4 | Parent / guardian accounts | A2 | 2 | Cohort |
| A5 | Enrollment & cohorts | A2, A3 | 3 | Starter |

- **A1 Workspace & branding.** Tenant setup: name, subdomain, timezone, logo, colours.
  *Screens:* Workspace setup wizard · Branding & domain settings.
  *v1* logo + subdomain + timezone → *v2* custom domain + branded email sender → *v3* full
  white-label, per-workspace theme tokens, favicon, login-page control.
  *Entities:* Workspace, Domain, BrandTheme. *Integrations:* DNS, email (Postmark/SES).
- **A2 Student accounts.** Phone-OTP by default (the exam-prep norm), email + magic-link as options.
  One identity threads the whole timeline.
  *Screens:* Role router · Student sign-in.
  *v1* one method per workspace → *v2* multi-method + account recovery → *v3* SSO for institutes,
  household accounts.
  *Entities:* User, Identity, Session(token). *Integrations:* SMS (Twilio/MSG91), email.
- **A3 Staff accounts & roles.** Owner / Teacher / (Assistant). Permission matrix.
  *Screens:* Staff sign-in · Staff & roles settings.
  *v1* fixed roles → *v2* per-module permission toggles → *v3* custom roles, granular scopes.
- **A4 Parent / guardian accounts.** Linked to one or more students; read-mostly.
  *Screens:* Parent link · Parent home.
  *v1* one guardian per student, attendance + reports → *v2* multiple guardians, fee visibility →
  *v3* guardian messaging, consent management.
- **A5 Enrollment & cohorts.** Batches, groups, 1-on-1 pairings; join/leave dates.
  *Screens:* Roster · Cohort builder.
  *v1* manual add, CSV import → *v2* invite links, waitlists → *v3* self-serve enrollment with
  approval, cohort templates.

### B. Teaching & Sessions

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| B1 | Scheduling & calendar | A5 | 3 | Starter |
| B2 | Live session + video link | B1 | 4 | Starter |
| B3 | Session record & event transcript | B2 | 4 | Starter |
| B4 | In-session engagement | B2 | 3 | Cohort |
| B5 | Content library | A1 | 3 | Starter |
| B6 | Assignments & homework | A5 | 3 | Starter |

- **B1 Scheduling & calendar.** Recurring sessions, timezones, per-cohort or 1-on-1, reschedule.
  *Screens:* Schedule / calendar · Session detail (pre-class).
  *v1* manual calendar, recurrence → *v2* student-booked slots, availability windows, conflict
  detection → *v3* two-way Google/Outlook sync, booking pages, buffers.
  *Integrations:* Google Calendar, Outlook.
- **B2 Live session + video link.** Generates the Meet link (§3.3), a join page / waiting room, and a
  teacher console shell.
  *Screens:* Join page · Live session console (teacher) · Live session view (student).
  *v1* generated Meet link + join page → *v2* attendance from Meet events, in-app chat → *v3* hosted
  rooms add-on, screen-record capture, co-host handoff.
  *Integrations:* Google Meet/Calendar; later LiveKit/Daily/100ms.
- **B3 Session record & event transcript.** §3.2. The bundle + timeline fan-out.
  *Screens:* Session record & event transcript.
  *v1* attendance + notes + link → *v2* chat/poll/doubt capture, board-photo upload → *v3* STT
  segments, searchable across sessions, auto-summary.
  *Entities:* Session, Attendance, TranscriptEvent, SessionNote.
- **B4 In-session engagement.** Polls, quick MCQ checks, board steps — fired live.
  *Screens:* (embedded in Live console/view).
  *v1* single poll, live tally → *v2* MCQ bank pull, per-student response log → *v3* auto-check every
  N minutes with a nudge, confusion signals.
- **B5 Content library.** Lessons, videos, PDFs/PPT, playlists, modules; per-cohort visibility.
  *Screens:* Content library · Lesson / module viewer.
  *v1* upload + folders + links → *v2* playlists, drip/scheduled release, view tracking → *v3*
  versioning, per-cohort variants, embedded checks.
  *Integrations:* Object storage (S3/R2), YouTube.
- **B6 Assignments & homework.** Issue, submit (file/text), grade, return.
  *Screens:* Assignment issue · Assignment submit & grade.
  *v1* issue + due date + file submit → *v2* rubrics, resubmission, late tracking → *v3* peer review,
  plagiarism check hook.

### C. Practice & Assessment

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| C1 | Question bank | A1 | 3 | Cohort |
| C2 | Practice sets / daily practice | C1 | 3 | Cohort |
| C3 | Tests & mocks | C1 | 4 | Cohort |
| C4 | Auto-grading & scoring | C2 *or* C3 | 3 | Cohort |
| C5 | Analysis & remediation | C4 | 4 | Cohort |
| C6 | Adaptive practice | C5 | 5 | Institute |

- **C1 Question bank.** Items (MCQ, numeric, short, multi-select), tags, difficulty, media, solutions.
  *Screens:* Question bank.
  *v1* CRUD + tags + import → *v2* difficulty lanes, usage stats, dedupe → *v3* shared/community
  banks, auto-tagging.
- **C2 Practice sets / daily practice.** Same-day practice artefact; auto-assembled from tags or
  hand-picked; a deadline.
  *Screens:* Practice set builder · Practice player.
  *v1* manual set + deadline → *v2* auto-assemble by tag/difficulty, time-on-question logging → *v3*
  per-student generated sets from weak tags.
- **C3 Tests & mocks.** Timed, scheduled, sectioned; windows; instructions.
  *Screens:* Test / mock setup · Test runner.
  *v1* fixed paper, timer, schedule → *v2* sections, negative marking, palette, resume → *v3*
  proctoring hooks, question randomisation, series/calendar.
- **C4 Auto-grading & scoring.** Objective auto-grade; manual grade for subjective; score model.
  *v1* MCQ/numeric auto, manual override → *v2* partial credit, rubric grading queue → *v3* short-text
  auto-grade, confidence flags.
- **C5 Analysis & remediation.** Most-missed items; each miss tagged (time-sink vs misconception);
  every tag carries a required action. **A row cannot close with only a percentage.**
  *Screens:* Analysis → remediation board.
  *v1* most-missed + tags → *v2* forced-action rule, cohort vs student view, links to clips/notes →
  *v3* trend across topics, predicted weak areas.
- **C6 Adaptive practice.** Attempt history → next item.
  *v1* rule-based next (weak-tag bias) → *v2* difficulty targeting to a success band → *v3* item-
  response-theory model. High effort; needs attempt volume first.

### D. Doubts & Communication

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| D1 | Doubts / questions queue | A2 | 3 | Starter |
| D2 | Message threads | A2, A3 | 3 | Starter |
| D3 | Announcements / broadcasts | A5 | 2 | Starter |
| D4 | Student timeline / record log | A2 | 4 | Starter |
| D5 | Notifications | A2 | 3 | Starter |

- **D1 Doubts / questions queue.** Photo or text in, topic tag, honest queue position, SLA target
  (not a fake instant promise).
  *Screens:* Doubts queue (student) · Doubts triage (teacher).
  *v1* submit + tag + status → *v2* queue position, SLA timer, canned answers, attach a clip → *v3*
  routing by topic to the right teacher, similar-doubt suggestions.
- **D2 Message threads.** Teacher ↔ student, teacher ↔ parent. In-platform so it is on the record.
  *Screens:* Message threads.
  *v1* 1:1 threads → *v2* attachments, read state, templates → *v3* group threads, moderation, quiet
  hours.
- **D3 Announcements / broadcasts.** One-to-cohort; pinned; scheduled.
  *v1* post to cohort → *v2* schedule + channels (push/email) → *v3* segments, acknowledgements.
- **D4 Student timeline / record log.** §3.1. The unified per-student event stream. Other modules
  write to it; this module owns the read model and the student/staff/parent views of it.
  *Screens:* Student timeline / record log.
  *v1* append-only event list → *v2* filters, export, dispute annotations → *v3* cross-student search,
  retention policy enforcement.
- **D5 Notifications.** Push, email, and SMS/WhatsApp as **overflow, never the record**.
  *v1* email + web push → *v2* SMS/WhatsApp, per-event preferences → *v3* digest logic, delivery
  analytics, quiet hours.
  *Integrations:* Push (web/FCM), email, SMS/WhatsApp (MSG91/Gupshup/Twilio).

### E. Progress & Analytics

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| E1 | Student dashboard | D4 *or* B3 | 3 | Starter |
| E2 | Teacher dashboard | E1 primitives | 3 | Cohort |
| E3 | Owner console | E2 | 4 | Cohort |
| E4 | Reports & exports | E1 primitives | 3 | Cohort |
| E5 | Mentor / backlog workflow | C5, A5 | 3 | Institute |

- **E1 Student dashboard.** Their own view: next session, open practice with a deadline, this week's
  test, doubts status, streak/completion.
  *Screens:* Student dashboard.
  *v1* today + this week → *v2* trends, weak-tag summary → *v3* goals, projected readiness.
- **E2 Teacher dashboard.** Cohort health: attendance, practice completion, doubt backlog, who is
  behind.
  *Screens:* Teacher dashboard.
  *v1* per-cohort completion + attendance → *v2* per-student drill-down, at-risk list → *v3* cohort
  comparisons, intervention tracking.
- **E3 Owner console.** Operation-wide: sessions delivered vs planned, practice completion, doubt SLA,
  revenue, churn signals.
  *Screens:* Owner console.
  *v1* the operating scorecard → *v2* staff performance, cohort P&L → *v3* forecasting, cohort
  cohabitation of financial + learning metrics.
- **E4 Reports & exports.** Parent/term reports (PDF), CSV exports, scheduled sends.
  *Screens:* Reports & exports.
  *v1* per-student PDF, CSV export → *v2* templates, scheduled guardian sends → *v3* branded report
  designer, bulk generation.
- **E5 Mentor / backlog workflow.** Booked short slots on *skipped* work — not re-teaching. Appears
  only where a paid cohort exists.
  *Screens:* Mentor / backlog workflow.
  *v1* flag skipped items + book a slot → *v2* agenda auto-built from misses, commitment tracking →
  *v3* mentor assignment, outcome loop back to analysis.

### F. Business & Operations

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| F1 | Student billing & plans | A5 | 4 | Cohort |
| F2 | Platform subscription & metering | A1 | 3 | *platform* |
| F3 | Payments integration | F1 | 3 | Cohort |
| F4 | Trials, coupons, referrals | F1 | 2 | Institute |
| F5 | Multi-teacher payouts | F1, A3 | 3 | Institute |
| F6 | Compliance & data | A1 | 3 | Cohort |

- **F1 Student billing & plans.** Fee plans (monthly, term, per-session), invoices, dunning,
  pause/resume.
  *Screens:* Student billing & plans.
  *v1* plans + manual-mark-paid + invoice PDF → *v2* auto-invoice, reminders, proration → *v3*
  families, scholarships, revenue recognition.
- **F2 Platform subscription & metering.** The tenant's own bill to *you*. Meters seats, active
  students, storage, notification sends, hosted-room minutes. Drives the tier in §7.
  *Screens:* Platform subscription & usage.
  *v1* tier + seat count + monthly charge → *v2* usage meters + overage → *v3* annual plans, in-app
  upgrade, usage alerts.
  *Integrations:* Stripe Billing.
- **F3 Payments integration.** Collect student fees.
  *Integrations:* Razorpay / Stripe / PayU. *v1* one gateway, checkout link → *v2* saved methods,
  auto-charge, refunds → *v3* multi-gateway, split settlements.
- **F4 Trials, coupons, referrals.** Free trials, discount codes, referral credit.
- **F5 Multi-teacher payouts.** Revenue share / per-session pay; payout statements.
- **F6 Compliance & data.** Retention windows, data export, consent capture, audit log. Varies by
  geography (India DPDP, EU GDPR, US state laws, minors) — configurable per workspace.
  *Screens:* Audit log & data export.

### G. Configuration & Templates

| ID | Module | Depends on | Effort | Tier |
|---|---|---|---|---|
| G1 | Module toggle engine | A1 | 4 | *core* |
| G2 | Templates / presets | G1 | 2 | *core* |
| G3 | Custom fields & taxonomy | G1 | 3 | Cohort |
| G4 | Automation rules | G1 | 4 | Institute |
| G5 | Integrations | A1 | 3 | Cohort |

- **G1 Module toggle engine.** The thing that makes "fully configurable" real: per-workspace feature
  flags, dependency resolution (turning on C5 forces C1–C4), safe disable (hide, don't delete data).
  *Screens:* (settings surface across the app).
  *v1* flags + dependency graph → *v2* preview mode, staged rollout → *v3* per-cohort overrides.
- **G2 Templates / presets.** §2.4. Named toggle sets + default rules + starter taxonomy.
  *Screens:* "What kind of tutoring do you do?" onboarding step · Template gallery.
- **G3 Custom fields & taxonomy.** Rename "cohort" → "batch"/"class"/"group"; define subjects,
  grades, levels; custom student fields.
- **G4 Automation rules.** Opt-in `when → then`: *when a live session is scheduled with no same-day
  practice → warn*; *when a student misses 2 practices → create a backlog item*; *when a doubt is
  open > 24h → escalate*. This is where your refuse-list opinions live as choices.
- **G5 Integrations.** Google (Calendar/Meet/Drive), payment gateways, SMS/WhatsApp, YouTube,
  Zapier/webhooks.

---

## 5. Configuration engine

### 5.1 Dependency resolution

Turning a module on pulls its prerequisites. Turning one off warns about dependents and **hides
rather than deletes** — data stays, so re-enabling is lossless. The explorer shows this live.

### 5.2 Always-on core

`A1 Workspace`, `A2 Students`, `A3 Staff`, `G1 Toggle engine`, `G2 Templates`, `D4 Timeline`,
`F2 Metering` cannot be switched off — they are the tenant spine.

### 5.3 Automation rules (opinion as opt-in)

Ship a **rule library**; tenants enable what fits. Each rule names the modules it needs. Examples:

| Rule | Needs | From your refuse-list thinking |
|---|---|---|
| Live session needs a same-day practice artefact | B1, B2, C2 | "Live without a same-day artefact is webinar theatre" |
| A missed practice/test auto-creates a backlog item | C2/C3, E5 | "Star faculty is not the homework policeman" — the backlog chases, not the lecture |
| Analysis rows cannot close without an action | C5 | "Analytics without a remedial action is a PDF nobody uses" |
| External chat links are flagged, not stored as record | D2, D4 | "WhatsApp/Telegram is overflow, never the record" |

---

## 6. UI screen map

~40 screens. Each screen lights up when any module that needs it is on. Continuity with the
16-screen kit is noted.

| Screen | Needed by | Kit origin |
|---|---|---|
| Role router | A2, A3 | E1 |
| Student sign-in | A2 | E2 |
| Staff sign-in | A3 | E3 |
| Workspace setup wizard | A1 | — |
| Branding & domain settings | A1 | — |
| "What kind of tutoring?" onboarding | G2 | — |
| Roster | A5 | — |
| Cohort builder | A5 | C2 (roadmap-style table) |
| Parent link / Parent home | A4 | — |
| Schedule / calendar | B1 | C4 |
| Session detail (pre-class) | B1 | — |
| Join page / waiting room | B2 | — |
| Live session console (teacher) | B2, B4 | C-side of S6 |
| Live session view (student) | B2, B4 | S6 |
| Session record & event transcript | B3 | — (new spine screen) |
| Content library | B5 | C2/C3 |
| Lesson / module viewer | B5 | S2 |
| Assignment issue | B6 | — |
| Assignment submit & grade | B6 | — |
| Question bank | C1 | C3 (asset checklist) |
| Practice set builder | C2 | C3 |
| Practice player | C2 | S3 |
| Practice result & tagged key | C4, C5 | S4 |
| Test / mock setup | C3 | S5 |
| Test runner | C3 | — |
| Analysis → remediation board | C5 | C5 |
| Doubts queue (student) | D1 | S7 |
| Doubts triage (teacher) | D1 | — |
| Message threads | D2 | — |
| Announcements | D3 | — |
| Student timeline / record log | D4 | — (new spine screen) |
| Notification preferences | D5 | — |
| Student dashboard | E1 | S1 |
| Teacher dashboard | E2 | — |
| Owner console | E3 | C1 |
| Reports & exports | E4 | — |
| Mentor / backlog workflow | E5 | S8 |
| Student billing & plans | F1 | — |
| Payments & invoices | F3 | — |
| Platform subscription & usage | F2 | — |
| Payouts / revenue share | F5 | — |
| Automation rules | G4 | filter footer of the kit |
| Integrations | G5 | — |
| Audit log & data export | F6 | — |

---

## 7. Packaging & pricing

Feature selection → tier. The explorer computes this; numbers below are **illustrative bands — you
set the real ones.**

### 7.1 Tiers

| | **Starter** | **Cohort** | **Institute** |
|---|---|---|---|
| For | Solo tutor, 1-on-1 or one small batch | Small team, structured practice loop | Multi-teacher program, billing, branding |
| Students | ≤ 30 | ≤ 250 | 250+ |
| Staff seats | 1 | up to 5 | unlimited |
| Modules | A, B1–B3, B5–B6, D1–D5, E1, E4 | + B4, C1–C5, E2–E3, E5, F1, F3, F6, G3, G5 | + A4, C6, F4, F5, G4, white-label domain |
| Indicative price | **$15–29 / mo** | **$59–99 / mo** | **$199–349 / mo + usage** |

Entry price is deliberately low — "consume it like one person." The jump to Cohort is the practice
loop; the jump to Institute is *running a business* (money, staff, brand).

### 7.2 Usage add-ons (metered by F2)

| Meter | Free allowance | Overage (indicative) |
|---|---|---|
| Storage (recordings, uploads) | 5 GB Starter · 50 GB Cohort · 250 GB Institute | $0.03 / GB / mo |
| SMS / WhatsApp sends | 0 / 500 / 2,000 per mo | $0.008–0.012 / send |
| Hosted-room minutes (if not using Google Meet) | 0 | $0.006 / participant-minute |
| Speech-to-text minutes (future) | 0 | $0.04 / audio-minute |

### 7.3 What it costs you to run a workspace (rough, monthly)

| Line | Basis | Typical |
|---|---|---|
| Video | Google Meet via tenant account | **$0** |
| Storage | ~1 GB per recorded hour; object storage $0.015–0.02/GB | $1–5 |
| Notifications | Email ~$0; SMS ~$0.01; WhatsApp ~$0.005 | $0–8 |
| Compute + managed DB | Shared, amortised per workspace | $2–6 |
| Payments | Pass-through gateway % (tenant or student bears) | $0 to you |
| **Gross margin at $19 Starter** | | **~65–85%** |

Margin is healthy *because* video defaults to the tenant's Google. The moment you host video or run
STT, unit economics change — keep those as opt-in metered add-ons, never bundled.

---

## 8. Platform sequencing

Build order is dependency-first. Weeks are indicative for a small team.

### Phase 0 — Tenant spine · weeks 1–4

`A1` workspace · `A2`/`A3` auth + roles · `G1` toggle engine · `G2` first template · `D4` timeline
read model · `F2` metering skeleton.
*Outcome:* a workspace can be created, people can log in, features can be flipped. **Nothing
teaching-facing ships yet — resist the urge.**

### Phase 1 — Deliver and log a session · weeks 5–10  ← **sellable MVP**

`A5` enrollment · `B1` scheduling · `B2` Meet link + join page · `B3` event transcript · `D5`
notifications · `E1` student dashboard (thin).
*Outcome:* a tutor runs a class, students join through the platform, attendance + notes + link land
on the timeline. **This is the smallest thing a tutor will pay for** — it delivers the "see your
operation" wedge before any pedagogy.

### Phase 2 — Close the practice loop · weeks 11–18

`B5` content library · `B6` assignments · `C1` question bank · `C2` practice sets · `C4` grading ·
`C5` analysis · `E2` teacher dashboard.
*Outcome:* concept → practice → tagged analysis. The exam-prep template becomes fully usable.

### Phase 3 — Accountability & communication · weeks 19–26

`D1` doubts queue · `D2` messaging · `D3` announcements · `B4` in-session engagement · `A4` parents ·
`C3` tests/mocks · `E3` owner console · `E4` reports · `E5` mentor/backlog.
*Outcome:* the full loop plus the surfaces that keep students and guardians in the loop.

### Phase 4 — Business & scale · weeks 27+

`F1` billing · `F3` payments · `F4` trials/referrals · `F5` payouts · `F6` compliance · `G3`
taxonomy · `G4` automation rules · `G5` integrations · custom domains / white-label · `C6` adaptive.
*Outcome:* a tenant can run their whole business inside TutorOS, and you can serve institutes.

### Build order within a phase

Follow the dependency arrows in §4. Rule of thumb: a module ships only after every module in its
`depends on` list is live in production, not just merged.

---

## 9. Tenant onboarding / conversion

The path from "interested tutor" to "logging their first session," target: **under a day.**

1. **Sign up** → workspace created (`A1`).
2. **"What kind of tutoring do you do?"** (`G2`) → a template sets ~15 toggles. They can skip and get
   the 1-on-1 default.
3. **Import students** — CSV, or paste a WhatsApp-group member list, or send an invite link (`A5`).
4. **Connect Google** — one OAuth click; now sessions get Meet links and calendar entries (`B2`).
5. **Schedule the first session** (`B1`) and share the join link.
6. **Run it.** Attendance, notes, and the link land on each student's timeline (`B3`, `D4`).
7. **Day 2: the owner console already has data** — who attended, who didn't. The wedge is felt
   before the tutor has changed a single teaching habit.

**Migration truth:** most target tutors are running on WhatsApp + Google Sheets + a Drive folder +
Razorpay links. You are not replacing an LMS; you are replacing a mess. Import from those exact
sources, and let them keep using WhatsApp as overflow (`D5`) while the record moves to TutorOS.

---

## 10. Generic vs configurable

| Always generic (same for every tenant) | Configurable per tenant |
|---|---|
| The tenant spine (§5.2) | Every module in §4 outside the spine |
| The timeline event model | Which modules write to it |
| The session event-transcript structure | Whether chat/polls/doubts are captured |
| Role names' *permissions* | Role *labels* and taxonomy (`G3`) |
| Pricing tiers and meters | Which tier a tenant is on |
| The automation *rule library* | Which rules are enabled (`G4`) |
| Data export format | Retention windows, consent copy (`F6`) |

---

## 11. Open decisions & risks

1. **Configurability vs conversion.** A 35-switch product is intimidating. The templates must be
   genuinely good, not afterthoughts. *Decide:* can a tenant reach "first session logged" without
   ever opening the settings surface? (Target: yes.)
2. **Google Meet dependency.** Free video is the margin story, but it ties you to Google's API terms
   and to tenants having a Google account. *Decide:* what is the non-Google fallback for the ~20% who
   won't connect one — BYO link only, or hosted rooms from day one?
3. **"Transcript" expectation gap.** Tenants may hear "transcript" and expect verbatim speech. *Decide:*
   name it "session record" in the UI; reserve "transcript" for when STT ships.
4. **Compliance across geographies.** "Global" + minors' data + payments is a real legal surface
   (DPDP, GDPR, COPPA-adjacent). *Decide:* launch geographies for v1, and whether EU/US wait for
   `F6` maturity.
5. **Support economics at a $19 price point.** Low price + high configurability + non-technical users
   = support cost can exceed revenue. *Decide:* self-serve-only for Starter, human onboarding starts
   at Cohort.
6. **Where opinion lives.** If every tenant rebuilds the loop badly, the product's edge is gone.
   *Decide:* how strongly the "Exam-prep loop" template nudges (soft defaults vs guided setup vs
   locked-until-you-understand-it).
7. **The single-tenant kit's fate.** Keep [tutor-loop-ui-kit.html](tutor-loop-ui-kit.html) as the
   reference implementation of the exam-prep template, or let it drift. *Recommendation:* keep it,
   version it alongside the template.

---

## 12. Using the explorer

Open [tutor-platform-explorer.html](tutor-platform-explorer.html):

- **Pick a template** or start from the always-on core and add modules.
- Toggling a module **auto-selects its dependencies** and flags dependents.
- The right panel updates live: **screens needed**, **build concepts + v1→v2→v3 ladder** per module,
  the **tier and price band** your selection lands in, an **estimated run cost**, and a
  **phase-ordered build sequence** for exactly what you picked.
- Use it to scope an MVP (start with the "Exam-prep loop" template, then cut to Phase 1 only) or to
  price a prospective tenant (toggle what they asked for, read the tier).
