from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import Announcement, Cohort, Doubt, Message, Student, Workspace, new_id
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import notify, timeline
from app.services.internal_v2 import meta_of, put_meta, sla_hours
from app.services.scope import can_read_student, linked_student_ids, student_for_principal

router = APIRouter()


class DoubtIn(BaseModel):
    body: str
    topic_id: str | None = None


class DoubtPatch(BaseModel):
    status: str | None = None
    answer: str | None = None
    canned_id: str | None = None
    clip: bool | None = None


class MessageIn(BaseModel):
    body: str
    student_id: str | None = None
    attachment: str | None = None
    template_id: str | None = None


class AnnounceIn(BaseModel):
    title: str
    body: str = ""
    cohort_id: str | None = None
    scheduled_at: str | None = None
    channels: list[str] | None = None


def _wa(db: Session, workspace_id: str) -> bool:
    ws = db.get(Workspace, workspace_id)
    return bool(ws.student_whatsapp) if ws else False


@router.get("/doubts")
def list_mine(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    st = student_for_principal(db, principal)
    rows = (
        db.query(Doubt)
        .filter(Doubt.workspace_id == principal.workspace_id, Doubt.student_id == st.id)
        .all()
    )
    return [
        {"id": r.id, "body": r.body, "status": r.status, "answer": r.answer, "topic_id": r.topic_id}
        for r in rows
    ]


@router.post("/doubts")
def create_doubt(
    body: DoubtIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("student")),
):
    st = student_for_principal(db, principal)
    row = Doubt(
        workspace_id=principal.workspace_id,
        student_id=st.id,
        topic_id=body.topic_id,
        body=body.body,
    )
    db.add(row)
    db.flush()
    note = f"Doubt opened: {body.body[:80]}"
    timeline.append(db, principal.workspace_id, st.id, "doubt_opened", note, principal.user_id)
    notify.dispatch_after_timeline(db, ports, principal.workspace_id, note, _wa(db, principal.workspace_id))
    return {"id": row.id, "body": row.body, "status": row.status}


@router.get("/doubts/queue")
def doubt_queue(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    rows = db.query(Doubt).filter(Doubt.workspace_id == principal.workspace_id).all()
    open_rows = [r for r in rows if r.status == "open"]
    open_rows.sort(key=lambda r: r.created_at or r.id)
    positions = {r.id: i + 1 for i, r in enumerate(open_rows)}
    return [
        {
            "id": r.id,
            "student_id": r.student_id,
            "body": r.body,
            "status": r.status,
            "answer": r.answer,
            "queue_position": positions.get(r.id),
            "sla_hours": sla_hours(r.created_at),
            "canned_id": meta_of(r).get("canned_id"),
            "has_clip": bool(meta_of(r).get("clip") or ("[clip]" in (r.answer or ""))),
        }
        for r in rows
    ]


@router.patch("/doubts/{doubt_id}")
def patch_doubt(
    doubt_id: str,
    body: DoubtPatch,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    row = db.query(Doubt).filter(Doubt.id == doubt_id, Doubt.workspace_id == principal.workspace_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "doubt")
    if body.status is not None:
        row.status = body.status
    if body.answer is not None:
        row.answer = body.answer
    put_meta(row, canned_id=body.canned_id, clip=body.clip)
    note = f"Doubt {row.status}"
    timeline.append(db, principal.workspace_id, row.student_id, "doubt_updated", note, principal.user_id)
    notify.dispatch_after_timeline(db, ports, principal.workspace_id, note, _wa(db, principal.workspace_id))
    db.flush()
    return {"id": row.id, "status": row.status, "answer": row.answer}


@router.get("/threads")
def list_threads(db: Session = Depends(get_db), principal: Principal = Depends(current_principal)):
    q = db.query(Message).filter(Message.workspace_id == principal.workspace_id)
    if principal.role == "parent":
        allowed = linked_student_ids(db, principal)
        q = q.filter(Message.student_id.in_(allowed or [""]))
    elif principal.role == "student":
        st = student_for_principal(db, principal)
        q = q.filter(Message.student_id == st.id)
    rows = q.order_by(Message.created_at.desc()).all()
    threads: dict[str, dict] = {}
    for m in rows:
        if m.thread_id not in threads:
            threads[m.thread_id] = {
                "id": m.thread_id,
                "student_id": m.student_id,
                "last_body": m.body,
                "unread": not bool(meta_of(m).get("read")),
                "attachments": [meta_of(m).get("attachment")] if meta_of(m).get("attachment") else [],
            }
    return list(threads.values())


@router.post("/threads/{thread_id}/messages")
def post_message(
    thread_id: str,
    body: MessageIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    student_id = body.student_id
    if principal.role == "student":
        student_id = student_for_principal(db, principal).id
    if student_id and not can_read_student(db, principal, student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not a participant")
    row = Message(
        workspace_id=principal.workspace_id,
        thread_id=thread_id or new_id(),
        student_id=student_id,
        sender_user_id=principal.user_id,
        body=body.body,
    )
    db.add(row)
    db.flush()
    put_meta(row, attachment=body.attachment, template_id=body.template_id, read=False)
    return {"id": row.id, "thread_id": row.thread_id, "body": row.body, "attachment": body.attachment}


@router.get("/announcements")
def list_announcements(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    rows = db.query(Announcement).filter(Announcement.workspace_id == principal.workspace_id).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "body": r.body,
            "cohort_id": r.cohort_id,
            "scheduled_at": meta_of(r).get("scheduled_at"),
            "channels": meta_of(r).get("channels") or [],
        }
        for r in rows
    ]


@router.post("/announcements")
def create_announcement(
    body: AnnounceIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    if body.cohort_id:
        c = (
            db.query(Cohort)
            .filter(Cohort.id == body.cohort_id, Cohort.workspace_id == principal.workspace_id)
            .first()
        )
        if not c:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "cohort")
    row = Announcement(
        workspace_id=principal.workspace_id,
        title=body.title,
        body=body.body,
        cohort_id=body.cohort_id,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    put_meta(row, scheduled_at=body.scheduled_at, channels=body.channels or ["in_app"])
    note = f"Announcement: {row.title}"
    students = db.query(Student).filter(Student.workspace_id == principal.workspace_id).all()
    for st in students:
        timeline.append(db, principal.workspace_id, st.id, "announcement", note, principal.user_id)
    notify.dispatch_after_timeline(db, ports, principal.workspace_id, note, _wa(db, principal.workspace_id))
    return {"id": row.id, "title": row.title, "body": row.body, "scheduled_at": body.scheduled_at, "channels": body.channels or ["in_app"]}
