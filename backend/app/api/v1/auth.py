from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, effective_workspace_modules
from app.config import get_settings
from app.db import get_db
from app.models.tables import Identity, OtpChallenge, User, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import (
    SESSION_COOKIE,
    Principal,
    identity_user,
    issue_session,
    membership_role,
    password_matches,
    role_in_workspace,
)
from app.services.internal_v2 import auth_methods, staff_allowed_modules
from app.api.v1.deps import ports_dep

router = APIRouter()
_COOKIE_MAX_AGE = 14 * 24 * 60 * 60


def _attach_session(response: Response, request: Request, token: str) -> None:
    """Browser sessions ask for the httpOnly cookie. API tests keep the JSON token."""
    if request.headers.get("x-tutoros-cookie") != "1":
        return
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
    )


class OtpStartIn(BaseModel):
    phone: str
    workspace_id: str | None = None


class OtpVerifyIn(BaseModel):
    phone: str
    code: str
    workspace_id: str
    role: str
    challenge_id: str | None = None


class PasswordIn(BaseModel):
    username: str
    password: str
    workspace_id: str


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
def otp_verify(body: OtpVerifyIn, request: Request, response: Response, db: Session = Depends(get_db)):
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
    _attach_session(response, request, token)
    return {"token": token, "role": role, "workspace_id": body.workspace_id}


@router.post("/auth/password")
def password_login(body: PasswordIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ident = (
        db.query(Identity)
        .filter(
            Identity.kind == "username",
            Identity.value == body.username.strip(),
            Identity.workspace_id == body.workspace_id,
        )
        .first()
    )
    user = db.get(User, ident.user_id) if ident else None
    if not user or not password_matches(user.password_hash or "", body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown username or password")
    role = role_in_workspace(db, user.id, body.workspace_id)
    token = issue_session(db, user, body.workspace_id, role)
    _attach_session(response, request, token)
    return {"token": token, "role": role, "workspace_id": body.workspace_id}


@router.post("/auth/magic-link")
def magic_link(
    body: MagicIn,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
):
    user = identity_user(db, "email", body.email)
    role = membership_role(db, user.id, body.workspace_id, body.role)
    token = issue_session(db, user, body.workspace_id, role)
    ports.send_email(body.email, "Sign in", "mock magic link")
    _attach_session(response, request, token)
    return {"token": token, "role": role, "workspace_id": body.workspace_id, "mock": True}


@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="lax")
    return {"ok": True}


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
        "workspace_modules": sorted(effective_workspace_modules(db, principal.workspace_id)),
        "workspace": {"id": ws.id, "slug": ws.slug, "kind": ws.kind} if ws else None,
    }
