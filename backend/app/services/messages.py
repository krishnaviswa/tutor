"""Personal message threads. A send adds a row. It never rewrites an older body."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Message, new_id
from app.services.auth import Principal
from app.services.grants import holds_contact, holds_faculty_admin, is_owner
from app.services.internal_v2 import meta_of, put_meta
from app.services.scope import can_read_student, linked_student_ids, student_for_principal


def _visible(db: Session, principal: Principal):
    q = db.query(Message).filter(
        Message.workspace_id == principal.workspace_id,
        Message.cohort_id.is_(None),
    )
    if principal.role == "parent":
        allowed = linked_student_ids(db, principal)
        q = q.filter(Message.student_id.in_(allowed or [""]))
    elif principal.role == "student":
        st = student_for_principal(db, principal)
        q = q.filter(Message.student_id == st.id)
    return q


def _out(row: Message) -> dict:
    meta = meta_of(row)
    return {
        "id": row.id,
        "body": row.body,
        "sender_user_id": row.sender_user_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "attachment": meta.get("attachment"),
    }


def list_threads(db: Session, principal: Principal) -> list[dict]:
    rows = _visible(db, principal).order_by(Message.created_at.asc(), Message.id.asc()).all()
    buckets: dict[str, list[Message]] = {}
    for row in rows:
        buckets.setdefault(row.thread_id, []).append(row)
    threads = []
    for thread_id, msgs in buckets.items():
        last = msgs[-1]
        attachments = [meta_of(row).get("attachment") for row in msgs if meta_of(row).get("attachment")]
        threads.append(
            {
                "id": thread_id,
                "student_id": next((row.student_id for row in msgs if row.student_id), None),
                "last_body": last.body,
                "unread": not bool(meta_of(last).get("read")),
                "attachments": attachments,
                "messages": [_out(row) for row in msgs],
            }
        )
    threads.sort(key=lambda item: (item["messages"][-1]["created_at"] or "", item["id"]), reverse=True)
    return threads


def _rows_for_thread(db: Session, workspace_id: str, thread_id: str) -> list[Message]:
    if not thread_id:
        return []
    return (
        db.query(Message)
        .filter(
            Message.workspace_id == workspace_id,
            Message.cohort_id.is_(None),
            Message.thread_id == thread_id,
        )
        .all()
    )


def _thread_for_student(db: Session, workspace_id: str, student_id: str) -> str | None:
    row = (
        db.query(Message)
        .filter(
            Message.workspace_id == workspace_id,
            Message.cohort_id.is_(None),
            Message.student_id == student_id,
        )
        .order_by(Message.created_at.asc(), Message.id.asc())
        .first()
    )
    return row.thread_id if row else None


def resolve_thread(db: Session, workspace_id: str, requested_id: str, student_id: str | None) -> tuple[str, str | None]:
    """Append on the open thread. A student who already has one keeps it. A new student gets a new id."""
    requested = requested_id if requested_id and requested_id != "new" else ""
    existing = _rows_for_thread(db, workspace_id, requested)
    current_student = next((row.student_id for row in existing if row.student_id), None)
    theirs = _thread_for_student(db, workspace_id, student_id) if student_id else None
    if student_id and theirs:
        return theirs, student_id
    if student_id and existing and current_student != student_id:
        return new_id(), student_id
    if student_id and requested and not existing:
        return requested, student_id
    if student_id:
        return new_id(), student_id
    if requested:
        return requested, current_student
    return new_id(), None


def post_message(
    db: Session,
    principal: Principal,
    thread_id: str,
    body: str,
    student_id: str | None,
    attachment: str | None,
    template_id: str | None,
) -> dict:
    if principal.role == "student":
        student_id = student_for_principal(db, principal).id
    if principal.role == "teacher" and student_id:
        if not holds_contact(db, principal.workspace_id, principal.user_id) and not holds_faculty_admin(
            db, principal.workspace_id, principal.user_id
        ):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "contact not granted")
    if student_id and not can_read_student(db, principal, student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not a participant")
    if principal.role == "owner" or is_owner(db, principal.workspace_id, principal.user_id):
        pass
    use_thread, use_student = resolve_thread(db, principal.workspace_id, thread_id, student_id)
    row = Message(
        workspace_id=principal.workspace_id,
        thread_id=use_thread,
        student_id=use_student,
        sender_user_id=principal.user_id,
        body=body,
    )
    db.add(row)
    db.flush()
    put_meta(row, attachment=attachment, template_id=template_id, read=False)
    return {"id": row.id, "thread_id": row.thread_id, "body": row.body, "attachment": attachment}
