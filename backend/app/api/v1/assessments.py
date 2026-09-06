from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attempt, BacklogItem, Enrollment, Question, Student, Test, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import notify, timeline
from app.services.scope import student_for_principal
from app.api.v1.practice import _q_out, _score
from app.services.internal_v2 import meta_of, put_meta, score_with_rules

router = APIRouter()


class TestIn(BaseModel):
    title: str
    question_ids: list[str] = []
    cohort_id: str | None = None
    sections: list[dict] | None = None
    negative_mark: bool = False


class SubmitIn(BaseModel):
    answers: dict = {}
    partial: dict | None = None
    resume: bool = False


class AnalysisActionIn(BaseModel):
    action: str
    note: str = ""
    student_id: str | None = None


def _test_out(row: Test) -> dict:
    m = meta_of(row)
    return {
        "id": row.id,
        "title": row.title,
        "question_ids": row.question_ids or [],
        "cohort_id": row.cohort_id,
        "workspace_id": row.workspace_id,
        "sections": m.get("sections") or [],
        "negative_mark": bool(m.get("negative_mark")),
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
        meta={"sections": body.sections or [], "negative_mark": body.negative_mark},
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
    last = (
        db.query(Attempt)
        .filter(
            Attempt.workspace_id == principal.workspace_id,
            Attempt.test_id == row.id,
            Attempt.student_id == student_for_principal(db, principal).id,
        )
        .order_by(Attempt.created_at.desc())
        .first()
    )
    return {
        "id": row.id,
        "title": row.title,
        "questions": questions,
        "sections": meta_of(row).get("sections") or [],
        "negative_mark": bool(meta_of(row).get("negative_mark")),
        "palette": [q["id"] for q in questions],
        "resume": last.answers if last else {},
    }


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
    got = score_with_rules(
        got, max_s, negative_mark=bool(meta_of(row).get("negative_mark")), partial=body.partial
    )
    att = Attempt(
        workspace_id=principal.workspace_id,
        student_id=st.id,
        test_id=row.id,
        answers=body.answers or {},
        score=got,
        max_score=max_s,
        meta={"partial": body.partial or {}, "resume": body.resume},
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
    return {
        "cohort_id": cohort_id,
        "view": "cohort",
        "forced_action": True,
        "students": by_student,
    }


@router.patch("/analysis/{finding_id}/action")
def analysis_action(
    finding_id: str,
    body: AnalysisActionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    if not (body.action or "").strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "action required")
    student_id = body.student_id
    if student_id:
        st = (
            db.query(Student)
            .filter(Student.id == student_id, Student.workspace_id == principal.workspace_id)
            .first()
        )
        if not st:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
        student_id = st.id
    item = BacklogItem(
        workspace_id=principal.workspace_id,
        student_id=student_id,
        title=f"Analysis {body.action}",
        kind="analysis",
        status="open",
        payload={"finding_id": finding_id, "action": body.action, "note": body.note},
    )
    db.add(item)
    db.flush()
    return {"id": item.id, "finding_id": finding_id, "action": body.action}
