from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.services import feedback as feedback_svc
from app.services.auth import Principal

router = APIRouter()


class FeedbackIn(BaseModel):
    teacher_user_id: str
    body: str
    session_id: str | None = None


@router.post("/feedback")
def send_feedback(
    body: FeedbackIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    return feedback_svc.send_feedback(
        db,
        principal,
        teacher_user_id=body.teacher_user_id,
        body=body.body,
        session_id=body.session_id,
    )


@router.get("/feedback")
def list_feedback(
    teacher_user_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student", "teacher", "owner", "assistant")),
):
    return feedback_svc.list_for_teacher(db, principal, teacher_user_id)
