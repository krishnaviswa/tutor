"""Seed CLI. From backend/: python -m app.seed_cli --reset"""

from __future__ import annotations

import argparse
import json

from app.db import init_db, session_factory
from app.services.seed import reset_and_seed, seed_all


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed TutorOS tenants (Compose Postgres or DATABASE_URL).")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop every table, recreate, then seed. Wipes local app data.",
    )
    args = parser.parse_args()
    init_db()
    db = session_factory()()
    try:
        out = reset_and_seed(db) if args.reset else seed_all(db)
        print(json.dumps(out, default=str, indent=2))
    finally:
        db.close()


if __name__ == "__main__":
    main()
