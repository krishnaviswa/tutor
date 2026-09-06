from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tables import FeatureFlag, User, Workspace
from app.services.auth import Principal, decode_jwt
from app.services.internal_v2 import branding_of, staff_allowed_modules
from app.services.quota import ALWAYS_ON

MODULE_FOR_PATH_PREFIX = (
    ("/api/v1/students", "A5"),
    ("/api/v1/cohorts", "A5"),
    ("/api/v1/parent", "A4"),
    ("/api/v1/parent-links", "A4"),
    ("/api/v1/sessions", "B1"),
    ("/api/v1/join", "B2"),
    ("/api/v1/content", "B5"),
    ("/api/v1/assignments", "B6"),
    ("/api/v1/questions", "C1"),
    ("/api/v1/practice-sets", "C2"),
    ("/api/v1/attempts", "C4"),
    ("/api/v1/tests", "C3"),
    ("/api/v1/analysis", "C5"),
    ("/api/v1/doubts", "D1"),
    ("/api/v1/threads", "D2"),
    ("/api/v1/announcements", "D3"),
    ("/api/v1/notifications", "D5"),
    ("/api/v1/me/dashboard", "E1"),
    ("/api/v1/teacher/dashboard", "E2"),
    ("/api/v1/reports", "E4"),
    ("/api/v1/backlog", "E5"),
    ("/api/v1/plans", "F1"),
    ("/api/v1/invoices", "F1"),
    ("/api/v1/payments", "F3"),
    ("/api/v1/payouts", "F5"),
    ("/api/v1/audit", "F6"),
    ("/api/v1/data-export", "F6"),
    ("/api/v1/templates", "G2"),
    ("/api/v1/automation-rules", "G4"),
    ("/api/v1/integrations", "G5"),
    ("/api/v1/owner", "F2"),
    ("/api/v1/usage", "F2"),
    ("/api/v1/billing", "F2"),
)


def ports_dep(request: Request):
    return request.app.state.ports


def current_principal(
    request: Request,
    db: Session = Depends(get_db),
    authorization: Annotated[str | None, Header()] = None,
) -> Principal:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "sign in")
    payload = decode_jwt(authorization.split(" ", 1)[1].strip())
    user = db.get(User, payload["sub"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "unknown user")
    principal = Principal(
        user_id=user.id,
        workspace_id=payload["workspace_id"],
        role=payload["role"],
        display_name=user.display_name,
    )
    request.state.principal = principal
    _g1(db, request.url.path, principal)
    return principal


def _g1(db: Session, path: str, principal: Principal) -> None:
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == principal.workspace_id).first()
    modules = set(flags.modules) if flags else set(ALWAYS_ON)
    ws = db.get(Workspace, principal.workspace_id)
    brand = branding_of(ws)
    if brand.get("preview_mode"):
        modules |= set(brand.get("preview_modules") or [])
    for prefix, mod in MODULE_FOR_PATH_PREFIX:
        if path.startswith(prefix) and mod not in modules:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "module off")
    extra = staff_allowed_modules(db, principal)
    if extra is None:
        return
    for prefix, mod in MODULE_FOR_PATH_PREFIX:
        if path.startswith(prefix) and mod not in extra:
            # Owner console stays role-gated 403 (002), not a G1 hide.
            if mod == "F2":
                continue
            raise HTTPException(status.HTTP_404_NOT_FOUND, "module off")


def require_roles(*roles: str):
    def _inner(principal: Principal = Depends(current_principal)) -> Principal:
        if principal.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        return principal

    return _inner
