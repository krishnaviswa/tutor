from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, require_roles
from app.db import get_db
from app.models.tables import FeatureFlag
from app.services.auth import Principal

router = APIRouter()

DEFAULT_PREFS = {
    "teacher": {"whatsapp": True, "email": True, "push": True},
    "parent": {"whatsapp": True, "email": True, "push": True},
    "admin": {"whatsapp": True, "email": True, "push": True},
    "student": {"whatsapp": False, "email": False, "push": True},
}


class PrefsIn(BaseModel):
    prefs: dict


@router.get("/reports")
def reports(principal: Principal = Depends(require_roles("owner", "teacher", "parent"))):
    return []


@router.get("/attempts/{attempt_id}")
def attempts(attempt_id: str, principal: Principal = Depends(current_principal)):
    return {"id": attempt_id, "empty": True}


@router.get("/invoices/mine")
def invoices_mine(principal: Principal = Depends(require_roles("owner", "parent", "student"))):
    return []


@router.get("/threads")
def threads(principal: Principal = Depends(current_principal)):
    return []


@router.get("/notifications/prefs")
def get_prefs(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == principal.workspace_id).first()
    extra = {}
    if flags and isinstance(flags.modules, dict):
        extra = flags.modules.get("_notif_prefs") or {}
    prefs = {**DEFAULT_PREFS, **extra} if extra else DEFAULT_PREFS
    return prefs


@router.put("/notifications/prefs")
def put_prefs(
    body: PrefsIn,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
):
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == principal.workspace_id).first()
    if flags:
        # Keep module list; echo prefs. No notification_prefs table in 002.
        return {**DEFAULT_PREFS, **(body.prefs or {})}
    return DEFAULT_PREFS
