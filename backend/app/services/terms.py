"""Workspace terms, read from disk on every call.

No in-memory copy of the file. An edit on disk is visible on the next request
without restarting the process. The path is resolved from this module, not from
the process working directory (often ``backend/``).
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status

TERMS_RELATIVE = Path("docs") / "legal" / "terms-and-conditions.md"
_MISSING = "Terms file is not on disk."


def locate_terms_file() -> Path:
    """Walk parents of this file until the repo root (catalog/screens.json)."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "catalog" / "screens.json").is_file():
            return parent / TERMS_RELATIVE
    for parent in here.parents:
        candidate = parent / TERMS_RELATIVE
        if candidate.is_file():
            return candidate
    return here.parents[min(3, len(here.parents) - 1)] / TERMS_RELATIVE


def read_terms(path: Path | None = None) -> dict[str, str]:
    file = path if path is not None else locate_terms_file()
    try:
        markdown = file.read_text(encoding="utf-8")
        mtime = datetime.fromtimestamp(file.stat().st_mtime, tz=timezone.utc).isoformat()
    except FileNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, _MISSING) from None
    return {"markdown": markdown, "mtime": mtime}
