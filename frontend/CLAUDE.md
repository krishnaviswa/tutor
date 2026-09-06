# Next.js frontend

One route per catalog screen id. Demo HTML is UI gold until `wired`. Local API is FastAPI + Compose Postgres (README §1). Mirrors `.cursor/rules/frontend-nextjs.mdc` and part of `testing.mdc`.

Backend tests live in `backend/tests/` with mock vendors. pytest uses in-memory SQLite; local API work uses Compose Postgres (README §1).
