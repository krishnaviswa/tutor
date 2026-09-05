# TutorOS

Subject-neutral remote tutoring workspace. Monorepo (app code not built yet).

> This file is the Claude Code equivalent of `.cursor/rules/project.mdc`.
> Keep in sync — see **Cursor ↔ Claude Code parity** below.

## Stack (planned)

- UI: Next.js 15 App Router, TypeScript (`frontend/` later)
- API: FastAPI, `/api/v1` (`backend/` later)
- Data: PostgreSQL (`workspace_id` on every business table)
- Auth: OTP + magic link + JWT; roles `owner` | `teacher` | `assistant` | `student` | `parent`

## Source of truth

`README.md` is the single product document. Biology / NEET / NCERT is an **example tenant**, not the domain.

Also: `tutor-platform-architecture.html`, `catalog/`, `.specify/memory/constitution.md`.

See `[AGENTS.md](AGENTS.md)` for the repo map.

## Non-negotiables

1. Subject-neutral. Topics are G3 taxonomy. No syllabus tables.
2. Timeline is the ledger. WhatsApp/email/push are channels.
3. WhatsApp outbound for teacher, parent, admin; student off unless owner-enabled.
4. QuotaGuard on metered resources. Caps throttle usage, not always-on core.
5. Closed screen set (`catalog/screens.json`). Demo HTML is UI gold until `wired`, including while incomplete. Catalog/architecture follow the demo; never invent a screen id.
6. Ports at vendor edges; mock default. Logic in services, not routers.
7. Never invent a screen id. Never commit secrets.
8. Spec-driven: no `/speckit.implement` before Specified + human OK.
9. Claude Code subagents use the project roles (product-manager, architect, tester). Spec Kit commands live in `.claude/commands/` and `.cursor/commands/`.

## Multi-agent workflow

Mirrors `.cursor/rules/agents/workflow.mdc`:

```
PM (specify + clarify) → Architect (plan + checklist + analyze) → tasks
 → human OK → Builder (implement) → Tester → PM Accept
```

Status: Draft → Specified → In Progress → Testing → Accepted.

## Cursor ↔ Claude Code parity

| This Cursor rule | Mirrors |
|---|---|
| `project.mdc` | `CLAUDE.md` (this file) |
| `backend-fastapi.mdc` | `backend/CLAUDE.md` |
| `frontend-nextjs.mdc` | `frontend/CLAUDE.md` |
| `ai-and-integrations.mdc` | `backend/app/services/CLAUDE.md` |
| `database.mdc` | `backend/app/models/CLAUDE.md` |
| `docs-and-api.mdc` | `docs/CLAUDE.md` |
| `testing.mdc` | `backend/tests/CLAUDE.md`, `frontend/CLAUDE.md` |
| `agents/workflow.mdc` | this Multi-agent workflow section |
| `agents/role-product-manager.mdc` | `.claude/agents/product-manager.md` |
| `agents/role-architect.mdc` | `.claude/agents/architect.md` |
| `agents/role-tester.mdc` | `.claude/agents/tester.md` |
| constitution | `.specify/memory/constitution.md` (same non-negotiables) |

**Sync rule:** port a convention change to every file in the pair in the same commit. `scripts/check_agent_config_sync.py`.
