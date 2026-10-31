"""Session handoff. The assigned teacher picks the colleague. Faculty admin may revert only that handoff."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import JSON, DateTime, Integer, String
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.models.tables import Base, ContentItem, ScheduledSession, StaffMembership, new_id, utcnow
from app.services.auth import Principal
from app.services.grants import holds_faculty_admin


class SessionHandoff(Base):
    """One handed session. Revert applies to this row only. Not a global undo."""

    __tablename__ = "session_handoffs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    session_id: Mapped[str] = mapped_column(String(36), index=True)
    from_teacher_user_id: Mapped[str] = mapped_column(String(36))
    to_teacher_user_id: Mapped[str] = mapped_column(String(36))
    subject_label: Mapped[str] = mapped_column(String(200), default="")
    library_item_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    content_ids: Mapped[list] = mapped_column(JSON, default=list)
    active: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


def _meta(row: ContentItem) -> dict:
    raw = row.meta or {}
    return raw if isinstance(raw, dict) else {}


def _content_ids(db: Session, session: ScheduledSession) -> list[str]:
    found: list[str] = []
    if session.library_item_id:
        found.append(session.library_item_id)
    rows = (
        db.query(ContentItem)
        .filter(ContentItem.workspace_id == session.workspace_id)
        .all()
    )
    for row in rows:
        if _meta(row).get("session_id") == session.id and row.id not in found:
            found.append(row.id)
    return found


def _colleague(db: Session, workspace_id: str, user_id: str) -> StaffMembership | None:
    return (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "teacher",
        )
        .first()
    )


def hand_session(
    db: Session,
    principal: Principal,
    session: ScheduledSession,
    to_teacher_user_id: str,
) -> ScheduledSession:
    """Assigned teacher sends the session, subject, and content. Faculty admin does not choose."""
    if session.workspace_id != principal.workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
    if holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin does not pick the substitute")
    if principal.user_id != session.teacher_user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "only the assigned teacher")
    if not to_teacher_user_id or to_teacher_user_id == session.teacher_user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "pick a colleague")
    if _colleague(db, principal.workspace_id, to_teacher_user_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")

    subject = session.subject_label or ""
    library_item_id = session.library_item_id
    content_ids = _content_ids(db, session)
    active = (
        db.query(SessionHandoff)
        .filter(
            SessionHandoff.workspace_id == session.workspace_id,
            SessionHandoff.session_id == session.id,
            SessionHandoff.active == 1,
        )
        .all()
    )
    for row in active:
        row.active = 0
    db.add(
        SessionHandoff(
            workspace_id=session.workspace_id,
            session_id=session.id,
            from_teacher_user_id=session.teacher_user_id,
            to_teacher_user_id=to_teacher_user_id,
            subject_label=subject,
            library_item_id=library_item_id,
            content_ids=content_ids,
            active=1,
        )
    )
    session.prior_teacher_user_id = session.teacher_user_id
    session.teacher_user_id = to_teacher_user_id
    session.subject_label = subject
    session.library_item_id = library_item_id
    db.flush()
    return session


def revert_session(db: Session, principal: Principal, session: ScheduledSession) -> ScheduledSession:
    """Faculty-admin grant restores the handed session, subject, and content. Other fields stay."""
    if session.workspace_id != principal.workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
    if not holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")
    row = (
        db.query(SessionHandoff)
        .filter(
            SessionHandoff.workspace_id == session.workspace_id,
            SessionHandoff.session_id == session.id,
            SessionHandoff.active == 1,
        )
        .order_by(SessionHandoff.created_at.desc())
        .first()
    )
    if row is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "nothing to revert")
    session.teacher_user_id = row.from_teacher_user_id
    session.prior_teacher_user_id = None
    session.subject_label = row.subject_label or ""
    session.library_item_id = row.library_item_id
    row.active = 0
    db.flush()
    return session
