from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import Cohort, Enrollment, Student, new_id
from app.services import billing, chat
from app.services.auth import Principal
from app.services.internal_v2 import meta_of, put_meta

router = APIRouter()


class CohortIn(BaseModel):
    name: str


class CohortPatch(BaseModel):
    name: str | None = None
    student_ids: list[str] | None = None
    waitlist: list[str] | None = None
    waitlist_add: str | None = None
    billing_mode: str | None = None
    hourly_rate_cents: int | None = None


class CohortMessageIn(BaseModel):
    body: str
    attachment: str | None = None


class PlanLinkIn(BaseModel):
    plan_id: str


def _out(c: Cohort, db: Session) -> dict:
    enrollments = db.query(Enrollment).filter(
        Enrollment.workspace_id == c.workspace_id, Enrollment.cohort_id == c.id
    ).all()
    ids = [e.student_id for e in enrollments if (e.status or "active") != "canceled"]
    m = meta_of(c)
    token = m.get("invite_token")
    if not token:
        token = f"invite-{c.id[-8:]}"
        put_meta(c, invite_token=token)
    return {
        "id": c.id,
        "workspace_id": c.workspace_id,
        "name": c.name,
        "student_ids": ids,
        "invite_token": token,
        "waitlist": m.get("waitlist") or [],
        "billing_mode": c.billing_mode or "static",
        "hourly_rate_cents": c.hourly_rate_cents or 0,
        "enrollments": [
            {
                "id": e.id,
                "student_id": e.student_id,
                "status": e.status or "active",
                "plan_id": e.plan_id,
            }
            for e in enrollments
        ],
    }


@router.get("/cohorts")
def list_cohorts(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    rows = db.query(Cohort).filter(Cohort.workspace_id == principal.workspace_id).all()
    return [_out(c, db) for c in rows]


@router.post("/cohorts")
def create_cohort(
    body: CohortIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    c = Cohort(workspace_id=principal.workspace_id, name=body.name, meta={"invite_token": new_id()})
    db.add(c)
    db.flush()
    return _out(c, db)


@router.patch("/cohorts/{cohort_id}")
def patch_cohort(
    cohort_id: str,
    body: CohortPatch,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    c = (
        db.query(Cohort)
        .filter(Cohort.id == cohort_id, Cohort.workspace_id == principal.workspace_id)
        .first()
    )
    if not c:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cohort")
    if body.name is not None:
        c.name = body.name
    if body.student_ids is not None:
        db.query(Enrollment).filter(
            Enrollment.workspace_id == principal.workspace_id,
            Enrollment.cohort_id == c.id,
        ).delete()
        for sid in body.student_ids:
            st = (
                db.query(Student)
                .filter(Student.id == sid, Student.workspace_id == principal.workspace_id)
                .first()
            )
            if not st:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "student not in workspace")
            db.add(Enrollment(workspace_id=principal.workspace_id, cohort_id=c.id, student_id=sid))
    if body.waitlist is not None:
        put_meta(c, waitlist=body.waitlist)
    if body.waitlist_add:
        wait = list(meta_of(c).get("waitlist") or [])
        if body.waitlist_add not in wait:
            wait.append(body.waitlist_add)
        put_meta(c, waitlist=wait)
    billing.apply_cohort_billing(c, body.billing_mode, body.hourly_rate_cents)
    db.flush()
    return _out(c, db)


@router.get("/cohorts/{cohort_id}/messages")
def list_cohort_messages(
    cohort_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    return chat.list_messages(db, principal, cohort_id)


@router.post("/cohorts/{cohort_id}/messages")
def post_cohort_message(
    cohort_id: str,
    body: CohortMessageIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    return chat.post_message(db, principal, cohort_id, body.body, body.attachment)


@router.post("/cohorts/{cohort_id}/enrollments/{student_id}/plan")
def link_plan(
    cohort_id: str,
    student_id: str,
    body: PlanLinkIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.link_enrollment_plan(db, principal.workspace_id, cohort_id, student_id, body.plan_id)
    return {"id": row.id, "student_id": row.student_id, "plan_id": row.plan_id, "status": row.status}


@router.post("/cohorts/{cohort_id}/enrollments/{student_id}/cancel")
def cancel_enrollment(
    cohort_id: str,
    student_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = billing.cancel_enrollment(db, principal.workspace_id, principal.user_id, cohort_id, student_id)
    return {"id": row.id, "student_id": row.student_id, "status": row.status}
