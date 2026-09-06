"""Seed CLI: python -m app.seed_cli from backend/."""

from app.db import init_db, session_factory
from app.services.seed import seed_all

if __name__ == "__main__":
    init_db()
    db = session_factory()()
    print(seed_all(db))
    db.close()
