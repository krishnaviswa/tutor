# plan.md — 001-platform-architecture

Status: **Specified**. Application code is not in this feature.

## Stack (later)

Next.js 15 · FastAPI `/api/v1` · PostgreSQL · ports with mock default.

This feature delivers HTML + markdown + catalog + checkers only.

## Layers

See README §3 and `tutor-platform-architecture.html`.

Middleware order: CORS → request id → tenant → authn → authz + G1 → QuotaGuard → idempotency → audit.

Auth: OTP / magic link / JWT / link tokens. Roles: owner, teacher, assistant, student, parent.

## WhatsApp

Port `whatsapp`. After `TimelinePort.append`, `Notify.dispatch` to teacher, parent, admin per prefs. Student optional. Counted on F2. Outbound only.

## Quotas

Meters: WhatsApp, SMS, email, storage, seats, students, hosted minutes, STT slot. Policy warn | block | allow_overage. UI: `owner`, `subscription`.

## Data

Spine + `taxonomies`/`topics` in README §5. No syllabus tables.

## Screens

Closed set of 47 from catalog. Architecture HTML uses `data-screen` ids. Demo deep-link `?screen=` → `#/t6/<id>`.

## Risks

- Duplicate catalog in `catalog/embed.js` (generated). Always run `python scripts/build_catalog.py` after editing contracts in `scripts/build_catalog.py`.
- Spec Kit CLI not required: commands are markdown in `.cursor/commands` and `.claude/commands`.
