from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.tables import Identity, SessionAuth, StaffMembership, Student, User, new_id

ROLES = ("owner", "teacher", "assistant", "student", "parent")
STAFF = ("owner", "teacher", "assistant")


@dataclass
class Principal:
    user_id: str
    workspace_id: str
    role: str
    display_name: str


def encode_jwt(user_id: str, workspace_id: str, role: str) -> tuple[str, str]:
    settings = get_settings()
    jti = new_id()
    token = jwt.encode(
        {"sub": user_id, "workspace_id": workspace_id, "role": role, "jti": jti},
        settings.jwt_secret,
        algorithm=settings.jwt_alg,
    )
    return token, jti


def decode_jwt(token: str) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_alg])
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid session") from exc


def membership_role(db: Session, user_id: str, workspace_id: str, requested: str | None) -> str:
    if requested == "student":
        row = (
            db.query(Student)
            .filter(Student.user_id == user_id, Student.workspace_id == workspace_id)
            .first()
        )
        if not row:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not a student in this workspace")
        return "student"
    if requested == "parent":
        from app.models.tables import ParentLink

        row = (
            db.query(ParentLink)
            .filter(
                ParentLink.parent_user_id == user_id,
                ParentLink.workspace_id == workspace_id,
                ParentLink.accepted_at.isnot(None),
            )
            .first()
        )
        if not row:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not a parent in this workspace")
        return "parent"
    q = db.query(StaffMembership).filter(
        StaffMembership.user_id == user_id,
        StaffMembership.workspace_id == workspace_id,
    )
    if requested:
        q = q.filter(StaffMembership.role == requested)
    mem = q.first()
    if not mem:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "no membership")
    return mem.role


def identity_user(db: Session, kind: str, value: str) -> User:
    ident = db.query(Identity).filter(Identity.kind == kind, Identity.value == value).first()
    if not ident:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown identity")
    user = db.get(User, ident.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "unknown user")
    return user


def issue_session(db: Session, user: User, workspace_id: str, role: str) -> str:
    token, jti = encode_jwt(user.id, workspace_id, role)
    db.add(
        SessionAuth(
            workspace_id=workspace_id,
            user_id=user.id,
            role=role,
            token_jti=jti,
        )
    )
    db.flush()
    return token
