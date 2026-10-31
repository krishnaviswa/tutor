"""Student feedback stored against a teacher. Not submissions.feedback."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import ScheduledSession, Submission, TeacherFeedback
from app.services.auth import Principal
from app.services.scope import student_for_principal
from app.services.sessions import student_belongs


def send_feedback(
    db: Session,
    principal: Principal,
    *,
    teacher_user_id: str,
    body: str,
    session_id: str | None,
) -> dict:
    if principal.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "students send feedback")
    st = student_for_principal(db, principal)
    if session_id:
        sess = (
            db.query(ScheduledSession)
            .filter(
                ScheduledSession.id == session_id,
                ScheduledSession.workspace_id == principal.workspace_id,
            )
            .first()
        )
        if not sess or not student_belongs(db, principal, sess):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
        if sess.teacher_user_id != teacher_user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "that teacher is not on the session")
    text = (body or "").strip()
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "feedback")
    row = TeacherFeedback(
        workspace_id=principal.workspace_id,
        teacher_user_id=teacher_user_id,
        student_id=st.id,
        session_id=session_id,
        body=text,
    )
    db.add(row)
    db.flush()
    return {
        "id": row.id,
        "teacher_user_id": row.teacher_user_id,
        "student_id": row.student_id,
        "session_id": row.session_id,
        "body": row.body,
    }


def list_for_teacher(db: Session, principal: Principal, teacher_user_id: str) -> list[dict]:
    if principal.role == "student" and principal.user_id:
        st = student_for_principal(db, principal)
        rows = (
            db.query(TeacherFeedback)
            .filter(
                TeacherFeedback.workspace_id == principal.workspace_id,
                TeacherFeedback.teacher_user_id == teacher_user_id,
                TeacherFeedback.student_id == st.id,
            )
            .all()
        )
    elif principal.role in ("teacher", "owner", "assistant"):
        rows = (
            db.query(TeacherFeedback)
            .filter(
                TeacherFeedback.workspace_id == principal.workspace_id,
                TeacherFeedback.teacher_user_id == teacher_user_id,
            )
            .all()
        )
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return [
        {
            "id": r.id,
            "teacher_user_id": r.teacher_user_id,
            "student_id": r.student_id,
            "body": r.body,
            "session_id": r.session_id,
        }
        for r in rows
    ]


def submission_feedback_unchanged(db: Session, workspace_id: str, submission_id: str, previous: str) -> bool:
    row = (
        db.query(Submission)
        .filter(Submission.id == submission_id, Submission.workspace_id == workspace_id)
        .first()
    )
    if not row:
        return True
    return (row.feedback or "") == previous
