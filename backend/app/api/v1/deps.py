from typing import Annotated

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tables import FeatureFlag, User
from app.services.auth import Principal, decode_jwt
from app.services.quota import ALWAYS_ON

MODULE_FOR_PATH_PREFIX = (
    ("/api/v1/students", "A5"),
    ("/api/v1/cohorts", "A5"),
    ("/api/v1/parent", "A4"),
    ("/api/v1/parent-links", "A4"),
    ("/api/v1/sessions", "B1"),
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
    _g1(db, request.url.path, principal.workspace_id)
    return principal


def _g1(db: Session, path: str, workspace_id: str) -> None:
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == workspace_id).first()
    modules = set(flags.modules) if flags else set(ALWAYS_ON)
    for prefix, mod in MODULE_FOR_PATH_PREFIX:
        if path.startswith(prefix) and mod not in modules:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "module off")


def require_roles(*roles: str):
    def _inner(principal: Principal = Depends(current_principal)) -> Principal:
        if principal.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        return principal

    return _inner
