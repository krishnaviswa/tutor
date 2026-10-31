# Requirements checklist (reviewer-owned)

Feature: `009-board-availability-notice`. Status of the feature: **Specified**.

Unchecked items block `/speckit.implement`. This pass is planning only.

## Product

- [x] All three epics are in spec.md (paint board, intra-hour availability, doubt clarified)
- [x] Stories cover owner, teacher, assistant, student, and parent where the job touches them
- [x] Acceptance criteria are numbered and testable
- [x] Subject-neutral. Biology / NEET is not a requirement
- [x] No new screen id. Ids cited are in `catalog/screens.json`
- [x] Timeline is the ledger for the clarified doubt. WhatsApp is a channel
- [x] Student WhatsApp stays off unless the owner already enabled it
- [x] 15-minute grid is explicit, with the reason 007 did not already choose another sub-hour unit
- [x] Out of scope lists infinite canvas, shape library, new screens, self-serve booking, and 008 billing
- [x] Boundary says this is not an extension of 007 or 008

## Architecture

- [x] plan.md names layers, existing API paths, RBAC, data, ports, QuotaGuard
- [x] No new table and no new `/api/v1` path id
- [x] Storage quota gates file placement. Board sync is not metered
- [x] Routers do not call vendors or disk
- [x] Mock ports only. `live_calls == 0` is a later test, not a claim that tests ran

## Gate

- [ ] Human OK to implement (see tasks.md). **Open. Blocks build.**
- [ ] Builder has not started. Planning pass must not check this.
- [ ] Tester report exists and maps executed results. Not this pass.
- [ ] PM Accept. Not this pass.

## Catalog

- [x] Planned screen set is the existing 49
- [x] Work log has one entry per epic (see work-log.html)
- [x] Product book tile is Specified, not built
