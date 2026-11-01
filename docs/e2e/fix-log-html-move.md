# Fix log: product book HTML move

Date: 2026-11-01. Layout only. Screen ids, catalog status values, API routes, and UI copy were not changed. No commit.

## Folder

`product-book/` at the repo root. Basenames are unchanged. Demo, architecture, explorer, work log, and role HTML stay separate files. They were not merged into the hub.

## Files moved (19)

Tracked files were moved with `git mv`.

- `product-viewer.html` (hub)
- `tutor-platform-demo.html` (UI gold)
- `tutor-platform-architecture.html`
- `tutor-platform-explorer.html`
- `work-log.html`
- `tutor-platform-role-admin.html`
- `tutor-platform-role-faculty.html`
- `tutor-platform-role-parent.html`
- `tutor-platform-role-student.html`
- `tutor-platform-role-system.html`
- `plan-viewer.html`
- `plan-functional.html`
- `plan-technical.html`
- `plan-sequence.html`
- `seed-map.html`
- `density-map.html`
- `billing-subscription-plan.html`
- `integrations-backlog-and-golden-path.html`
- `tutor-loop-ui-kit.html`

Left where they were: `docs/**/*.html` (runbooks and walkthroughs) and Playwright/e2e report HTML.

## Path fixes inside the book

Sibling HTML links stay as basenames (`href="tutor-platform-demo.html"`), so links from `product-book/` still resolve.

Outbound `href` and `src` values that pointed at the repo root now use `../`:

- `../catalog/hub-chrome.js` and `../catalog/embed.js`
- `../README.md`, `../AGENTS.md`, `../tutor-platform-blueprint.md`
- `../specs/...`, `../docs/...`, `../backend/README.md`, `../catalog/screens.json`

That attribute fix was applied to 17 of the 19 files. `plan-viewer.html` only links to `product-viewer.html`. `tutor-loop-ui-kit.html` only loads fonts.

Role HTML received only that script-src prefix (`catalog/hub-chrome.js` → `../catalog/hub-chrome.js`), the same change as the demo. Their screen bodies were not rewritten and were not regenerated.

A second pass at the end found no product-book HTML back at the repo root, so nothing had to be moved again.

## Reference files updated

Repo-root and docs paths now use `product-book/<file>.html`.

- `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/CLAUDE.md`
- `tutor-platform-blueprint.md`, `video-and-transcript-options.md`
- `.cursor/rules/project.mdc`, `.cursor/rules/docs-and-api.mdc`, `.cursor/rules/agents/workflow.mdc`
- `.specify/memory/constitution.md`
- `catalog/README.md`
- `catalog/embed.js` — catalog note sentence only (`generated from product-book/tutor-platform-demo.html`). Screen status was not edited. `catalog/screens.json` was not edited.
- `scripts/build_catalog.py` — demo path and the note the next catalog build writes
- `scripts/build_role_html.py` — reads the demo from `product-book/` and writes `product-book/tutor-platform-role-*.html`
- `scripts/check_architecture_parity.py` — filesystem reads only. Checks that look for same-folder link text still use the basename.
- `scripts/mark_003_hub_tiles.py`
- `backend/tests/test_walkthrough.py` — comment path only
- Specs: `specs/001-platform-architecture/plan.md`, `specs/001-platform-architecture/spec.md`, `specs/002-sim-spine/spec.md`, `specs/003-catalog-complete/` (analyze, plan, spec, tasks, test-report, checklists/requirements), `specs/004-wire-demo-ui/spec.md`, `specs/005-dashboard-density/` (plan, spec, tasks), `specs/006-internal-v2/tasks.md`, `specs/007-sessions-timetable/` (plan, spec, tasks), `specs/008-billing-v2/spec.md`, `specs/009-board-availability-notice/` (plan, tasks, checklists/requirements), `specs/010-faculty-admin-library/spec.md`

`specs/005-dashboard-density/plan.md` keeps a real relative link: `../../product-book/seed-map.html`.

README was re-read at the end. Every HTML link in it already uses `product-book/`.

## Intentionally left

- Same-folder links and basename mentions inside the book (work-log sentences, code tags, hash routes such as `tutor-platform-demo.html#/`).
- `catalog/hub-chrome.js` still has `product: "product-viewer.html"`. Book pages load that script, and the browser resolves the value from `product-book/`, not from `catalog/`.
- The generator banner still says `GENERATED from tutor-platform-demo.html`, so it matches the role files already on disk.
- Parity still searches the HTML for basename link text (`tutor-platform-demo.html`, `product-viewer.html`, `catalog/hub-chrome.js`). Those strings are still present (`../catalog/hub-chrome.js` contains `catalog/hub-chrome.js`).
- Role files were not regenerated. `python scripts/check_architecture_parity.py` fails because each role file is behind the demo (the demo `S` map includes `profile` and the role copies do not). That drift was already there. Regenerating would rewrite screen content, which this move does not do. The next `python scripts/build_role_html.py` writes into `product-book/`.
- `docs/e2e/fix-log-content.md` still names `tutor-platform-role-*.html`. That file is owned by another agent and was not edited.
- `docs/e2e/defect-report.md` and `docs/e2e/fix-log-auth.md` were not edited. They do not name these HTML files.
- Frontend app code, backend auth, and `catalog/screens.json` status fields were not edited.

## Verification

- Repo root: no `*.html`.
- Search for markdown links `](product-viewer.html)`, `](tutor-platform-demo.html)`, `](work-log.html)`, `](tutor-platform-architecture.html)`, `](density-map.html)`, `](seed-map.html)`, `](plan-viewer.html)`: no matches.
- 42 `../` targets from the book exist on disk. None were missing.
- No `src="catalog/` or `href="specs/` (without `../`) left in `product-book/`.
- Local static server `http://127.0.0.1:8766/`:
  - `product-book/product-viewer.html` 200
  - `product-book/tutor-platform-demo.html` 200
  - `product-book/tutor-platform-architecture.html` 200
  - `product-book/tutor-platform-explorer.html` 200
  - `product-book/work-log.html` 200
  - `product-book/tutor-platform-role-faculty.html` 200
  - `catalog/hub-chrome.js` 200
  - `catalog/embed.js` 200
- The hub markup still points at demo, architecture, explorer, and work log by basename. The faculty role file points back at `product-viewer.html` and loads `../catalog/hub-chrome.js`.
- IDE browser tools did not register (`cursor-ide-browser` server not found, three attempts), so the links were not clicked in a browser tab. The HTTP check above is the substitute. Playwright was not run.
- `check_architecture_parity.py` result at move time: fail only on the five role files being out of sync with the demo, as noted above. Hub, architecture, and demo path checks passed.

## Follow-up

The role files were generated copies, already missing the demo’s `profile` screen. After the move, `python scripts/build_role_html.py` rewrote the five `product-book/tutor-platform-role-*.html` files from the demo. `python scripts/check_architecture_parity.py` then printed `architecture-parity: OK (50 screens)`.
