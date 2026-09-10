from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attendance, Cohort, ScheduledSession, SessionRecord, Student, TranscriptEvent, Workspace, new_id
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import record as record_svc
from app.services import sessions as sessions_svc
from app.services import timeline
from app.services.internal_v2 import staff_available, teacher_conflict
from app.services.scope import enrolled_in_session_cohort

router = APIRouter()


class SessionIn(BaseModel):
    title: str
    starts_at: datetime
    cohort_id: str | None = None
    student_id: str | None = None
    ends_at: datetime | None = None
    book: bool = False


class SessionPatch(BaseModel):
    title: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    status: str | None = None
    cancel_reason: str | None = None


class RecordPatch(BaseModel):
    notes: str | None = None
    attendance: list[dict] | None = None


class EngagementIn(BaseModel):
    kind: str = "poll"
    payload: dict = {}



def _session_out(db: Session, s: ScheduledSession) -> dict:
    return sessions_svc.session_out(db, s)


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
    scope: str | None = Query(default=None),
    student_id: str | None = Query(default=None),
    teacher_id: str | None = Query(default=None),
    dt_from: datetime | None = Query(default=None, alias="from"),
    dt_to: datetime | None = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    return sessions_svc.list_sessions(
        db,
        principal.workspace_id,
        scope=scope,
        student_id=student_id,
        teacher_id=teacher_id,
        dt_from=dt_from,
        dt_to=dt_to,
    )


@router.post("/sessions")
def create_session(
    body: SessionIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "student")),
):
    if bool(body.cohort_id) == bool(body.student_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "exactly one of cohort_id or student_id")
    if body.cohort_id:
        cohort = (
            db.query(Cohort)
            .filter(Cohort.id == body.cohort_id, Cohort.workspace_id == principal.workspace_id)
            .first()
        )
        if not cohort:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "cohort")
    if body.student_id:
        st = (
            db.query(Student)
            .filter(Student.id == body.student_id, Student.workspace_id == principal.workspace_id)
            .first()
        )
        if not st:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "student")
    teacher_id = principal.user_id
    ws = db.get(Workspace, principal.workspace_id)
    if principal.role == "student":
        if not body.book:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        first = (
            db.query(ScheduledSession)
            .filter(ScheduledSession.workspace_id == principal.workspace_id)
            .first()
        )
        teacher_id = first.teacher_user_id if first else principal.user_id
    # Availability gates bookings made against a person: student self-booking, or a 1-on-1.
    # A teacher scheduling their own cohort class is the authority and is not gated.
    if (principal.role == "student" or body.student_id) and not staff_available(
        db, principal.workspace_id, teacher_id, body.starts_at, ws
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "outside availability")
    if teacher_conflict(db, principal.workspace_id, teacher_id, body.starts_at):
        raise HTTPException(status.HTTP_409_CONFLICT, "teacher conflict")
    s = ScheduledSession(
        workspace_id=principal.workspace_id,
        cohort_id=body.cohort_id,
        student_id=body.student_id,
        teacher_user_id=teacher_id,
        title=body.title,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(s)
    db.flush()
    return _session_out(db, s)


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    return _session_out(db, _get(db, principal.workspace_id, session_id))


@router.patch("/sessions/{session_id}")
def patch_session(
    session_id: str,
    body: SessionPatch,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    s = _get(db, principal.workspace_id, session_id)
    if body.title is not None:
        s.title = body.title
    # Time edits are allowed in any state (glitch fix). Moving to the future re-reads as "Upcoming".
    if body.starts_at is not None:
        if teacher_conflict(db, principal.workspace_id, s.teacher_user_id, body.starts_at, skip_id=s.id):
            raise HTTPException(status.HTTP_409_CONFLICT, "teacher conflict")
        s.starts_at = body.starts_at
    if body.ends_at is not None:
        s.ends_at = body.ends_at
    if body.status is not None:
        if body.status != "cancelled":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "status may only be set to cancelled")
        ws = db.get(Workspace, principal.workspace_id)
        sessions_svc.cancel(
            db,
            ports,
            principal.workspace_id,
            s,
            principal.user_id,
            body.cancel_reason or "",
            bool(ws.student_whatsapp) if ws else False,
        )
    return _session_out(db, s)


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
        "session": _session_out(db, s),
        "notes": rec.notes if rec else "",
        "attendance": [{"student_id": a.student_id, "status": a.status} for a in att],
        "capture": s.engagement or [],
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
        "session": _session_out(db, s),
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
    principal: Principal = Depends(require_roles("owner", "teacher", "student")),
):
    s = _get(db, principal.workspace_id, session_id)
    if principal.role == "student" and body.kind not in ("chat",):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
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
