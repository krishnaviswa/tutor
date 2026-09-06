# analyze.md — 002-sim-spine

Read-only consistency check of spec / plan / checklist / catalog. **Do not implement.** `tasks.md` now exists; implement still needs **human OK**.

| Check | Result |
|---|---|
| Spec stories (13) vs AC (16) | Pass — slice is spine + seed + auth stub + roster/cohort + record write + timeline + parent read + quota read |
| Screen ids | Pass — plan uses ids from `catalog/screens.json` only (47). No 48th screen |
| API ids | Pass — plan uses existing `catalog/apis.json` paths only (84 planned). No invented `/sim/*` |
| Entities | **Resolved** — 18 catalog spine tables in 002; `usage_meters` + `quota_policies` **promoted into 002 models** for AC 12 (option a). Catalog `tier` still `later` until implement/accept updates README §5 + `entities.json` |
| Subject neutrality | Pass — `taxonomies` / `topics`; Biology not required |
| WhatsApp | Pass — channel after timeline; teacher, parent, admin; student gated default off; outbound; mock |
| QuotaGuard | Pass — persist meters; 80% warn / 100% block paid send; always-on core stays on |
| Parent hub vs later tables | **Resolved in plan** — `practice-result`, `payments`, `messages` (and `reports`, `notif-prefs`) keep catalog screen ids; payloads empty/stub; no fake screens; no full practice/billing |
| Engine | Pass — not a product AC; plan picks SQLite file default + Postgres-shaped SQLAlchemy; optional Postgres |
| 001 vs 002 | Pass — 001 not rewritten; 002 is first runnable slice |
| Ports | Pass — mock default; storage local |
| Frontend | Pass — not required; demo remains gold |
| Implement gate | Pass — plan refuses implement until tasks + **human OK** |
| Spec vs catalog quota contradiction | **Accepted** — spec AC 5/12 need persisted quotas; catalog lists meters as later. Plan option (a), not JSON-in-flags |
| Spec Status | Set to **Specified** after this analyze (no blocking contradiction left in artifacts) |

## Gaps that do **not** block Specified

These remain risks for humans and for Builder after OK:

1. **001 HTML pack is not formally accepted.** Spec Why already says this. 002 must not treat architecture HTML as signed-off production UI. Optional live badge is extra.
2. **Parent screens empty.** AC 11 says the parent can *open* hub children; later entities are not in 002. Reviewers must not interpret empty `attempts` / `invoices` / `messages` as a failed AC if isolation and stub contracts hold.
3. **Quota entity promotion.** Catalog and README §5 still say meters are later. Implement PR (after human OK) should bump `usage_meters` and `quota_policies` to spine (or a documented “sim-spine” note) in the same change as models — not invent new ids.
4. **No `enrollments` API id.** Roster/cohort APIs must persist `enrollments`. Easy to miss in tasks.
5. **`users` vs `workspace_id`.** Constitution says every business row is workspace-scoped. Plan: JWT binds one workspace; memberships/students/links carry `workspace_id`. Reviewer should confirm person-level `users` does not leak tenant B data.
6. **Demo incomplete** (exam-prep omits `staff-login` by design; other spine screens may sit only on Everything). 002 must not invent screens to fill tracks.
7. **`tasks.md` written** (`specs/002-sim-spine/tasks.md`). Remaining implement blockers: checklist human boxes + human OK.
8. **Assistant PATCH record.** Plan defaults teaching write to teacher + owner. Spec story 9 is roster, not record. Fine unless PM expands later.

## Gaps that would have blocked Specified (none remaining)

- Inventing APIs or screens — avoided.
- Skipping human OK — called out in plan and checklist (unchecked).
- Dual quota storage (flags vs tables) — chose promotion (a).
- Requiring Next.js for all 47 — out of scope.

## Verdict

Architect artifacts are **clean enough for Status = Specified**. Implement stays **blocked** until checklist reviewer boxes and human OK.
