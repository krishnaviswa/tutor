"""Thin routes for session handoff. Behavior lives in the handoff service."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import ScheduledSession
from app.services import handoff as handoff_svc
from app.services import sessions as sessions_svc
from app.services.auth import Principal

router = APIRouter()


class HandoffIn(BaseModel):
    teacher_user_id: str


def _session(db: Session, workspace_id: str, session_id: str) -> ScheduledSession:
    row = (
        db.query(ScheduledSession)
        .filter(ScheduledSession.id == session_id, ScheduledSession.workspace_id == workspace_id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
    return row


@router.post("/sessions/{session_id}/handoff")
def handoff_session(
    session_id: str,
    body: HandoffIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    row = _session(db, principal.workspace_id, session_id)
    handoff_svc.hand_session(db, principal, row, body.teacher_user_id)
    return sessions_svc.session_out(db, row)


@router.post("/sessions/{session_id}/handoff/revert")
def revert_handoff(
    session_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    row = _session(db, principal.workspace_id, session_id)
    handoff_svc.revert_session(db, principal, row)
    return sessions_svc.session_out(db, row)
