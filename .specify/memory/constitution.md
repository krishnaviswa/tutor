# TutorOS constitution

This file is the Spec Kit constitution. Mirror the same rules in `README.md`, `CLAUDE.md`, and `.cursor/rules/project.mdc`. Change them in the same commit.

## Product

TutorOS is a **subject-neutral** remote tutoring workspace. Any subject a tutor can teach at a distance. Templates (exam-prep, 1-on-1, K-12, skills, music) are arrangements of seven jobs — let people in, schedule and deliver, practice, doubts, record, progress, money — not subject SKUs.

**Biology / NEET / NCERT in this repository is one worked example** of the exam-prep template. Same status as a language or music tenant. Not a product preference. Not a domain model. Do not add syllabus tables, exam-board modules, or Biology-only routes.

## Non-negotiables

1. **Tenant isolation.** Every business row carries `workspace_id`. No cross-tenant identity.
2. **Timeline is the ledger.** Modules write `timeline_events`. WhatsApp, email, SMS, and push are **delivery channels**, never the database.
3. **WhatsApp is in scope** for teacher, parent, and admin (owner). Student WhatsApp is owner-gated (default off) because that cohort is the cost spike. v1 is outbound only.
4. **Metered resources have admin caps.** WhatsApp/SMS/email sends, storage, seats, hosted minutes, later STT. Warn at 80%, block paid sends at 100% when policy is `block`. Caps throttle usage, not existence of always-on core (A1, A2, A3, G1, G2, D4, F2).
5. **Closed screen set.** Screen ids live in `catalog/screens.json` and `tutor-platform-demo.html` `S`. Never invent a screen id. Demo HTML is UI gold until a screen is `wired`, including while the demo is still incomplete. Catalog and architecture HTML must match the demo; if they disagree, update catalog/architecture (regenerate), do not add screens.
6. **No subject in the schema.** Topics hang off tenant `taxonomies` / `topics` (G3). Never `biology_chapters` or exam-board tables.
7. **Fluid UI, simple UX.** Screens grow with content. One primary action per view. WhatsApp is a per-role channel toggle, not a second inbox. Quotas live on `owner` / `subscription`.
8. **Ports at vendor edges.** Mock default in CI. Routers never call Google, Meta, or disk. Services never know HTTP.
9. **Spec-driven.** PM `/speckit.specify` + `/speckit.clarify` → Architect `/speckit.plan` + checklist + `/speckit.analyze` → tasks → **human OK** → Builder `/speckit.implement` → Tester → PM Accept. No implement before Specified.
10. **Cursor ↔ Claude Code parity.** A convention change updates both sides in the same commit (`scripts/check_agent_config_sync.py`).

## Stack (002 sim + planned production)

Next.js 15 App Router (UI, not in 002) · FastAPI `/api/v1` (002 scaffold) · PostgreSQL (models); local sim SQLite file · layered monolith + ports.
