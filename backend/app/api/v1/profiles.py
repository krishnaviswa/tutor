from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.ports.mocks import MockPorts
from app.services import profiles as profiles_svc
from app.services.auth import Principal

router = APIRouter()


class ProfileIn(BaseModel):
    phone: str | None = None
    address: str | None = None
    expertise: str | None = None
    subjects: str | None = None
    board_label: str | None = None
    grade_label: str | None = None
    study_info: str | None = None
    challenge_id: str | None = None
    code: str | None = None
    email_challenge_id: str | None = None
    email_code: str | None = None


class TeacherProfileIn(BaseModel):
    phone: str | None = None
    address: str | None = None
    expertise: str | None = None
    subjects: str | None = None


@router.get("/profile")
def get_profile(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    return profiles_svc.read_own(db, principal)


@router.post("/profile/step-up")
def step_up(
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    return profiles_svc.start_step_up(db, ports, principal)


@router.put("/profile")
def put_profile(
    body: ProfileIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    return profiles_svc.save_own(
        db,
        principal,
        body.model_dump(),
        challenge_id=body.challenge_id,
        code=body.code,
        email_challenge_id=body.email_challenge_id,
        email_code=body.email_code,
    )


@router.get("/profiles/{user_id}/card")
def person_card(
    user_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    card = profiles_svc.reduced_card(db, principal, user_id)
    profiles_svc.assert_card_hides_private(card)
    return card


@router.patch("/profiles/{user_id}")
def patch_teacher_profile(
    user_id: str,
    body: TeacherProfileIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return profiles_svc.admin_update_teacher(db, principal, user_id, body.model_dump())


@router.delete("/profiles/{user_id}")
def delete_teacher_profile(
    user_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    return profiles_svc.admin_remove_teacher(db, principal, user_id)
