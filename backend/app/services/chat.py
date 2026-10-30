"""Cohort room on the messages table. Personal threads keep student_id set and cohort_id null."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Cohort, Enrollment, Message
from app.services.auth import Principal
from app.services.internal_v2 import meta_of, put_meta
from app.services.scope import student_for_principal


def _active(status_value: str | None) -> bool:
    return (status_value or "active") != "canceled"


def assert_room(db: Session, principal: Principal, cohort: Cohort) -> None:
    if principal.role == "parent":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if principal.role in ("owner", "teacher", "assistant"):
        return
    if principal.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    st = student_for_principal(db, principal)
    row = (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == cohort.workspace_id,
            Enrollment.cohort_id == cohort.id,
            Enrollment.student_id == st.id,
        )
        .first()
    )
    if not row or not _active(row.status):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cohort")


def _out(row: Message) -> dict:
    meta = meta_of(row)
    return {
        "id": row.id,
        "thread_id": row.thread_id,
        "cohort_id": row.cohort_id,
        "student_id": row.student_id,
        "sender_user_id": row.sender_user_id,
        "body": row.body,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "attachment": meta.get("attachment"),
        "read": bool(meta.get("read")),
    }


def list_messages(db: Session, principal: Principal, cohort_id: str) -> list[dict]:
    cohort = (
        db.query(Cohort).filter(Cohort.id == cohort_id, Cohort.workspace_id == principal.workspace_id).first()
    )
    if not cohort:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cohort")
    assert_room(db, principal, cohort)
    rows = (
        db.query(Message)
        .filter(
            Message.workspace_id == principal.workspace_id,
            Message.cohort_id == cohort.id,
        )
        .all()
    )
    rows.sort(key=lambda r: r.created_at or r.id)
    return [_out(r) for r in rows]


def post_message(
    db: Session,
    principal: Principal,
    cohort_id: str,
    body: str,
    attachment: str | None,
) -> dict:
    cohort = (
        db.query(Cohort).filter(Cohort.id == cohort_id, Cohort.workspace_id == principal.workspace_id).first()
    )
    if not cohort:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cohort")
    assert_room(db, principal, cohort)
    row = Message(
        workspace_id=principal.workspace_id,
        thread_id=cohort.id,
        student_id=None,
        cohort_id=cohort.id,
        sender_user_id=principal.user_id,
        body=body,
    )
    db.add(row)
    db.flush()
    put_meta(row, attachment=attachment, read=False)
    return _out(row)
