# plan.md — 006-internal-v2

Status: **Accepted**. T8.1–T8.12 complete. Human OK was the 2026-09-06 “separate vendor ports” chat.

001 stays unimplemented. 002 protected. 003 path list stays. 004 chrome stays. 005 density stays. 006 **enriches existing paths** and JSON `meta` on existing tables. No live adapters.

## Stack (unchanged)

| Layer | Choice | 006 note |
|---|---|---|
| UI | Next.js 15, one route per catalog id | Extra chrome on existing screens only |
| API | Existing FastAPI `/api/v1` | Additive JSON; no new path **ids** |
| Data | Compose Postgres; pytest SQLite | Optional `meta` JSON on existing tables |
| Auth | OTP `000000` + mock magic | Both methods listed |
| Ports | Mock / local | `create_app` still refuses live providers |

## Layers

```
Seed (catalog + density + internal v2 facts)
  → PostgreSQL (workspace_id on every row)
  → services/internal_v2.py
  → thin routers
  → wired screens
  → MockPorts only
```

## Same paths, richer JSON

| Path | Additive fields |
|---|---|
| `GET /api/v1/auth/me` | `auth_methods`, `permissions` |
| `GET/PATCH /api/v1/workspaces/current` | `auth_methods`, `availability`, `preview_modules`, `coupons` |
| `GET /api/v1/cohorts` | `invite_token`, `waitlist` |
| `POST /api/v1/parent-links` | `fee_visible` |
| `GET /api/v1/parent/home` | hide `fee_due` when link not fee-visible |
| `POST /api/v1/sessions` | student book; **409** on teacher conflict |
| `POST /api/v1/sessions/{id}/engagement` | `chat`, `mcq`, `board_photo` |
| `GET /api/v1/sessions/{id}/record` | `capture` from engagement |
| `GET/POST /api/v1/content` | `kind`, `playlist_ids`, `drip_at`, `views` |
| `GET/POST /api/v1/assignments` | `rubric`, `due_at`, `allow_resubmit` |
| `GET .../submissions` | `late`, `resubmit_count` |
| `GET/POST /api/v1/questions` | `difficulty`, `tags`, `usage_count`, `duplicate_of` |
| `POST /api/v1/practice-sets` | `auto_assemble` `{tag,difficulty}` |
| `POST .../attempt` | `elapsed_ms` |
| `POST /api/v1/tests` | `sections`, `negative_mark` |
| `GET .../run` | `palette`, `resume` |
| `GET /api/v1/analysis/{cohortId}` | `forced_action`, `view` |
| `GET /api/v1/doubts/queue` | `queue_position`, `sla_hours` |
| `GET /api/v1/threads` | `unread`, `attachments` |
| `POST /api/v1/announcements` | `scheduled_at`, `channels` |
| `GET /api/v1/students/{id}/timeline` | `event_type`, `export`, `dispute` |
| `POST /api/v1/invoices` | `auto`, `coupon`, `proration` |
| `GET /api/v1/payouts` | `teacher_name`, `period`, `sessions` |
| `GET/PATCH /api/v1/automation-rules` | run miss-rule → backlog |

## Data

Add `meta` JSON (default `{}`) on: `cohorts`, `parent_links`, `staff_memberships`, `content_items`, `assignments`, `submissions`, `questions`, `practice_sets`, `tests`, `attempts`, `doubts`, `messages`, `announcements`, `invoices`, `payouts`, `plans`. Workspace settings stay in `branding` (already JSON). `--reset` recreates Postgres tables.

## RBAC

Fixed roles. Assistant `meta.modules` intersect G1 flags. Missing module → **404**. Owner unrestricted. Parent fee from **their** `parent_links.meta.fee_visible`.

## Ports / QuotaGuard

Unchanged. Checkout mock. WhatsApp after timeline still mock. Density reads not metered. Auto-invoice reminder = `notification_deliveries` row, not SES.

## Tests

`backend/tests/test_006_internal_v2.py`. Isolation. `live_calls == 0`. Factory still errors on live provider. 002–005 green.

## Risks

- Mutating JSON in place (always assign a new dict).
- Student booking bypassing teacher role — gate on availability windows.
- Temptation to add `/api/v1/waitlists` as a new id — use cohort JSON instead.
