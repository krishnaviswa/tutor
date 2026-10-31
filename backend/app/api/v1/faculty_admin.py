from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.services import faculty_admin as faculty_svc
from app.services.auth import Principal

router = APIRouter()


class UserIn(BaseModel):
    user_id: str


@router.get("/faculty-admin/me")
def faculty_me(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    return faculty_svc.me(db, principal)


@router.post("/faculty-admin/grants")
def grant(
    body: UserIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.grant_faculty_admin(db, principal, body.user_id)


@router.post("/faculty-admin/succession")
def succession(
    body: UserIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.succession(db, principal, body.user_id)


@router.post("/faculty-admin/supervision")
def supervision(
    body: UserIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.supervise(db, principal, body.user_id)


@router.get("/faculty-admin/supervision")
def supervision_list(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.list_supervised(db, principal)


@router.get("/faculty-admin/directory")
def directory(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.directory(db, principal)


@router.post("/faculty-admin/contact-grants")
def contact(
    body: UserIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.grant_contact(db, principal, body.user_id)


@router.delete("/faculty-admin/contact-grants/{user_id}")
def withhold_contact(
    user_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.withhold_contact(db, principal, user_id)


@router.get("/faculty-admin/planning")
def planning(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return faculty_svc.planning_attendance(db, principal)
