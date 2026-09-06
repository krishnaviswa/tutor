from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import Cohort, Enrollment, Student
from app.services.auth import Principal

router = APIRouter()


class CohortIn(BaseModel):
    name: str


class CohortPatch(BaseModel):
    name: str | None = None
    student_ids: list[str] | None = None


def _out(c: Cohort, db: Session) -> dict:
    ids = [
        e.student_id
        for e in db.query(Enrollment).filter(
            Enrollment.workspace_id == c.workspace_id, Enrollment.cohort_id == c.id
        )
    ]
    return {"id": c.id, "workspace_id": c.workspace_id, "name": c.name, "student_ids": ids}


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
    c = Cohort(workspace_id=principal.workspace_id, name=body.name)
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
    db.flush()
    return _out(c, db)
