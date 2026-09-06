from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.models.tables import Assignment, Submission, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import notify, timeline
from app.services.internal_v2 import meta_of, put_meta
from app.services.scope import can_read_student

router = APIRouter()


class AssignmentIn(BaseModel):
    title: str
    body: str = ""
    cohort_id: str | None = None
    rubric: list[dict] | None = None
    due_at: str | None = None
    allow_resubmit: bool = False


class GradeIn(BaseModel):
    submission_id: str
    grade: str
    feedback: str = ""
    partial: dict | None = None
    allow_resubmit: bool | None = None


def _asg_out(row: Assignment) -> dict:
    m = meta_of(row)
    return {
        "id": row.id,
        "workspace_id": row.workspace_id,
        "cohort_id": row.cohort_id,
        "title": row.title,
        "body": row.body,
        "rubric": m.get("rubric") or [],
        "due_at": m.get("due_at"),
        "allow_resubmit": bool(m.get("allow_resubmit")),
    }


@router.get("/assignments")
def list_assignments(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    rows = db.query(Assignment).filter(Assignment.workspace_id == principal.workspace_id).all()
    return [_asg_out(r) for r in rows]


@router.post("/assignments")
def create_assignment(
    body: AssignmentIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    row = Assignment(
        workspace_id=principal.workspace_id,
        title=body.title,
        body=body.body,
        cohort_id=body.cohort_id,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    put_meta(row, rubric=body.rubric or [], due_at=body.due_at, allow_resubmit=body.allow_resubmit)
    return _asg_out(row)


@router.get("/assignments/{assignment_id}/submissions")
def list_submissions(
    assignment_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    asg = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.workspace_id == principal.workspace_id)
        .first()
    )
    if not asg:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assignment")
    rows = (
        db.query(Submission)
        .filter(Submission.workspace_id == principal.workspace_id, Submission.assignment_id == asg.id)
        .all()
    )
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "body": r.body,
            "grade": r.grade,
            "feedback": r.feedback,
            "late": bool(meta_of(r).get("late")),
            "resubmit_count": int(meta_of(r).get("resubmit_count") or 0),
            "partial": meta_of(r).get("partial") or {},
        }
        for r in rows
    ]


@router.post("/assignments/{assignment_id}/grade")
def grade_submission(
    assignment_id: str,
    body: GradeIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    asg = (
        db.query(Assignment)
        .filter(Assignment.id == assignment_id, Assignment.workspace_id == principal.workspace_id)
        .first()
    )
    if not asg:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assignment")
    sub = (
        db.query(Submission)
        .filter(
            Submission.id == body.submission_id,
            Submission.assignment_id == asg.id,
            Submission.workspace_id == principal.workspace_id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "submission")
    if not can_read_student(db, principal, sub.student_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    sub.grade = body.grade
    sub.feedback = body.feedback
    sub.graded_at = datetime.now(timezone.utc)
    put_meta(sub, partial=body.partial or {}, allow_resubmit=body.allow_resubmit)
    note = f"Assignment graded: {asg.title} ({body.grade})"
    timeline.append(db, principal.workspace_id, sub.student_id, "assignment_graded", note, principal.user_id)
    ws = db.get(Workspace, principal.workspace_id)
    notify.dispatch_after_timeline(
        db, ports, principal.workspace_id, note, bool(ws.student_whatsapp) if ws else False
    )
    db.flush()
    return {"id": sub.id, "grade": sub.grade, "feedback": sub.feedback}
