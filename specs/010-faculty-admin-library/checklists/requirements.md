# Requirements checklist (reviewer-owned)

Feature: `010-faculty-admin-library`. Status of the feature: **Specified**.

Unchecked items block `/speckit.implement`. This pass is planning only. The freeze is not human OK.

## Product

- [x] Frozen plan lists rows 1–21, including sunny green aerial campuses
- [x] Rows 10, 14, and 17 stay in 009 and are not rebuilt here
- [x] Teacher and faculty are one role. Faculty admin is a grant, not a login role
- [x] Profiles are slice 1 after a later human OK, and are not implemented now
- [x] Library and whiteboard stay two doors. Local upload still works. Place-on-board is optional
- [x] Boards are workspace labels. No syllabus table
- [x] Navigation is the existing shell. Theme, notices, and Profile are chrome
- [x] The only proposed screen id is `profile`, and it cannot be built until the closed set is updated
- [x] The only permissioned undo is handoff revert with faculty-admin permission
- [x] Succession transfers the faculty-admin grant, not workspace ownership
- [x] Each row names what it is tested without
- [x] Row 21 is shell atmosphere, not a new screen, and is tested without every product feature

## Architecture

- [x] plan.md names layers, screens, data, RBAC, ports, and QuotaGuard
- [x] Parallel build has three waves, one owner per file set, and sequences shared migrations
- [x] Attendance stays in Wave A because it uses the existing session record, not the profile schema
- [x] Routers do not call vendors
- [x] Mock ports only. Tests running is a later claim, not this pass

## Gate

- [ ] Human OK to implement (see tasks.md). **Open. Blocks build.**
- [ ] Builder has not started. Planning pass must not check this.
- [ ] Tester report exists. Not this pass.
- [ ] PM Accept. Not this pass.

## Catalog

- [x] Closed set stays 49 until a later build adds only `profile`
- [x] Work log has one entry per frozen row, including row 21
- [x] Product book tiles are Specified, not built
