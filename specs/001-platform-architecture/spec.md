# spec.md — 001-platform-architecture

| Field | Value |
|---|---|
| **Status** | Specified |
| **Role** | PM (specify + clarify) |
| **Feature directory** | `specs/001-platform-architecture` |

## Why

Before any app code, TutorOS needs a shared map so Cursor and Claude Code cannot invent screens, subjects, or APIs. Humans must be able to click from entry → UI → a screen → follow the call down the stack.

## User stories

1. **As** anyone opening the repo, **I want** README to say TutorOS is subject-neutral and Biology is an example, **so that** I do not build a NEET-only product.
2. **As** an architect, **I want** a swim-lane HTML of layers and all 47 demo screens, **so that** I can review the system without code.
3. **As** a PM, **I want** Spec Kit + role gates, **so that** features are confirmed before implement.
4. **As** an owner, **I want** WhatsApp notifications for teacher, parent, and admin, **so that** changes reach people without WhatsApp becoming the database.
5. **As** an owner / platform operator, **I want** quotas on expensive resources, **so that** overuse cannot silently blow cost.

## Acceptance criteria

1. **Given** the repo README, **when** I read the first 40 lines, **then** it states subject-neutral and that Biology/NEET/NCERT is an example tenant.
2. **Given** `tutor-platform-architecture.html`, **when** I click Start → a role → a domain → a screen → Follow the call, **then** I see APIs, middleware, ports/entities, and Back returns one step.
3. **Given** the architecture Start view, **when** I look at example workspaces, **then** I see at least coaching, languages, and music — not Biology as the product.
4. **Given** `catalog/screens.json`, **when** compared to demo `S`, **then** the 47 ids match, and each screen has Owner / Who / Why / How / When copied from demo `WHY`.
5. **Given** WhatsApp in the plan, **when** I read role lists, **then** teacher, parent, and admin are wired; student is owner-gated default off.
6. **Given** admin cost controls, **when** I open Follow the call on `subscription` / owner notes, **then** QuotaGuard warn/block is described on existing screens (no 48th screen).
7. **Given** Cursor and Claude Code config, **when** `check_agent_config_sync.py` runs on this branch vs main, **then** it passes (pairs created together).
8. **Given** `check_architecture_parity.py`, **when** run, **then** it exits 0.
9. **Given** this feature, **when** someone runs `/speckit.implement`, **then** it is refused until a human accepts this pack.
10. **Given** a disagreement between demo HTML and architecture HTML, **when** catalog is rebuilt, **then** architecture follows the demo (demo is UI gold and incomplete; no new screen ids).
11. **Given** role files, **when** `scripts/build_role_html.py` runs, **then** five children exist (`student` `faculty` `admin` `parent` `system`) as 1:1 copies with `ROLE_ONLY` set — not mutually exclusive features.

## Out of scope

- Next.js / FastAPI app code, Docker, Figma, live vendors
- Inbound WhatsApp replies
- Implementing any of the 47 screens as React
- Copying MerchantHub product features
- Copying six-track completeness onto role pages (later; still no new ids)
- Persisting typed demo input into HTML files

## Clarify (closed)

- Biology is example only → README disclaimer + examples folder.
- WhatsApp is a channel, in scope for teacher/parent/admin.
- Spec Kit maps onto PM/Architect/Builder/Tester; Tester is extra.
- This pass stops before implement.
- Demo is incomplete: focused templates may omit some spine screens. `staff-login` is on 1-on-1, K-12, Skills, Music, and Everything; Exam-prep omits it. Architecture documents remaining gaps; it does not invent screens.

## DoD (PM)

- [x] AC above
- [ ] Human walks the HTML (reviewer)
- [x] No `/speckit.implement` in this pass
