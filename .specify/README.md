# Spec Kit in this repo

GitHub Spec Kit (`specify` / `/speckit.*`) is the harness. Cursor and Claude Code both run the same commands against files in git.

- Constitution: [memory/constitution.md](memory/constitution.md)
- Active feature: [feature.json](feature.json) (`featureDirectory`) — **not** the checked-out git branch
- Feature artifacts: `specs/<nnn-name>/spec.md`, `plan.md`, `tasks.md`, `checklists/`, `analyze.md`

Override the active feature with env `SPECIFY_FEATURE_DIRECTORY`.

This pass stops after specify → clarify → plan → checklist → tasks → analyze. Do not run `/speckit.implement` until the architecture HTML and plan are accepted.
