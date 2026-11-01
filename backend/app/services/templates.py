"""Named toggle-sets. Ids match the API; tool lists match the explorer presets.

Explorer keys `tutor-1on1` and `k12` are `one-on-one` and `k-12` here.
Always-on tools stay on for every set.
"""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import FeatureFlag, Workspace
from app.services.quota import ALWAYS_ON
from app.services.seed import CATALOG_MODULES

# Explorer PRESETS, copied as toggle sets. `everything` is every module in that list.
_EXAM_PREP = (
    "A1", "A2", "A3", "A5",
    "B1", "B2", "B3", "B4", "B5", "B6",
    "C1", "C2", "C3", "C4", "C5",
    "D1", "D3", "D4", "D5",
    "E1", "E2", "E3", "E5",
    "G1", "G2", "F2",
)
_ONE_ON_ONE = (
    "A1", "A2", "A3", "A5",
    "B1", "B2", "B3", "B6",
    "D2", "D4", "D5",
    "E1", "E4",
    "F1", "F3",
    "G1", "G2", "F2",
)
_K12 = (
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B6",
    "C2",
    "D1", "D2", "D4", "D5",
    "E1", "E2", "E4",
    "G1", "G2", "F2",
)
_SKILLS = (
    "A1", "A2", "A3", "A5",
    "B2", "B3", "B5", "B6",
    "C1", "C3", "C4",
    "D2", "D3", "D4", "D5",
    "E1", "E2",
    "F1", "F3",
    "G1", "G2", "F2",
)
_MUSIC = (
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3",
    "D2", "D4", "D5",
    "E4",
    "F1", "F3",
    "G1", "G2", "F2",
)
_EVERYTHING = (
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B4", "B5", "B6",
    "C1", "C2", "C3", "C4", "C5", "C6",
    "D1", "D2", "D3", "D4", "D5",
    "E1", "E2", "E3", "E4", "E5",
    "F1", "F2", "F3", "F4", "F5", "F6",
    "G1", "G2", "G3", "G4", "G5",
)

TEMPLATES = {
    "exam-prep": _EXAM_PREP,
    "one-on-one": _ONE_ON_ONE,
    "k-12": _K12,
    "skills": _SKILLS,
    "music": _MUSIC,
    "everything": _EVERYTHING,
}


def modules_for_template(kind: str) -> list[str]:
    base = TEMPLATES.get(kind)
    if base is None:
        base = list(CATALOG_MODULES)
    return sorted(set(base) | set(ALWAYS_ON))


def apply_workspace_template(db: Session, ws: Workspace, kind: str) -> list[str]:
    """Turn on this setup's tools and store the kind so a reload can show it."""
    if kind not in TEMPLATES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a tutoring setup.")
    modules = modules_for_template(kind)
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == ws.id).first()
    if flags:
        flags.modules = modules
    else:
        db.add(FeatureFlag(workspace_id=ws.id, modules=modules))
    ws.kind = kind
    return modules
