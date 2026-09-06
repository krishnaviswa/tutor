from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attendance, ScheduledSession, SessionRecord, TranscriptEvent, Workspace, new_id
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import record as record_svc
from app.services import timeline
from app.services.scope import enrolled_in_session_cohort

router = APIRouter()


class SessionIn(BaseModel):
    cohort_id: str
    title: str
    starts_at: datetime


class SessionPatch(BaseModel):
    title: str | None = None
    starts_at: datetime | None = None


class RecordPatch(BaseModel):
    notes: str | None = None
    attendance: list[dict] | None = None


class EngagementIn(BaseModel):
    kind: str = "poll"
    payload: dict = {}



def _session_out(s: ScheduledSession) -> dict:
    return {
        "id": s.id,
        "workspace_id": s.workspace_id,
        "cohort_id": s.cohort_id,
        "title": s.title,
        "starts_at": s.starts_at.isoformat() if s.starts_at else None,
        "teacher_user_id": s.teacher_user_id,
    }


def _get(db: Session, workspace_id: str, session_id: str) -> ScheduledSession:
    s = (
        db.query(ScheduledSession)
        .filter(ScheduledSession.id == session_id, ScheduledSession.workspace_id == workspace_id)
        .first()
    )
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
    return s


@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    rows = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == principal.workspace_id).all()
    return [_session_out(s) for s in rows]


@router.post("/sessions")
def create_session(
    body: SessionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = ScheduledSession(
        workspace_id=principal.workspace_id,
        cohort_id=body.cohort_id,
        teacher_user_id=principal.user_id if principal.role == "teacher" else principal.user_id,
        title=body.title,
        starts_at=body.starts_at,
    )
    db.add(s)
    db.flush()
    return _session_out(s)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    return _session_out(_get(db, principal.workspace_id, session_id))


@router.patch("/sessions/{session_id}")
def patch_session(
    session_id: str,
    body: SessionPatch,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    if body.title is not None:
        s.title = body.title
    if body.starts_at is not None:
        s.starts_at = body.starts_at
    return _session_out(s)


@router.get("/sessions/{session_id}/record")
def get_record(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    rec = (
        db.query(SessionRecord)
        .filter(SessionRecord.workspace_id == principal.workspace_id, SessionRecord.session_id == s.id)
        .first()
    )
    att = (
        db.query(Attendance)
        .filter(Attendance.workspace_id == principal.workspace_id, Attendance.session_id == s.id)
        .all()
    )
    return {
        "session": _session_out(s),
        "notes": rec.notes if rec else "",
        "attendance": [{"student_id": a.student_id, "status": a.status} for a in att],
    }


@router.patch("/sessions/{session_id}/record")
def patch_record(
    session_id: str,
    body: RecordPatch,
    request: Request,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    ws = db.get(Workspace, principal.workspace_id)
    return record_svc.patch_record(
        db,
        ports,
        principal.workspace_id,
        s,
        principal.user_id,
        body.notes,
        body.attendance,
        bool(ws.student_whatsapp) if ws else False,
    )


@router.post("/sessions/{session_id}/video-link")
def video_link(
    session_id: str,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    s.video_url = ports.create_video_link(s.id)
    if not s.join_token:
        s.join_token = new_id()
    if not s.recording_url:
        s.recording_url = f"mock://record/{s.id}"
    db.flush()
    return {"session_id": s.id, "video_url": s.video_url, "join_token": s.join_token}


@router.get("/sessions/{session_id}/live")
def live(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    s = _get(db, principal.workspace_id, session_id)
    if principal.role in ("owner", "teacher"):
        view = "teacher"
    elif principal.role == "student" and enrolled_in_session_cohort(
        db, s.workspace_id, s.cohort_id, principal.user_id
    ):
        view = "student"
    else:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return {
        "session": _session_out(s),
        "view": view,
        "video_url": s.video_url,
        "engagement": s.engagement or [],
        "provider": "mock",
    }


@router.post("/sessions/{session_id}/engagement")
def engagement(
    session_id: str,
    body: EngagementIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    events = list(s.engagement or [])
    events.append({"kind": body.kind, "payload": body.payload, "actor_user_id": principal.user_id})
    s.engagement = events
    note = f"Live engagement: {body.kind}"
    att = (
        db.query(Attendance)
        .filter(Attendance.workspace_id == principal.workspace_id, Attendance.session_id == s.id)
        .all()
    )
    for a in att:
        timeline.append(db, principal.workspace_id, a.student_id, "engagement", note, principal.user_id)
    ws = db.get(Workspace, principal.workspace_id)
    from app.services import notify

    notify.dispatch_after_timeline(
        db, ports, principal.workspace_id, note, bool(ws.student_whatsapp) if ws else False
    )
    db.flush()
    return {"session_id": s.id, "engagement": s.engagement}


@router.get("/sessions/{session_id}/video")
def session_video(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    transcripts = (
        db.query(TranscriptEvent)
        .filter(TranscriptEvent.workspace_id == principal.workspace_id, TranscriptEvent.session_id == s.id)
        .all()
    )
    return {
        "session_id": s.id,
        "recording_url": s.recording_url,
        "video_url": s.video_url,
        "transcript": [],
        "transcript_count": len(transcripts),
    }
