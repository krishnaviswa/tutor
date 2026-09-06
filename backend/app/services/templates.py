from __future__ import annotations

from app.services.quota import ALWAYS_ON
from app.services.seed import CATALOG_MODULES

TEMPLATES = {
    "exam-prep": list(CATALOG_MODULES),
    "one-on-one": list(CATALOG_MODULES),
    "k-12": list(CATALOG_MODULES),
    "skills": list(CATALOG_MODULES),
    "music": list(CATALOG_MODULES),
    "everything": list(CATALOG_MODULES),
}


def modules_for_template(kind: str) -> list[str]:
    base = TEMPLATES.get(kind) or list(CATALOG_MODULES)
    return sorted(set(base) | set(ALWAYS_ON))
