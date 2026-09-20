# spec.md — 008-billing-v2

| Field | Value |
|---|---|
| **Status** | Draft (Specified pending human sign-off on 2 of 3 open Clarifications — no-show billing policy and platform tier/pricing block Architect sizing of Epics A/C; refund limits is flagged but non-blocking) |
| **Role** | PM (specify) + Architect (plan, next) |
| **Feature directory** | `specs/008-billing-v2` |
| **Action items** | none yet — Architect writes `plan.md` after human OK |

## Why

TutorOS is two-sided money, and today only one side is real. The tenant-to-student side (**Axis B**) has a
genuine `Plan` + `Invoice` model with day-based proration and coupon math (006, Accepted) — but no
subscription lifecycle (no trial/active/paused/canceled state), no ledger of what happened to a payment
(status is one mutable field, not a trail), and nothing that reads a completed class and turns it into an
hourly bill. The platform-to-tenant side (**Axis A**) is thinner still: the `subscription` screen only shows
the quota dashboard — there is no tenant tier, no trial, no invoice record, no upgrade/cancel path at all.

Meanwhile `007-sessions-timetable` (status Testing, not yet Accepted) shipped a computed session
`display_status` — Upcoming / Auto completed / Staff completed / Cancelled — which is exactly the "did the
class actually happen" signal that hourly billing needs and that an earlier pass over this problem assumed
was still missing. It also confirmed a real gap: a session's end time is optional and falls back to a fixed
90-minute default when not set, so the only duration signal billing can use today is the *scheduled* window,
not a verified actual one.

This spec covers three scopes, all grounded in a source-level pass over `tables.py`, `owner.py`, `extras.py`,
`internal_v2.py`, and `ports/mocks.py` (see `billing-subscription-plan.html` for the full trace):

- **A — Platform subscription** (Axis A): give the tenant a real subscription — tier, trial, status,
  upgrade/downgrade/cancel — instead of only a quota dashboard.
- **B — Ledger hardening** (Axis B, existing flows): every invoice and payment gets a real event trail, a
  real receipt, and a real payout computation, instead of one mutable status field and a seeded stub.
- **C — Hourly cohort billing** (the new requirement): staff choose, per cohort, whether that cohort is
  billed as a flat recurring plan (today's only mode) or by the hour, at a rate they set, aggregated from
  sessions that actually happened.

**No new screen ids anywhere in this spec.** Every change extends an existing catalog id: `subscription`,
`billing`, `payments`, `payouts`, `cohort-builder`, `owner`, `reports`, `audit`, `timeline`. The closed
catalog stays at 49.

### One spec, three epics — not three specs

The source plan suggested splitting "ledger hardening" from "hourly cohort billing" because the hourly piece
is the highest-risk one (it turns attendance data into money). That's the right call for **sequencing work**,
but not for **defining it**: all three epics share one schema surface (the `Invoice` record gains the same
new state either way), one Why (TutorOS's money story becoming real instead of simulated), and one set of
touched screens. Splitting the *spec* would mean re-deriving that shared context twice and risking the two
halves drifting apart on vocabulary (e.g. what "paid" means) before either is built.

So: **one spec, structured as three independently gate-able epics** (A, B, C below), each with its own user
stories and AC. The Architect decides at `plan.md` time whether that becomes one plan or is split into
separate plans/PRs per epic — that is a sequencing and stack decision, not a what/why decision, and it is
explicitly the Architect's call. This spec's own recommendation, carried over from the source doc: build and
land **A and B together first** — both axes' data models already exist and mostly need a real trail added
to them, not a new judgment call — then build **C last** with its own checklist/analyze pass, because a wrong
hourly calculation is real money computed from attendance data, and it is the only epic in this spec with a
genuinely new business rule (the review gate in story 18).

## User stories

### Epic A — Platform subscription (Axis A: TutorOS → tenant)

1. **As** an owner, **I want** to see my workspace's subscription tier, trial/active/paused/canceled status,
   and current period end on the `subscription` screen, **so that** I know what TutorOS is charging my
   workspace and when it renews.
2. **As** an owner, **I want** to upgrade or downgrade my workspace's tier, **so that** I can change plans as
   my workspace grows or shrinks without contacting support.
3. **As** an owner, **I want** to cancel my workspace's subscription, **so that** I stop being billed at the
   next period end (not mid-period) if I decide to leave.
4. **As** an owner, **I want** to see my workspace's platform-level invoice history on the `subscription`
   screen, **so that** I have a record of what TutorOS has charged the workspace over time.
5. **As** an owner, **I want** a workspace on a lapsed or canceled subscription to keep using core
   always-on functions (login, timeline, session delivery) while metered sends throttle per the existing
   quota policy, **so that** a billing problem never locks a class out mid-session (non-negotiable #4).

### Epic B — Ledger hardening (Axis B: tenant → student/parent, existing flows made real)

6. **As** a parent or student, **I want** every invoice state change (created, payment attempted, paid,
   failed, refunded) to leave a permanent record, **so that** "why does this say paid" always has an answer
   instead of one field that could have changed for any reason.
7. **As** a parent or student, **I want** a real, stored receipt for each payment (not a string built from
   the invoice id when I look at it), **so that** what I see today matches what I'll see in six months.
8. **As** a parent or student, **I want** each invoice and payment state change to also appear on the
   student's timeline, **so that** billing history sits next to session and progress history in one place
   (non-negotiable #2 — timeline is the ledger).
9. **As** an owner or admin, **I want** to issue a partial or full refund against a paid invoice, **so that**
   I can correct a billing mistake without a manual workaround.
10. **As** an owner or admin, **I want** to cancel a student's enrollment, **so that** a student who has left
    stops being billed on the next cycle.
11. **As** an owner or admin, **I want** the `payouts` screen to show payouts computed from actual completed
    sessions (not a seeded/static list), with a pending → approved → paid workflow, **so that** what a
    teacher is owed reflects what they actually taught.
12. **As** an owner or admin, **I want** to trigger a renewal run for plans due to recur, **so that**
    recurring invoices go out without needing a cron job in this environment.
13. **As** an owner or admin, **I want** a revenue rollup on `owner`/`reports` covering both axes (platform
    subscription revenue and tenant-collected student revenue), **so that** I can see the whole money
    picture in one place.

### Epic C — Hourly cohort billing (the new requirement)

14. **As** an owner or admin, **I want** to set a cohort's billing mode to static (today's flat recurring
    plan) or hourly, **so that** a cohort that's taught by the session — not by a fixed monthly fee — bills
    correctly.
15. **As** an owner or admin, **I want** to set an hourly rate on a cohort once its billing mode is hourly,
    **so that** the rate is explicit and workspace-controlled, not derived from anything subject-specific
    (non-negotiable #1/#6 — no per-subject rate).
16. **As** an owner or admin, **I want** to trigger an hourly invoice for a cohort over a period I choose,
    **so that** I control when a billing period closes (e.g. end of month), not an automatic background job.
17. **As** an owner or admin, **I want** the hours on an hourly invoice to be computed only from sessions
    that actually completed (staff-completed or auto-completed) in that period, using each session's
    scheduled duration, **so that** cancelled sessions and future/unscheduled time are never billed.
18. **As** an owner or admin, **I want** an hourly invoice to land in a pending-review state before it
    becomes payable, and to have to explicitly approve it, **so that** a data-entry mistake in a completed
    session never turns directly into a real charge without a human looking at it first. A static
    (flat-plan) invoice keeps auto-finalizing as it does today — only hourly ones carry this extra gate.
19. **As** a parent or student, **I want** an hourly invoice to show the hours it was built from, **so that**
    I can see what I'm being asked to pay for, not just a total.
20. **As** an owner or admin, **I want** an hourly invoice, once approved, to be a frozen snapshot, **so
    that** editing a session's time after the fact never silently changes an invoice that's already been
    sent.

### Housekeeping

21. **As** anyone listing catalog screens, **I want** the same 49 ids as after 007 — no new id added by this
    spec — with `subscription`, `billing`, `payments`, `payouts`, `cohort-builder`, `owner`, `reports`,
    `audit`, and `timeline` extended in place.

## Acceptance criteria

1. Given a workspace with no platform subscription record, when the `subscription` screen loads, then it
   shows a defined default tier and trial state rather than only the quota dashboard it shows today.
2. Given an owner requests an upgrade or downgrade, then the workspace's tier changes and the change is
   reflected on `subscription` and recorded in the platform invoice history (story 4).
3. Given an owner cancels, then the subscription status becomes "cancels at period end" (not immediately
   inactive), and the workspace keeps full core access until the period actually ends.
4. Given a workspace whose subscription has lapsed or been canceled and the period has ended, then metered
   sends throttle per existing QuotaGuard policy, and login, timeline, and session delivery remain usable —
   nothing hard-locks (story 5, non-negotiable #4).
5. Given a checkout is attempted twice with the same request, then only one payment event trail is created
   for it (idempotent) — a retried click never double-charges or double-records.
6. Given an invoice moves through created → payment attempted → paid, then each transition is both queryable
   as a permanent record on that invoice and visible as a timeline event on the paying student's timeline.
7. Given a paid invoice, when the parent or student views it, then a stored receipt is shown — re-viewing it
   later shows the same receipt, not a freshly derived string.
8. Given a paid invoice, when an owner or admin issues a refund (full or partial), then the invoice reflects
   the refunded amount, a refund event is recorded, and the student's timeline shows it.
9. Given an owner or admin cancels a student's enrollment, then no further invoice is generated for that
   enrollment on its plan's next recurrence.
10. Given completed sessions exist for a teacher, when the `payouts` screen loads, then payout amounts are
    computed from those sessions rather than read from a seeded value, and each payout carries a
    pending/approved/paid status an owner or admin can advance.
11. Given an owner or admin triggers a renewal run, then every plan due to recur in that run gets exactly one
    new invoice (no duplicates on a second trigger the same day for a plan already renewed).
12. Given `owner`/`reports`, then a revenue rollup shows platform-subscription revenue (Axis A) and
    tenant-collected student revenue (Axis B) as distinguishable figures, not combined into one number.
13. Given a cohort with billing mode unset, then it behaves exactly as today (flat plan, static) — this spec
    changes nothing about a cohort that never opts into hourly.
14. Given an owner or admin sets a cohort's billing mode to hourly and sets a rate, then `cohort-builder`
    reflects both, and a cohort cannot be hourly without a rate set (validation, not a silent zero-charge).
15. Given an owner or admin sets a rate, then the rate is a single per-hour amount for the cohort — there is
    no per-subject or per-topic rate anywhere in this spec (non-negotiable #1/#6).
16. Given an owner or admin triggers an hourly invoice for a cohort over a chosen date range, then the
    invoice's hours come only from that cohort's sessions in that range whose display_status is "Staff
    completed" or "Auto completed" — cancelled and future/upcoming sessions contribute zero hours.
17. Given a session used in an hourly calculation has no explicit end time, then its scheduled default
    duration (per 007's existing fallback) is what's billed — this spec does not require session end times to
    become mandatory, since 007 already shipped the fallback and made it visible via `display_status`.
18. Given an hourly invoice is generated, then its status is pending-review, not open, and it cannot be paid
    while pending-review; an owner or admin must explicitly approve it before it becomes payable.
19. Given a static (flat-plan) invoice is generated, then it continues to auto-finalize (become open)
    exactly as today — the pending-review gate applies only to hourly invoices.
20. Given a parent or student views an hourly invoice, then the hours it was computed from are shown
    alongside the amount.
21. Given an hourly invoice has been approved, when a session in its billing period is later edited (time
    changed) or a new session is added, then the already-approved invoice's hours and amount do not change —
    only a newly generated invoice for a later period would reflect it.
22. Given two workspaces, when either axis's screens, invoices, payouts, or subscription records are listed,
    then no row from one workspace is visible to the other (tenant isolation, non-negotiable #1).
23. Given pytest, when 008 lands, then 002–007's own tests stay green and `live_calls == 0`; `create_app`
    still raises on a non-mock provider (ports stay mock, non-negotiable #8).
24. Given `catalog/screens.json`, when anyone lists ids, then exactly the same 49 ids from 007 appear — this
    spec adds zero new screen ids.
25. Given Accept, when 008 closes, then `README.md`, `tutor-platform-architecture.html`,
    `product-viewer.html`, and `work-log.html` name 008 and every screen it extended.

## Clarifications

Resolved during this specify/clarify pass, with reasoning (no human input needed for these):

- **Billable duration source (AC17).** Use each session's scheduled window (`starts_at` → its end, real or
  the 007 default), snapshotted at invoice time — not an "actual" attendance-verified duration, because no
  such signal exists in the product and building one is out of scope here. Resolved by what data 007 already
  provides, not a business judgment call.
- **Invoice freezing (AC21).** An approved hourly invoice is a snapshot, not a live query — the alternative
  (recomputing on every view) would let a billed amount move after being shown to a family, which is a worse
  outcome under any billing policy. Resolved as a correctness requirement, not a preference.
- **Static invoices skip review; hourly ones don't (story 18/AC18–19).** Carried over directly from the
  source plan's own reasoning: a static amount is fixed by the plan and safe to auto-finalize; an hourly
  amount is derived from attendance data and can be wrong in ways a static one cannot.
- **Cancellation timing (AC3).** Cancel-at-period-end, not immediate, matches how the existing per-parent
  invoice/coupon model already treats billing periods (006) and avoids an owner accidentally losing access
  mid-period by clicking cancel.

Still open — need a human (product/business) decision before `plan.md` can size these; everything else in
this spec can proceed without them:

1. **No-show billing policy for hourly cohorts.** Should an absent student's hours for a given session be
   billed anyway (the teacher's time was reserved) or excluded from that student's invoice? This spec's AC16
   deliberately says "hours come from the cohort's completed sessions" and stays silent on per-student
   attendance filtering, because the two policies produce different amounts and this is a revenue policy
   call, not a product-logic one. Recommendation if a default is needed: bill full scheduled hours regardless
   of attendance (simplest, matches "you're paying for the teacher's reserved time" — the norm in most 1-on-1
   and small-cohort tutoring) — but this should be an explicit owner decision, possibly even a per-workspace
   or per-cohort toggle, before Architect sizes it.
2. **Platform subscription tier names, prices, and entitlements (Epic A).** There is no existing
   customer-facing pricing table anywhere in this repo. `tutor-platform-explorer.html` uses `starter` /
   `cohort` / `institute` as internal module-availability tier labels, which is a reasonable naming
   starting point, but has no attached price or quota entitlement per tier. Business needs to supply actual
   tier names, prices, and what each tier entitles (quota caps, seat counts) before this can be built —
   without that, Epic A can only ship the state machine (trial/active/paused/canceled) with a placeholder
   single tier.
3. **Refund authority and limits.** AC8 allows an owner or admin to refund a paid invoice, full or partial,
   with no stated limit or approval chain. Is there a refund amount ceiling, a required reason code, or a
   second-approval requirement above some amount? Left unconstrained in this spec pending a business answer;
   the mock-port checkout has no real money movement to protect against yet, so this is lower urgency than
   items 1–2, but should be answered before Axis B's payment ports go live (see
   `integrations-backlog-and-golden-path.html` §1, `payments-live` backlog group).

## Out of scope

- Real payment gateway integration (Razorpay/Stripe), webhooks, signature verification, reconciliation
  against a real settlement file — ports stay mock (non-negotiable #8); see the integrations backlog's
  `payments-live` group for that follow-on spec.
- GST/tax invoicing, VAT/sales-tax, Terms of Service / Refund Policy publishing, DPA paperwork — legal/tax
  work tracked in `billing-subscription-plan.html` §6, not a Spec Kit feature.
- Real teacher payouts to a bank rail, KYC/PAN collection — `payouts` stays a computed-in-app record, not a
  money-movement integration.
- Per-teacher or per-subject rate cards — this spec is one rate per hourly cohort; a `rate_cards` table for
  overrides is explicitly deferred until a real need appears (source plan §3).
- Requiring `ends_at` to become mandatory on session completion, or deriving actual (vs. scheduled) duration
  — 007's existing fallback is reused as-is (AC17).
- Reusing QuotaGuard/usage meters for hourly revenue accounting — quotas remain a throttle, never a billing
  source (source plan §3 guardrail).
- A 50th screen, any new screen id, custom roles, lifting the mock-port guard.
- The `integrations-backlog-and-golden-path.html` walkthrough test, `BillingScreen.tsx` default-amount UX
  fix, and other golden-path punch-list items — those are small enough to fold into whichever spec's tasks
  pick them up, but they are not user stories of this spec.

## Definition of done

- [ ] Both open clarification items with business/pricing impact (no-show policy, platform tier names and
      prices) answered by a human before `plan.md` sizes Epic A or Epic C.
- [ ] `plan.md` (Architect) decides whether Epics A/B/C ship as one plan or split PRs, and sequences Epic C
      (hourly billing) with its own checklist/analyze pass given it is the highest-risk epic.
- [ ] AC evidenced in `test-report.md`; 002–007 stay green; `live_calls == 0`.
- [ ] Catalog stays 49 ids; role HTML regenerated; no new screen id introduced.
- [ ] `README.md`, `tutor-platform-architecture.html`, `product-viewer.html`, `work-log.html` name 008 on
      Accept.
