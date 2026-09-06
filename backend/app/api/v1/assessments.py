from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attempt, BacklogItem, Enrollment, Question, Test, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import notify, timeline
from app.services.scope import student_for_principal
from app.api.v1.practice import _q_out, _score

router = APIRouter()


class TestIn(BaseModel):
    title: str
    question_ids: list[str] = []
    cohort_id: str | None = None


class SubmitIn(BaseModel):
    answers: dict = {}


class AnalysisActionIn(BaseModel):
    action: str
    note: str = ""
    student_id: str | None = None


def _test_out(row: Test) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "question_ids": row.question_ids or [],
        "cohort_id": row.cohort_id,
        "workspace_id": row.workspace_id,
    }


@router.post("/tests")
def create_test(
    body: TestIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    row = Test(
        workspace_id=principal.workspace_id,
        title=body.title,
        question_ids=body.question_ids,
        cohort_id=body.cohort_id,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    return _test_out(row)


@router.get("/tests")
def list_tests(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "student")),
):
    rows = db.query(Test).filter(Test.workspace_id == principal.workspace_id).all()
    return [_test_out(r) for r in rows]


@router.get("/tests/{test_id}/run")
def run_test(
    test_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    row = db.query(Test).filter(Test.id == test_id, Test.workspace_id == principal.workspace_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "test")
    questions = []
    for qid in row.question_ids or []:
        q = db.query(Question).filter(Question.id == qid, Question.workspace_id == principal.workspace_id).first()
        if q:
            questions.append(_q_out(q, hide_answer=True))
    return {"id": row.id, "title": row.title, "questions": questions}


@router.post("/tests/{test_id}/submit")
def submit_test(
    test_id: str,
    body: SubmitIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("student")),
):
    row = db.query(Test).filter(Test.id == test_id, Test.workspace_id == principal.workspace_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "test")
    st = student_for_principal(db, principal)
    got, max_s = _score(db, principal.workspace_id, row.question_ids or [], body.answers or {})
    att = Attempt(
        workspace_id=principal.workspace_id,
        student_id=st.id,
        test_id=row.id,
        answers=body.answers or {},
        score=got,
        max_score=max_s,
    )
    db.add(att)
    db.flush()
    note = f"Test submitted: {row.title} {got}/{max_s}"
    timeline.append(db, principal.workspace_id, st.id, "test_submitted", note, principal.user_id)
    ws = db.get(Workspace, principal.workspace_id)
    notify.dispatch_after_timeline(
        db, ports, principal.workspace_id, note, bool(ws.student_whatsapp) if ws else False
    )
    return {"id": att.id, "score": got, "max_score": max_s}


@router.get("/analysis/{cohort_id}")
def analysis(
    cohort_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    student_ids = [
        e.student_id
        for e in db.query(Enrollment).filter(
            Enrollment.workspace_id == principal.workspace_id, Enrollment.cohort_id == cohort_id
        )
    ]
    attempts = (
        db.query(Attempt)
        .filter(Attempt.workspace_id == principal.workspace_id, Attempt.student_id.in_(student_ids or [""]))
        .all()
    )
    by_student: dict[str, list] = {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(
            {"id": a.id, "score": a.score, "max_score": a.max_score, "test_id": a.test_id}
        )
    return {"cohort_id": cohort_id, "students": by_student}


@router.patch("/analysis/{finding_id}/action")
def analysis_action(
    finding_id: str,
    body: AnalysisActionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    item = BacklogItem(
        workspace_id=principal.workspace_id,
        student_id=body.student_id,
        title=f"Analysis {body.action}",
        kind="analysis",
        status="open",
        payload={"finding_id": finding_id, "action": body.action, "note": body.note},
    )
    db.add(item)
    db.flush()
    return {"id": item.id, "finding_id": finding_id, "action": body.action}
