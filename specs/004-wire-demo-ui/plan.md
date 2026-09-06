# plan.md — 004-wire-demo-ui

Status: **Accepted**. Human OK was the 004 implement chat. Builder wired all 47 catalog screens. Tester: 20 pytest passed.

001 stays the architecture pack. 002 stays the protected spine. 003 stays Accepted shell/sim (APIs + Next.js routes exist). 004 **wires** existing routes to existing `/api/v1` and demo chrome. Do not rewrite 002. Do not invent catalog screen ids or API paths.

## Stack (unchanged)

| Layer | Choice | Notes |
|---|---|---|
| UI | Next.js 15 App Router, one route per `catalog/screens.json` | Demo HTML is gold until `wired` |
| API | Existing FastAPI `/api/v1` | Catalog ids only; mock ports |
| Data | Compose Postgres locally; pytest in-memory SQLite | Same engine policy |
| Auth | OTP `000000` + magic-link stub + JWT | Roles owner \| teacher \| assistant \| student \| parent |

## Layers

```
Entry (role + workspace_id JWT)
  → Next.js (catalog screen ids; chrome by role)
  → FastAPI /api/v1 (thin routers)
  → Services → mock ports
  → SQLAlchemy → Postgres (local) | SQLite (pytest)
```

Wired UI lives in `frontend/components/wired/`. Pages wrap:

```tsx
<LoginGate role="teacher">
  <AppChrome kind="faculty" screenId="qbank">
    <QbankScreen />
  </AppChrome>
</LoginGate>
```

Student phone: `PhoneChrome` (demo `appnav`). Parent: `ParentChrome` (demo `pnav`). Faculty/admin: existing `AppChrome` (extend Content → `library`). Dual-use catalog ids (`library`, `timeline`, `messages`, `reports`, `payments`, `practice-result`, `notif-prefs`) pick chrome from JWT role after LoginGate `accept` list.

`/` redirects to `/app/student/router`. Optional operator index at `/operator` — **not** a catalog screen.

## API contract (catalog only)

Screens call only the `apis` listed on that row in `catalog/screens.json` (paths also in `catalog/apis.json`). No `/sim/*`. No new path ids.

| Wave | Screen ids | Primary APIs |
|---|---|---|
| Keep | `schedule`, `session-pre`, `record`, `roster` | already wired |
| 1 Identity | `router`, `student-login`, `staff-login`, `parent-link` | `GET /auth/me`; OTP start/verify; magic-link; parent-links accept |
| 2 Faculty | `teacher-dash`, `qbank`, `practice-build`, `doubt-teacher`, `library`, `cohort-builder`, `messages`, `announce` | teacher dashboard; questions; practice-sets; doubts/queue; content; cohorts; threads; announcements |
| 3 Sessions | `join`, `live-teacher`, `live-student`, `session-video` | join token; live; engagement; video (transcript empty) |
| 4 Practice | `assign-issue`, `assign-grade`, `practice-play`, `practice-result`, `test-setup`, `test-runner`, `analysis` | assignments; play/attempt; tests run/submit; analysis |
| 5 Student | `student-dash`, `lesson`, `timeline`, `doubt-student`, `notif-prefs`, `payments` | me/dashboard; content/{id}; students/{id}/timeline; doubts; prefs; invoices/mine + checkout |
| 6 Parent+owner | `parent-home`, `owner`, `billing`, `reports`, `mentor`, `audit`, `integrations`, `subscription`, `payouts` | parent/home; owner/console; plans/invoices; reports/export; backlog; audit; integrations connect; quotas; payouts |
| 7 Onboarding | `wsetup`, `onboard-kind`, `template-gallery`, `branding`, `automation` | workspaces; templates; branding PATCH; automation-rules |

Landings: student → `student-dash` (`/app/student`); exam-prep faculty → `teacher-dash` or `schedule`; parent → `parent-home` (`/app/parent`). Exam-prep omits mandatory `staff-login`; staff-login remains a catalog screen for other templates.

## RBAC

Unchanged from 003 plan. LoginGate uses catalog role. Faculty teaching on exam-prep: teacher OTP on the destination screen, not a forced staff-login hop.

| Role | Chrome | Notes |
|---|---|---|
| owner | `AppChrome` admin | billing, audit, integrations, onboarding |
| teacher | `AppChrome` faculty | Content → library; no staff-login in nav |
| assistant | faculty/admin where APIs allow | not owner billing |
| student | `PhoneChrome` | appnav five items |
| parent | `ParentChrome` | pnav five items; own child only |

## Data impact

None required. 003 already promoted catalog entities. 004 is UI wiring. Minimal API fix only if a screen cannot function; Tester-gated; still a catalog path.

## Ports / QuotaGuard

Mock default. WhatsApp after timeline write; teacher, parent, admin; student gated default off. QuotaGuard unchanged (warn 80%, block paid sends at 100% when policy is `block`). CI `live_calls == 0`.

## Seeds

Keep three workspaces. OTP `000000`. Parent link token `link-{slug}` (e.g. `link-exam-prep`). Do not seed Biology-as-product.

## Risks

- Dual-chrome screens: one route, two roles — resolve via JWT + LoginGate `accept`.
- Join needs a session `join_token` (attach video-link as teacher first).
- Do not rewrite kept wired screens.
- Do not two-agent-edit `AppChrome.tsx`, `LoginGate.tsx`, `globals.css`, `layout.tsx`, `app/page.tsx`.
