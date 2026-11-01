from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import QuotaPolicy, StaffMembership, UsageMeter, User, Workspace
from app.services import billing
from app.services.auth import Principal
from app.services import quota as quota_svc
from app.services.internal_v2 import MODULE_LABELS, TEACHING_MODULES, meta_of, set_staff_modules
from app.services.progress import owner_console as owner_density_console

router = APIRouter()


class QuotaPatch(BaseModel):
    meter_key: str
    cap: int | None = None
    policy: str | None = None


class PauseIn(BaseModel):
    paused: bool = True


class TierIn(BaseModel):
    tier: str


class ModulesIn(BaseModel):
    modules: list[str]



@router.get("/owner/faculty-access")
def faculty_access(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    rows = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.role == "teacher",
        )
        .all()
    )
    people = []
    for row in rows:
        user = db.get(User, row.user_id)
        chosen = meta_of(row).get("modules")
        people.append(
            {
                "user_id": row.user_id,
                "name": user.display_name if user else row.user_id,
                "modules": list(chosen) if chosen else list(TEACHING_MODULES),
            }
        )
    return {
        "features": [{"id": key, "label": MODULE_LABELS[key]} for key in TEACHING_MODULES],
        "teachers": people,
    }


@router.put("/owner/faculty-access/{user_id}")
def put_faculty_access(
    user_id: str,
    body: ModulesIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    modules = set_staff_modules(db, principal.workspace_id, user_id, body.modules)
    return {"user_id": user_id, "modules": modules}


@router.get("/owner/console")
def owner_console(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    body = owner_density_console(db, principal)
    body["usage"] = quota_svc.snapshot(db, principal.workspace_id)
    body["always_on"] = list(quota_svc.ALWAYS_ON)
    return body


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
    sub = billing.ensure_subscription(db, principal.workspace_id)
    return {"meters": meters, "warn": warned, "block": blocked, **billing.subscription_public(db, sub)}


@router.post("/billing/subscription/tier")
def change_tier(
    body: TierIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.change_tier(db, principal.workspace_id, principal.user_id, body.tier)
    return billing.subscription_public(db, row)


@router.post("/billing/subscription/cancel")
def cancel_subscription(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.cancel_subscription(db, principal.workspace_id, principal.user_id)
    return billing.subscription_public(db, row)


@router.post("/billing/subscription/pause")
def pause_subscription(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.pause_subscription(db, principal.workspace_id, principal.user_id)
    return billing.subscription_public(db, row)


@router.post("/billing/subscription/resume")
def resume_subscription(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.resume_subscription(db, principal.workspace_id, principal.user_id)
    return billing.subscription_public(db, row)


@router.post("/billing/renewals")
def run_renewals(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    return billing.run_renewals(db, principal.workspace_id, principal.user_id)


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
