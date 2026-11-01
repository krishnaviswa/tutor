# Next.js frontend

One route per catalog screen id. Demo HTML is UI gold until `wired`. Local API is FastAPI + Compose Postgres (README §1). Mirrors `.cursor/rules/frontend-nextjs.mdc` and part of `testing.mdc`.

Backend tests live in `backend/tests/` with mock vendors. pytest uses in-memory SQLite; local API work uses Compose Postgres (README §1).

## 6 Core UX Engineering Rules

1. **One Screen, One Job:** Every screen opens with a clear `.page-toolbar` or `.sb` header stating the user's job in plain human language—zero architectural or internal jargon (`"Always-on core"`, `"Timeline is the ledger"`, `"mock storage"`, spec numbers).
2. **Progressive Disclosure:** Lead with the live table, queue, or status overview; place creation/write forms behind a `+ New ...` toggle button or in a secondary right-hand column.
3. **Constrained Choices Over Free Text:** Prefer `<select>` dropdowns, segmented pills, and 1-click preset templates over bare `<input>` fields wherever options are known or enumerable.
4. **Clear Workflow Next-Step Bridges:** Every dashboard, preparation, or completion state includes 1-click links to the natural next screen in the workflow.
5. **Consequence Preview Before Financial / Ledger Actions:** Show a clear human-readable summary of pack-hour, attendance, invoice, or payout impact before committing a ledger or payment action.
6. **Human Data Formatting:** Never render raw UUIDs, raw cents, or `snake_case` keys—always resolve human names, format currency in `₹` (`rupees()`), and use human status badges.
