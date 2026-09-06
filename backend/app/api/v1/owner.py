from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import QuotaPolicy, UsageMeter, Workspace
from app.services.auth import Principal
from app.services import quota as quota_svc

router = APIRouter()


class QuotaPatch(BaseModel):
    meter_key: str
    cap: int | None = None
    policy: str | None = None


class PauseIn(BaseModel):
    paused: bool = True



@router.get("/owner/console")
def owner_console(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    ws = db.get(Workspace, principal.workspace_id)
    meters = quota_svc.snapshot(db, principal.workspace_id)
    return {
        "workspace": {"id": ws.id, "name": ws.name, "slug": ws.slug} if ws else None,
        "usage": meters,
        "always_on": list(quota_svc.ALWAYS_ON),
    }


@router.get("/usage")
def usage(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    return {"meters": quota_svc.snapshot(db, principal.workspace_id)}


@router.get("/billing/subscription")
def subscription(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    meters = quota_svc.snapshot(db, principal.workspace_id)
    blocked = [m for m in meters if m["block"]]
    warned = [m for m in meters if m["warn"]]
    return {"meters": meters, "warn": warned, "block": blocked}


@router.patch("/billing/quotas")
def patch_quotas(
    body: QuotaPatch,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    m = quota_svc.meter_row(db, principal.workspace_id, body.meter_key)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "meter")
    if body.cap is not None:
        m.cap = body.cap
    if body.policy is not None:
        if body.policy not in ("warn", "block", "allow_overage"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "policy")
        pol = quota_svc.policy_row(db, principal.workspace_id, body.meter_key)
        if pol:
            pol.policy = body.policy
        else:
            db.add(QuotaPolicy(workspace_id=principal.workspace_id, meter_key=body.meter_key, policy=body.policy))
    db.flush()
    return {"meters": quota_svc.snapshot(db, principal.workspace_id)}


@router.post("/billing/whatsapp-pause")
def whatsapp_pause(
    body: PauseIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    ws = db.get(Workspace, principal.workspace_id)
    if not ws:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "workspace")
    ws.whatsapp_paused = 1 if body.paused else 0
    db.flush()
    return {"whatsapp_paused": bool(ws.whatsapp_paused)}
