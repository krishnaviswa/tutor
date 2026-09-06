# plan.md — 005-dashboard-density

Status: **Specified**. Implement only after human OK on [tasks.md](tasks.md).

001 architecture pack stays unimplemented. 002 spine stays protected. 003 path list stays. 004 chrome stays. 005 **enriches payloads and UI** on existing ids.

## Stack (unchanged)

| Layer | Choice | 005 note |
|---|---|---|
| UI | Next.js 15, one route per catalog id | Match demo gold density on listed screens |
| API | Existing FastAPI `/api/v1` paths | Same ids; richer JSON |
| Data | Compose Postgres local; pytest SQLite memory | No new tables required |
| Auth | OTP `000000` | Unchanged |

## Layers

```
Seed (catalog pack + density facts)
  → PostgreSQL (workspace_id on every row)
  → services/progress.py  (aggregates from ledger tables)
  → thin routers (extras.py, owner.py, parent.py)
  → Next.js wired screens
  → demo-shaped cards, bars, chase lists
```

Logic belongs in `backend/app/services/progress.py` (name may be `dashboard.py`). **Do not** grow `extras.py` query blobs. Routers call the service and return dicts.

## Same paths, richer JSON

No new `/api/v1/...` ids. Catalog `apis.json` paths stay. Payloads grow.

| Path | Today (hollow) | 005 required fields |
|---|---|---|
| `GET /api/v1/me/dashboard` | `student_id`, `upcoming_sessions`, `attempts`, `last_score` | `next_session` `{id,title,starts_at,join_opens_at}`, `due_practice` `{id,title,unanswered,total,due_at}`, `this_week` `{title,starts_at,kind}`, `doubt` `{id,title,status,has_clip}`, `weak_tags` `string[]`, keep counts |
| `GET /api/v1/teacher/dashboard` | `sessions`, `students`, `attempts` | `cohort` `{id,name,size}`, `attendance_pct`, `attendance_week` `[{day,pct}]`, `practice_by_set` `[{title,pct}]`, `doubt_backlog`, `at_risk` `[{student_id,display_name,reason,tone}]`, keep counts |
| `GET /api/v1/owner/console` | `workspace`, `usage`, `always_on` | `scorecard` `{sessions_done,sessions_plan,active_students,practice_pct,doubt_sla_pct,revenue_cents,collected_pct,churn_risk}`, `teachers` `[{name,sessions,sla_pct}]`, `cohort_pnl` `[{name,in_cents,margin_pct}]`, keep `usage` |
| `GET /api/v1/parent/home` | `children[]`, `hub[]` | per child: `attendance` `{present,total}`, `latest_practice` `{score,total,title}`, `latest_test` `{score,max,title}`, `fee_due` `{amount_cents,due_on,status}`, `activity_summary` |
| `GET /api/v1/invoices/mine` | `id`, `amount_cents`, `status` | `due_on`, `receipt_id` if paid, `label` (month). Mix derived: paid / pending / overdue |
| `GET /api/v1/reports` | `[]` | parent: term slice `{attendance,practice_pct,latest_test,teacher_note}`. Teacher/owner: same plus export still via POST |
| `GET /api/v1/content` | `id`, `title`, `body`, `topic_id` | `kind` (video\|pdf\|playlist\|notes), `duration_label`, `progress_pct` |
| `GET /api/v1/content/{id}` | `title`, `body` | `kind`, `duration_label`, `notes[]`, `next_practice` `{id,title}` |

Missing JSON keys fail the screen. Extra keys are allowed. Do not add query params that invent a new resource.

## Derivation rules (ledger, not a second gradebook)

| Fact | Source tables | Rule |
|---|---|---|
| Next session | `scheduled_sessions` | Soonest `starts_at` ≥ now in workspace; student: enrolled cohort only |
| Due practice | `practice_sets` + `attempts` | Set with due in window; unanswered = questions − answers on latest attempt |
| Weak tags | `attempts` payload / question tags | Topics with lowest recent accuracy; tenant `topics`, never syllabus tables |
| Attendance % | `attendance` + `scheduled_sessions` | Join/enter writes; do **not** pre-seed “live today” attendance |
| Weekday bars | `attendance` grouped by local day | Last 7 calendar days with sessions |
| At-risk | attempts, attendance, doubts, backlog | Named reason string (missed sets, low attendance, unread doubts) |
| Doubt backlog | `doubts` status open | Count + SLA from created_at |
| Revenue | `invoices` | Sum amount_cents; collected = paid / issued |
| Churn risk | timeline quiet + attendance | Students with 14d no timeline event or attendance < threshold |
| Parent fee due | `invoices` for linked student | Earliest unpaid; overdue if `due_on` < today |
| Content progress | `content_items` + timeline `content.viewed` | Percent optional; 0 if never viewed |

Attendance remains platform join/enter. Seed may create **historical** attendance for weekday bars, not a fake in-progress class.

## Seed workflow

`seed_catalog_pack` already lists rows. 005 extends it (same function or `seed_density.py` called from it):

1. Named upcoming session with `starts_at` tonight-shaped (relative to seed `when`).
2. Practice set with due_at, two questions, zero or partial attempt for student 1.
3. Second student with missed practice / low historical attendance → at-risk.
4. Open doubt with title; one answered doubt with clip flag in payload.
5. Content items with `kind` in JSON body or column if already present; notes list.
6. Invoices: one paid with receipt id in payload, one pending with `due_on`.
7. Historical attendance rows for last week (not today’s live session).
8. Owner revenue: invoices on exam-prep sufficient for scorecard rupees.

Wipe: `python -m app.seed_cli --reset`. Document on [seed-map.html](../../seed-map.html).

## RBAC

Unchanged. Student sees self. Teacher sees workspace cohort. Owner sees workspace. Parent sees linked child only. Assistant does not get owner scorecard.

## Ports / QuotaGuard

Unchanged. Mock payments. WhatsApp still channel-after-timeline. Caps still on F2. Density reads are not metered.

## Frontend

Same `frontend/components/wired/*Screen.tsx`. Reuse demo CSS classes already in the app (`stat`, `bars`, `hot--card`, `chip`). Do not invent a chart library if CSS bars from demo suffice. Do not restyle other screens.

Screens in scope: `student-dash`, `teacher-dash`, `owner`, `parent-home`, `payments`, `library`, `lesson`, `reports`.

## Tests

- Extend `test_003_api.py` or add `backend/tests/test_005_density.py`.
- Assert payload keys for exam-prep student/teacher/owner/parent.
- Isolation: language-1on1 teacher cannot see exam-prep at-risk names.
- Parent cannot see student 2 (unlinked) numbers.
- `live_calls == 0`.
- 002 suite still green as phase gate.

## Risks

- Over-fetch in routers — mitigate by one service function per dashboard.
- Fake attendance for “today” — forbidden; use historical week only.
- New screen temptation (public homepage) — out of scope.
- Breaking 004 count-only clients — additive JSON is fine; wired screens must switch to named fields.
