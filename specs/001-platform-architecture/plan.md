# plan.md — 001-platform-architecture

Status: **Specified**. Application code is not in this feature.

## Stack (later)

Next.js 15 · FastAPI `/api/v1` · PostgreSQL · ports with mock default.

This feature delivers HTML + markdown + catalog + checkers only.

## Source of truth (demo wins)

1. `tutor-platform-demo.html` — UI gold: `S` (47 ids), `TEMPLATES` (six tracks), `WHY` (owner / who / why / how / when). **Incomplete:** focused tracks do not yet include every spine screen (example: `staff-login` is on Everything / t6). Do not invent ids to fill the gap.
2. `python scripts/build_catalog.py` — screens, flows (steps + roles + tour), embed.js.
3. `tutor-platform-architecture.html` — stack map. Reads `catalog/embed.js`. Role filter uses swimlane `roles[]`, not chrome-only `S.role`.
4. `scripts/build_role_html.py` — five generated children. Same mocks; `ROLE_ONLY` filters lanes. No extra features. Not linked from demo chrome.
5. Later completeness: copy six-track UI and planned backend capability onto role pages / focused templates **without new screen ids**. Persist answers in JSON/`localStorage`, not by rewriting HTML.

If architecture or catalog disagrees with the demo, regenerate from the demo.

## Layers

See README §3 and `tutor-platform-architecture.html`.

Middleware order: CORS → request id → tenant → authn → authz + G1 → QuotaGuard → idempotency → audit.

Auth: OTP / magic link / JWT / link tokens. Roles: owner, teacher, assistant, student, parent. Demo swimlanes also use `faculty` (teacher + assistant chrome) and `system` (automatic timeline writes).

## WhatsApp

Port `whatsapp`. After `TimelinePort.append`, `Notify.dispatch` to teacher, parent, admin per prefs. Student optional. Counted on F2. Outbound only.

## Quotas

Meters: WhatsApp, SMS, email, storage, seats, students, hosted minutes, STT slot. Policy warn | block | allow_overage. UI: `owner`, `subscription`.

## Data

Spine + `taxonomies`/`topics` in README §5. No syllabus tables.

## Screens

Closed set of 47 from catalog. Architecture HTML uses `data-screen` ids. Demo deep-link `?screen=` → `#/t6/<id>`. Six tracks: Start → template card → steps from demo.

## Risks

- Duplicate catalog in `catalog/embed.js` (generated). Always run `python scripts/build_catalog.py` after demo `S` / `WHY` / `TEMPLATES` or contracts in `scripts/build_catalog.py`.
- Role HTML drifts if demo changes without `python scripts/build_role_html.py`.
- Spec Kit CLI not required: commands are markdown in `.cursor/commands` and `.claude/commands`.
