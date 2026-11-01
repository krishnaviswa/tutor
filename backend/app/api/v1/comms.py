from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import Announcement, Cohort, Doubt, Student, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import doubts as doubts_svc
from app.services import messages as messages_svc
from app.services import notify, timeline
from app.services.internal_v2 import meta_of, put_meta, sla_hours
from app.services.scope import student_for_principal

router = APIRouter()


class DoubtIn(BaseModel):
    body: str
    topic_id: str | None = None


class DoubtPatch(BaseModel):
    status: str | None = None
    answer: str | None = None
    canned_id: str | None = None
    clip: bool | None = None


class NoticeIn(BaseModel):
    action: str


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
        {
            "id": r.id,
            "body": r.body,
            "status": r.status,
            "answer": r.answer,
            "topic_id": r.topic_id,
            "clarified": r.status == "answered",
            "notice_action": meta_of(r).get("notice_action"),
        }
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
    return doubts_svc.mark(
        db,
        ports,
        principal,
        row,
        new_status=body.status,
        answer=body.answer,
        canned_id=body.canned_id,
        clip=body.clip,
        student_whatsapp_on=_wa(db, principal.workspace_id),
    )


@router.post("/doubts/{doubt_id}/notice")
def doubt_notice(
    doubt_id: str,
    body: NoticeIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    return doubts_svc.notice(db, principal, doubt_id, body.action)


@router.get("/threads")
def list_threads(db: Session = Depends(get_db), principal: Principal = Depends(current_principal)):
    return messages_svc.list_threads(db, principal)


@router.post("/threads/{thread_id}/messages")
def post_message(
    thread_id: str,
    body: MessageIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    return messages_svc.post_message(
        db,
        principal,
        thread_id,
        body.body,
        body.student_id,
        body.attachment,
        body.template_id,
    )


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
