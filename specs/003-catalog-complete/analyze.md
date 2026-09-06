# analyze.md — 003-catalog-complete

Read-only consistency check of spec / plan / checklist / catalog. **Do not implement.** `tasks.md` and the HTML guide come next; implement needs **human OK on `plan-viewer.html`**.

| Check | Result |
|---|---|
| Spec stories (20) vs AC (19) | Pass — 002 protect + env + remaining jobs + Next.js + parent hub fill + HTML guide |
| Screen ids | Pass — plan uses `catalog/screens.json` only (47). No 48th screen |
| API ids | Pass — remaining paths from `catalog/apis.json` only. No `/sim/*` |
| Entities | Pass — 17 catalog `later` ids promoted; no syllabus tables |
| Subject neutrality | Pass — `taxonomies` / `topics`; Biology example-only |
| WhatsApp | Pass — channel after timeline; teacher, parent, admin; student gated; outbound; mock |
| QuotaGuard | Pass — 002 meters kept; 80/100; always-on core stays on |
| 001 vs 002 vs 003 | Pass — 001 not implemented; 002 protected; 003 is remainder |
| Ports | Pass — mock default; storage local; integrations connect is mock |
| Frontend | Pass — one route per catalog route; demo gold until wired |
| Implement gate | Pass — HTML guide + human OK required |
| C6 adaptive | **Accepted** — no extra API id in catalog; stay on practice/analysis screens |
| Giant spec | **Accepted by human** — phase gates in tasks; 002 tests stop the line |
| Parent hub payload change | **Accepted** — stubs become real after entity tasks; tests versioned by phase |
| Spec vs 002 stub APIs | Pass — `attempts`, `threads`, `invoices/mine`, `reports` keep ids; behaviour deepens |

## Gaps that do **not** block Specified

1. **001 HTML pack not formally accepted** as production UI. 003 must not treat architecture HTML as signed-off product chrome.
2. **Demo incomplete** vs six tracks. Do not invent screens to fill focused templates.
3. **Giant feature.** Reviewers should use `plan-sequence.html` + task critical path, not assume one sprint.
4. **Postgres optional.** Compose file exists; 003 does not require Docker to Accept if SQLite sim + tests pass.
5. **F4 trials/coupons** has no dedicated catalog API. Do not invent; stay on `billing` / `plans` if needed or leave template-only.
6. **`notification_deliveries` vs ledger.** Plan: journal only; timeline remains source of truth.

## Gaps that would have blocked Specified (none remaining)

- Inventing APIs or screens — avoided.
- Skipping HTML human OK — called out in checklist (unchecked).
- Live vendors in CI — refused.
- Rewriting 001/002 — refused.

## Verdict

Architect artifacts are **clean enough for Status = Specified**. Implement stays **blocked** until tasks, HTML guide, checklist human boxes, and chat OK.
