from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.tables import TimelineEvent, utcnow


def append(
    db: Session,
    workspace_id: str,
    student_id: str,
    event_type: str,
    body: str,
    actor_user_id: str | None,
) -> TimelineEvent:
    ev = TimelineEvent(
        workspace_id=workspace_id,
        student_id=student_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        body=body,
        created_at=utcnow(),
    )
    db.add(ev)
    db.flush()
    return ev
