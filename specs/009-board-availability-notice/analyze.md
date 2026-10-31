# analyze.md — 009-board-availability-notice

Read-only consistency check of spec, plan, tasks, and test plan. No application code. No implement.

**Result:** Specified. No contradiction that should bounce the spec back to Draft. Human OK is the only open gate. Assumptions in spec.md stay listed for a person; they are not silent gaps.

## Boundary

| Check | Result |
|---|---|
| Extends 007? | No. Spec records why. Plan reuses `staff_availability` and existing screens without editing 007 artifacts. |
| Extends 008? | No. 008 stays Draft billing. |
| New screen id? | None. Tasks forbid it. |
| Status | Specified in spec, plan, tasks, feature pointer. Not In Progress, Testing, or Accepted. |
| Human OK | Unchecked in tasks.md and in the checklist. Implement is blocked. |

## AC coverage

| AC | Spec | Plan | Task | Test plan |
|---|---|---|---|---|
| 1 finite page, five tools, no shapes | Epic A story 1 | Board document + toolbar | T9.2 | A1 |
| 2 pencil draws, pointer does not | story 6 | Pointer emits no strokes | T9.2 | A2 |
| 3 ten named colors | story 4 | Color enum on PUT | T9.2 | A3 |
| 4 marks on top of a placement | story 3 | Draw order | T9.1, T9.2 | A4 |
| 5 image and PDF sync both ways | story 8 | Same GET/PUT board | T9.1, T9.2 | A5 |
| 6 select/move and crop | stories 6–7 | `placements[].crop` | T9.2 | A6 |
| 7 eraser spares the file | clarification | Erases vs placements | T9.1, T9.2 | A7 |
| 8 RBAC board | story 2 | `assert_board_access` | T9.1 | A8 |
| 9 storage quota | dependencies | QuotaGuard before `local_put` | T9.1 | A9 |
| 10 two windows, same hour | story 9 | Multi-row, no UI collapse | T9.3 | B1 |
| 11 15-minute, overlap, adjacent | story 10, AC 12 | Service validation | T9.3 | B2 |
| 12 why 15 not another unit | clarification | Plan "Availability rule" | T9.3 | B2 note |
| 13 schedule gap visible | story 13 | Overlay complement | T9.3 | B3 |
| 14 student dash + read-only screens | story 12 | `teacher_windows`, student GET | T9.4 | B4 |
| 15 book in window, refuse gap, no-rows fallback | story 14 | Existing `staff_available` | T9.3 | B5 |
| 16 workspace isolation | housekeeping | RBAC | T9.3, T9.4 | B6 |
| 17 timeline + doubt-student | stories 15–17 | `doubt.answered` once | T9.5 | C1 |
| 18 in-app notice, WhatsApp off | story 18 | `deliver_in_app`, flag untouched | T9.5 | C2 |
| 19 no second event | story 16 | Idempotent transition | T9.5 | C3 |
| 20 other student / workspace | housekeeping | Isolation | T9.5 | C4 |
| 21 assistant cannot newly resolve | clarification | Roles unchanged | T9.5 | C5 |
| 22 49 ids | story 19 | Screen table | T9.7 | H1 |
| 23 prior suites, mock, live_calls | DoD | Tests section | T9.6 | H2 |
| 24 status stays Specified until Accept | DoD | Gate | gate | not a runtime test |

## Gaps considered and closed in the artifacts

- Student has no scheduling screen of their own. Plan uses `student-dash` plus read-only `schedule` and `availability`. No new id.
- Code writes `doubt_updated` today and the catalog name is `doubt.answered`. Plan uses `doubt.answered` only on the resolving transition so the ledger is not doubled.
- Availability UI collapses to one window per day. Plan calls that out as the defect T9.3 removes. The table already allows many rows.
- 007 did not pick 5 or 10 minutes. 15 is specified and justified.
- Work-log label `009` on 2026-10-30 is a different event (local complete). This directory does not claim that pass and does not revert it.

## Duplicates

- Not a second copy of 007 session states.
- Not a second copy of 008 billing.
- Not a new notification inbox. In-app delivery and `timeline` already exist.

## Underspec left on purpose

The eight assumptions at the end of spec.md (sheet for non-PDF files, no page cap, who may upload, no lasso, which teachers a student sees, stored status `answered`, one font, no undo). None of them change the screen set or the WhatsApp rule. A person can reverse them at the human-OK gate.

## Implement

Not run. Checklist items for human OK, builder, tester report, and PM Accept are unchecked.
