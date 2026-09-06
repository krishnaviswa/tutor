from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal
from app.config import get_settings
from app.db import get_db
from app.models.tables import OtpChallenge, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal, identity_user, issue_session, membership_role
from app.services.internal_v2 import auth_methods, staff_allowed_modules
from app.api.v1.deps import ports_dep

router = APIRouter()


class OtpStartIn(BaseModel):
    phone: str
    workspace_id: str | None = None


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    workspace_id: str
    role: str
    challenge_id: str | None = None


class MagicIn(BaseModel):
    email: str
    workspace_id: str
    role: str


@router.post("/auth/otp/start")
def otp_start(
    body: OtpStartIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
):
    settings = get_settings()
    ch = OtpChallenge(workspace_id=body.workspace_id, phone=body.phone)
    db.add(ch)
    db.flush()
    ports.send_sms(body.phone, f"OTP {settings.otp_code}")
    return {"challenge_id": ch.id, "mock": True}


@router.post("/auth/otp/verify")
def otp_verify(body: OtpVerifyIn, db: Session = Depends(get_db)):
    settings = get_settings()
    if body.code != settings.otp_code:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "bad otp")
    if body.challenge_id:
        ch = db.get(OtpChallenge, body.challenge_id)
        if not ch or ch.phone != body.phone or ch.consumed:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "bad challenge")
        ch.consumed = 1
    user = identity_user(db, "phone", body.phone)
    role = membership_role(db, user.id, body.workspace_id, body.role)
    token = issue_session(db, user, body.workspace_id, role)
    return {"token": token, "role": role, "workspace_id": body.workspace_id}


@router.post("/auth/magic-link")
def magic_link(
    body: MagicIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
):
    user = identity_user(db, "email", body.email)
    role = membership_role(db, user.id, body.workspace_id, body.role)
    token = issue_session(db, user, body.workspace_id, role)
    ports.send_email(body.email, "Sign in", "mock magic link")
    return {"token": token, "role": role, "workspace_id": body.workspace_id, "mock": True}


@router.get("/auth/me")
def me(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    ws = db.get(Workspace, principal.workspace_id)
    return {
        "id": principal.user_id,
        "role": principal.role,
        "workspace_id": principal.workspace_id,
        "display_name": principal.display_name,
        "auth_methods": auth_methods(ws),
        "permissions": staff_allowed_modules(db, principal),
        "workspace": {"id": ws.id, "slug": ws.slug, "kind": ws.kind} if ws else None,
    }
