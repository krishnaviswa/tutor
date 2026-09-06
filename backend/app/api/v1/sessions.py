from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.models.tables import Attendance, ScheduledSession, SessionRecord, Workspace
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services import record as record_svc

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
