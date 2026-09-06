# plan.md — 003-catalog-complete

Status: **Specified** (Architect). Human OK is approval of the HTML implementation guide (`plan-viewer.html` + satellites). No `/speckit.implement` until that OK.

001-platform-architecture stays the architecture pack. 002-sim-spine stays the protected spine sim. 003 extends the catalog; it does not rewrite 001 or 002.

Giant-spec rail: tasks are phased. If 002 tests fail, stop the phase.

## HTML implementation guide (this pass)

Documentation only. Not the app. Not a 48th screen.

| File | Audience use |
|---|---|
| `plan-viewer.html` | Master hub (README equivalent): status, constitution, critical path, task plan, approval gate |
| `plan-functional.html` | Jobs, roles, 47 screens, six templates, journeys |
| `plan-technical.html` | Layers, entities, 84 APIs, ports, middleware, files |
| `plan-sequence.html` | End-to-end implement steps: functional + technical paired, phase by phase |

## Stack (003)

| Layer | 003 choice | Notes |
|---|---|---|
| UI | **Next.js 15 App Router**, TypeScript, one route per `catalog/screens.json` `route` | Demo HTML remains UI gold until `wired` |
| API | Existing FastAPI `/api/v1` in `backend/` | Keep 002 routers; add remaining catalog paths |
| Data | SQLAlchemy 2 models for PostgreSQL; default tests in-memory SQLite; sim file + optional Compose Postgres | Same as 002 engine policy |
| Ports | Protocol + **mock default** | Live env vars exist in catalog; CI must stay mock |

Do not treat SQLite as the product database. Do not add SQLite-only SQL.

## Layers

```
Entry (role + workspace_id JWT)
  → Next.js (catalog screen ids only; no business rules)
  → FastAPI /api/v1 (thin routers; catalog path ids only)
  → Middleware: CORS → request id → tenant → authn → authz + G1 flags → QuotaGuard → idempotency → audit
  → Services (Record, Timeline, Quota, Notify, plus 003 domain services)
  → Ports (all mock | storage local)
  → SQLAlchemy → SQLite file | optional Postgres
```

Always-on modules cannot be flagged off: **A1, A2, A3, G1, G2, D4, F2**. Missing G1 module → **404**, not 403.

## 002 close-out (first)

Before new tables or Next.js:

1. Run `backend` pytest (isolation, record→timeline, quotas/RBAC, parent, `live_calls == 0`).
2. `/speckit.converge` + Tester report for 002.
3. PM Accept 002 without expanding 002’s slice.

Protected tests remain the regression gate for every later 003 phase.

## Data impact

### Already in 002 (do not drop)

Spine 18 + `usage_meters` + `quota_policies`. `users` is the person; JWT binds one `workspace_id`.

### Promote in 003 (catalog `later` → durable, workspace-scoped)

`questions`, `attempts`, `doubts`, `messages`, `invoices`, `notification_prefs`, `notification_deliveries`, `content_items`, `assignments`, `submissions`, `practice_sets`, `tests`, `announcements`, `plans`, `payouts`, `automation_rules`, `backlog_items`.

Subject remains `taxonomies` / `topics` only. No syllabus or Biology tables.

`notification_deliveries` is a **channel journal** (audit of mock sends). Ledger remains `timeline_events`. Failed send does not roll back timeline.

Parent hub 002 stubs (`GET attempts/{id}`, `invoices/mine`, `threads`, `reports`, `notif-prefs`) become real reads when those tables exist — **same API and screen ids**.

Catalog `tier` / API `status` bump on Accept, not mid-task.

## Seeds

Keep three workspaces (exam-prep, language 1-on-1, music). Expand seed only with generic topic labels. Exam-prep faculty still does not require `staff-login`. Optional extra seed rows for practice/content/billing so wired screens are not empty — never Biology-as-product.

## Auth (no new screen)

Existing catalog auth APIs. OTP `000000` / magic-link stub stays for local/CI. JWT claims: `sub`, `role`, `workspace_id`. Roles: `owner` | `teacher` | `assistant` | `student` | `parent`.

## Screens (47 existing ids)

All remain catalog ids. 003 **behaviour**: backend remaining APIs + Next.js routes. Status ladder: `empty` → `shell` → `wired`.

Wire **002-backed screens first** after the app shell: `router`, `student-login`, `staff-login` (not mandatory on exam-prep), `wsetup`, `roster`, `cohort-builder`, `schedule`, `session-pre`, `record`, `timeline`, `parent-link`, `parent-home`, `owner`, `subscription`, `notif-prefs`.

Then remaining domains B live/join/video, B content/assign, C practice/tests, D doubts/messages/announce, E dashboards/reports/mentor, F billing/payments/payouts/audit, G onboard/templates/automation/integrations, `branding`.

## API contract (catalog ids only)

84 paths. 002 `sim` stays. 003 implements `planned`. 002 stub-empty paths become real when entities exist.

### 002 sim (keep)

Auth, workspaces (except branding PATCH), students, cohorts, parent-links, parent/home, sessions CRUD + record, timeline, owner console, usage, subscription quotas, plus stub `reports`, `attempts/{id}`, `invoices/mine`, `threads`, notif prefs.

### 003 implement (planned)

| API id | Screens | 003 RBAC |
|---|---|---|
| `PATCH /api/v1/workspaces/current/branding` | `branding` | owner |
| `POST /api/v1/sessions/{id}/video-link` | `session-pre` | teacher, owner |
| `GET /api/v1/join/{token}` | `join` | public token; binds student |
| `POST /api/v1/join/{token}/enter` | `join` | student; writes attendance |
| `GET /api/v1/sessions/{id}/live` | `live-teacher`, `live-student` | teacher/owner vs enrolled student |
| `POST /api/v1/sessions/{id}/engagement` | `live-teacher` | teacher |
| `GET /api/v1/sessions/{id}/video` | `session-video` | teacher, owner; transcript empty |
| `GET/POST /api/v1/content` | `library` | read: student/staff; write: teacher, owner |
| `GET /api/v1/content/{id}` | `lesson` | enrolled / staff |
| `GET/POST /api/v1/assignments` | `assign-issue` | teacher, owner |
| `GET .../submissions` `POST .../grade` | `assign-grade` | teacher, owner |
| `GET/POST /api/v1/questions` | `qbank` | teacher, owner |
| `GET/POST /api/v1/practice-sets` | `practice-build` | teacher, owner |
| `GET .../play` `POST .../attempt` | `practice-play` | student |
| `POST/GET /api/v1/tests` | `test-setup` | teacher, owner |
| `GET .../run` `POST .../submit` | `test-runner` | student |
| `GET /api/v1/analysis/{cohortId}` `PATCH .../action` | `analysis` | teacher, owner |
| `GET/POST /api/v1/doubts` | `doubt-student` | student |
| `GET /api/v1/doubts/queue` `PATCH /api/v1/doubts/{id}` | `doubt-teacher` | teacher, owner |
| `POST /api/v1/threads/{id}/messages` | `messages` | participants |
| `GET/POST /api/v1/announcements` | `announce` | teacher, owner |
| `GET /api/v1/me/dashboard` | `student-dash` | student |
| `GET /api/v1/teacher/dashboard` | `teacher-dash` | teacher |
| `POST /api/v1/reports/export` | `reports` | owner, teacher |
| `GET /api/v1/backlog` `POST .../book` | `mentor` | teacher, owner |
| `GET /api/v1/plans` `POST /api/v1/invoices` | `billing` | owner |
| `POST /api/v1/payments/checkout` | `payments` | student, parent (mock port) |
| `POST /api/v1/billing/whatsapp-pause` | `subscription` | owner |
| `GET /api/v1/payouts` | `payouts` | owner |
| `GET /api/v1/audit` `POST /api/v1/data-export` | `audit` | owner |
| `POST /api/v1/workspaces/current/template` | `onboard-kind`, `template-gallery` | owner |
| `GET /api/v1/templates` | `template-gallery` | owner |
| `GET/PATCH /api/v1/automation-rules` | `automation` | owner |
| `GET /api/v1/integrations` `POST .../connect` | `integrations` | owner; mock OAuth |

Do not invent paths. Adaptive practice (C6) has no extra catalog API id — stay on existing practice/analysis ids.

## RBAC

| Role | 003 |
|---|---|
| owner | workspace, branding, flags, roster, quotas, billing, payouts, audit, templates, automation, integrations; read teaching |
| teacher | cohorts, schedule, record, live, content, assignments, qbank, practice, tests, analysis, doubts queue, announce, mentor, reports; not owner billing consoles |
| assistant | roster; not owner consoles; not required to PATCH record |
| student | login, join, live-student, library/lesson, play/submit practice & tests, own timeline, own dashboard, doubts, payments mine |
| parent | parent-home + linked child timeline/reports/practice-result/payments/messages/notif-prefs; not other families; not workspace B |

## Ports (mock default)

Unchanged catalog ports. `calendar_video` used by video-link/join/live (mock URL). `payments_student` for checkout mock. WhatsApp after timeline; teacher, parent, admin; student gated default off. Storage local for content/board photos. `POST integrations/{name}/connect` records a mock grant; does not call Google/Meta.

## QuotaGuard

Order: AuthZ → QuotaGuard → handler. 100% + `block`: skip paid channel send; teaching record, practice attempts, and timeline **succeed**. Caps do not disable A1/A2/A3/D4/F2.

## Frontend

```
frontend/
  app/                    # App Router; routes from catalog only
  ...
```

Tokens from `tutor-platform-demo.html`. Do not restyle `empty` screens against invented UI. Exam-prep template omits `staff-login` in navigation.

## Tests (Builder + Tester; mock only)

Keep 002 suite. Add: isolation on new tables; join writes attendance in A only; practice attempt → timeline in A only; parent sees linked child attempts/invoices/messages; checkout does not call Razorpay; no new screen/API ids; Next.js smoke that catalog routes exist.

## Human OK (gate)

Specified (this plan + checklist + analyze) → tasks → **HTML guide** → human OK in chat → Builder `/speckit.implement`.

Refuse implement if HTML guide missing or not approved.

## Risks

- Giant spec: phase gates required.
- 001 HTML pack still not formally accepted as production UI.
- Demo incomplete vs six tracks — do not invent ids.
- C6 adaptive has no dedicated API — do not invent one.
- Parent hub filling will change 002 stub payloads (empty → rows); tests must expect the new contract after those tasks, not before.
- Optional Postgres is not required to ship; unit tests stay SQLite memory.
