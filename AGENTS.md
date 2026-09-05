# TutorOS — Agent guide

`[README.md](README.md)` is the single product map. **Biology / NEET / NCERT is an example tenant pack**, not the product. See `docs/examples/neet-biology/`.

## Start here

| You need | Read |
|---|---|
| Product + architecture | README.md |
| System map (clickable) | tutor-platform-architecture.html |
| Screen / API / entity contracts | catalog/*.json |
| Governing rules | .specify/memory/constitution.md |
| In-flight feature | path in `.specify/feature.json` — not the git branch |
| Cursor ↔ Claude pairing | CLAUDE.md |

## Spec Kit

Commands: `/speckit.constitution`, `/speckit.specify`, `/speckit.clarify`, `/speckit.plan`, `/speckit.checklist`, `/speckit.tasks`, `/speckit.analyze`, `/speckit.implement`, `/speckit.converge`.

Sequence: PM specify+clarify → Architect plan+checklist+analyze → tasks → **human OK** → Builder implement → Tester → PM Accept.

**Do not `/speckit.implement` for 001-platform-architecture** until the architecture HTML and plan are accepted.

Active feature directory: `.specify/feature.json`. `git checkout` does not change it. Override: `SPECIFY_FEATURE_DIRECTORY`.

## Cursor ↔ Claude Code

Every `.cursor/rules/*.mdc` has a Claude Code mirror. Change both in the same commit. Enforced by `scripts/check_agent_config_sync.py`.

## Layout (this pass)

- `catalog/` — screens, modules, APIs, entities, ports
- `specs/` — Spec Kit feature artifacts
- `docs/examples/` — not requirements
- `scripts/` — catalog build + parity
- No `frontend/` or `backend/` app yet (stub CLAUDE.md files exist so pairing is valid)
