from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attempt, PracticeSet, Question, Topic, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import notify, timeline
from app.services.scope import can_read_student, student_for_principal

router = APIRouter()


class QuestionIn(BaseModel):
    stem: str
    choices: list[str] = []
    answer: str = ""
    topic_id: str | None = None


class PracticeSetIn(BaseModel):
    title: str
    question_ids: list[str] = []


class AttemptIn(BaseModel):
    answers: dict = {}


def _q_out(q: Question, *, hide_answer: bool) -> dict:
    data = {
        "id": q.id,
        "workspace_id": q.workspace_id,
        "topic_id": q.topic_id,
        "stem": q.stem,
        "choices": q.choices or [],
    }
    if not hide_answer:
        data["answer"] = q.answer
    return data


def _score(db: Session, workspace_id: str, question_ids: list[str], answers: dict) -> tuple[int, int]:
    max_s = len(question_ids)
    got = 0
    for qid in question_ids:
        q = db.query(Question).filter(Question.id == qid, Question.workspace_id == workspace_id).first()
        if q and str(answers.get(qid, answers.get(str(qid), ""))) == q.answer:
            got += 1
    return got, max_s


@router.get("/questions")
def list_questions(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    rows = db.query(Question).filter(Question.workspace_id == principal.workspace_id).all()
    return [_q_out(q, hide_answer=False) for q in rows]


@router.post("/questions")
def create_question(
    body: QuestionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    if body.topic_id:
        topic = (
            db.query(Topic)
            .filter(Topic.id == body.topic_id, Topic.workspace_id == principal.workspace_id)
            .first()
        )
        if not topic:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "topic")
    q = Question(
        workspace_id=principal.workspace_id,
        topic_id=body.topic_id,
        stem=body.stem,
        choices=body.choices,
        answer=body.answer,
        created_by=principal.user_id,
    )
    db.add(q)
    db.flush()
    return _q_out(q, hide_answer=False)


@router.get("/practice-sets")
def list_sets(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "student")),
):
    rows = db.query(PracticeSet).filter(PracticeSet.workspace_id == principal.workspace_id).all()
    return [{"id": r.id, "title": r.title, "question_ids": r.question_ids or []} for r in rows]


@router.post("/practice-sets")
def create_set(
    body: PracticeSetIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    row = PracticeSet(
        workspace_id=principal.workspace_id,
        title=body.title,
        question_ids=body.question_ids,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    return {"id": row.id, "title": row.title, "question_ids": row.question_ids}


@router.get("/practice-sets/{set_id}/play")
def play_set(
    set_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    row = (
        db.query(PracticeSet)
        .filter(PracticeSet.id == set_id, PracticeSet.workspace_id == principal.workspace_id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "practice set")
    questions = []
    for qid in row.question_ids or []:
        q = db.query(Question).filter(Question.id == qid, Question.workspace_id == principal.workspace_id).first()
        if q:
            questions.append(_q_out(q, hide_answer=True))
    return {"id": row.id, "title": row.title, "questions": questions}


@router.post("/practice-sets/{set_id}/attempt")
def attempt_set(
    set_id: str,
    body: AttemptIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("student")),
):
    row = (
        db.query(PracticeSet)
        .filter(PracticeSet.id == set_id, PracticeSet.workspace_id == principal.workspace_id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "practice set")
    st = student_for_principal(db, principal)
    got, max_s = _score(db, principal.workspace_id, row.question_ids or [], body.answers or {})
    att = Attempt(
        workspace_id=principal.workspace_id,
        student_id=st.id,
        practice_set_id=row.id,
        answers=body.answers or {},
        score=got,
        max_score=max_s,
    )
    db.add(att)
    db.flush()
    note = f"Practice attempt on {row.title}: {got}/{max_s}"
    timeline.append(db, principal.workspace_id, st.id, "practice_attempted", note, principal.user_id)
    ws = db.get(Workspace, principal.workspace_id)
    notify.dispatch_after_timeline(
        db, ports, principal.workspace_id, note, bool(ws.student_whatsapp) if ws else False
    )
    return {"id": att.id, "score": got, "max_score": max_s}


@router.get("/attempts/{attempt_id}")
def get_attempt(
    attempt_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    att = (
        db.query(Attempt)
        .filter(Attempt.id == attempt_id, Attempt.workspace_id == principal.workspace_id)
        .first()
    )
    if not att or not can_read_student(db, principal, att.student_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "attempt")
    return {
        "id": att.id,
        "student_id": att.student_id,
        "practice_set_id": att.practice_set_id,
        "test_id": att.test_id,
        "score": att.score,
        "max_score": att.max_score,
        "answers": att.answers,
        "empty": False,
    }
