# analyze.md — 010-faculty-admin-library

Read-only consistency check of the frozen table, plan, tasks, and test plan. No application code. No implement.

**Result:** Specified. The frozen table is the plan. Human OK is the only open gate. Freezing the plan does not check that gate.

## Boundary

| Check | Result |
|---|---|
| Extends 007, 008, or 009? | No. Rows 10, 14, and 17 stay specified in 009. 010 cites them. |
| New screen id in this pass? | None. `profile` is proposed and blocked on the closed set. Row 21 is not a screen. |
| Status | Specified. Not In Progress, Testing, or Accepted. |
| Human OK | Unchecked. |
| Row count | 21 in spec, tasks, and test plan. |
| Parallel waves | Described in plan.md. Not started. |

## Row coverage

| Row | Spec | Task | Test plan | Wave |
|---|---|---|---|---|
| 1 Own profile | Frozen row 1, AC 1 | T10.1 | Row 1 | B, profile stream |
| 2 Profile step-up | Row 2, AC 2 | T10.1 | Row 2 | B, same stream (shared profile model) |
| 3 Who sees what | Row 3, AC 3 | T10.1 | Row 3 | B, same stream |
| 4 Faculty admin edits a teacher | Row 4, AC 4 | T10.4 | Row 4 | B, after profile schema |
| 5 Succession | Row 5, AC 5 | T10.4 | Row 5 | B, same grant stream |
| 6 Faculty admin role | Row 6, AC 6 | T10.4 | Row 6 | B, same grant stream |
| 7 Contact provision | Row 7, AC 7 | T10.4 | Row 7 | B, same grant stream |
| 8 Student attendance | Row 8, AC 8 | T10.8 | Row 8 | A |
| 9 Teacher attendance | Row 9, AC 9 | T10.8 | Row 9 | A, same session record |
| 10 Intra-hour availability | Pointer to 009 | Not a 010 task | Row 10 | A, 009 files only |
| 11 Student changes a 1-on-1 | Row 11, AC 11 | T10.11 | Row 11 | B |
| 12 Teacher hands off | Row 12, AC 12 | T10.12 | Row 12 | C |
| 13 Revert a handoff | Row 13, AC 13 | T10.12 | Row 13 | C, same handoff files |
| 14 Paint whiteboard | Pointer to 009 | Not a 010 task | Row 14 | A, 009 files only |
| 15 Content library | Row 15, AC 15 | T10.15 | Row 15 | A |
| 16 Place library item | Row 16, AC 16 | T10.16 | Row 16, I1 | C |
| 17 Doubt clarified | Pointer to 009 | Not a 010 task | Row 17, I3 | A, 009 files only |
| 18 Feedback | Row 18, AC 18 | T10.18 | Row 18 | B |
| 19 Theme | Row 19, AC 19 | T10.19 | Row 19 | A |
| 20 Notifications | Row 20, AC 20 | T10.20 | Row 20, I3 | B, after theme merges |
| 21 Sunny green aerial campuses | Row 21, AC 21 | T10.21 | Row 21 | A, assets only |

## Adjustments the constitution required

- Faculty admin is a grant. The closed role list has no sixth login role, and the catalog word faculty is the teaching shell.
- `profile` is named only as a catalog addition. It is not in `catalog/screens.json` yet, so it is not buildable in this pass.
- Board names and grade are tenant labels on taxonomy and on the profile. They are not syllabus or grade tables.
- Row 21 does not add a screen. The current rail uses close architecture, including a chapel. The plan swaps those frames later. This pass does not fetch images.

## Isolation

Every test-plan row states its "Tested without" column. Theme (row 19) and campuses (row 21) are required to pass alone, and other rows are required to pass without them. Shared schema changes are sequenced: attendance's session-record field in Wave A, profile schema at the start of Wave B, faculty-admin grant tables after that schema exists, teacher-profile edits after the profile service is released.

No contradiction should return the spec to Draft.
