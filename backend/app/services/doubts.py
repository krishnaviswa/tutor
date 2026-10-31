"""Doubt clarified notice. Timeline is the ledger. Student WhatsApp stays on the existing flag."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Doubt
from app.ports.mocks import MockPorts
from app.services import notify, timeline
from app.services.auth import Principal
from app.services.internal_v2 import put_meta
from app.services.scope import student_for_principal

CLARIFIED = "The doubt was clarified"


def mark(
    db: Session,
    ports: MockPorts,
    principal: Principal,
    row: Doubt,
    *,
    new_status: str | None,
    answer: str | None,
    canned_id: str | None,
    clip: bool | None,
    student_whatsapp_on: bool,
) -> dict:
    was = row.status
    if new_status is not None:
        row.status = new_status
    if answer is not None:
        row.answer = answer
    put_meta(row, canned_id=canned_id, clip=clip)
    becoming = row.status == "answered" and was != "answered"
    if becoming:
        timeline.append(
            db,
            principal.workspace_id,
            row.student_id,
            "doubt.answered",
            CLARIFIED,
            principal.user_id,
        )
        notify.deliver_in_app(db, principal.workspace_id, CLARIFIED, [row.student_id])
        notify.dispatch_after_timeline(
            db, ports, principal.workspace_id, CLARIFIED, student_whatsapp_on
        )
    elif was != "answered":
        note = f"Doubt {row.status}"
        timeline.append(db, principal.workspace_id, row.student_id, "doubt_updated", note, principal.user_id)
        notify.dispatch_after_timeline(db, ports, principal.workspace_id, note, student_whatsapp_on)
    db.flush()
    return {
        "id": row.id,
        "status": row.status,
        "answer": row.answer,
        "clarified": row.status == "answered",
    }


def notice(db: Session, principal: Principal, doubt_id: str, action: str) -> dict:
    if action not in ("accept", "ignore"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "accept or ignore")
    st = student_for_principal(db, principal)
    row = (
        db.query(Doubt)
        .filter(
            Doubt.id == doubt_id,
            Doubt.workspace_id == principal.workspace_id,
            Doubt.student_id == st.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "doubt")
    if row.status != "answered":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "not clarified")
    put_meta(row, notice_action=action)
    db.flush()
    return {"id": row.id, "notice_action": action, "complete": True}
