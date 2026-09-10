"""Session read / derive / cancel logic. Routers stay thin. Mock ports only."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.tables import Enrollment, ScheduledSession, Student, utcnow
from app.ports.mocks import MockPorts
from app.services import notify, timeline

DEFAULT_DURATION = timedelta(minutes=90)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def ends_or_default(s: ScheduledSession) -> datetime | None:
    if s.ends_at:
        return _aware(s.ends_at)
    start = _aware(s.starts_at)
    return start + DEFAULT_DURATION if start else None


def display_status(s: ScheduledSession, now: datetime | None = None) -> str:
    """Two-word state. Time-driven and automatic; `completed` is only the staff-closed path."""
    now = now or datetime.now(timezone.utc)
    if s.status == "cancelled":
        return "Cancelled"
    if s.status == "completed":
        return "Staff completed"
    ref = ends_or_default(s)
    if ref and ref <= now:
        return "Auto completed"
    return "Upcoming"


def _student_name(db: Session, workspace_id: str, student_id: str | None) -> str | None:
    if not student_id:
        return None
    st = (
        db.query(Student)
        .filter(Student.id == student_id, Student.workspace_id == workspace_id)
        .first()
    )
    return st.display_name if st else None


def session_out(db: Session, s: ScheduledSession, now: datetime | None = None) -> dict:
    return {
        "id": s.id,
        "workspace_id": s.workspace_id,
        "cohort_id": s.cohort_id,
        "student_id": s.student_id,
        "student_name": _student_name(db, s.workspace_id, s.student_id),
        "teacher_user_id": s.teacher_user_id,
        "title": s.title,
        "starts_at": s.starts_at.isoformat() if s.starts_at else None,
        "ends_at": ends_or_default(s).isoformat() if ends_or_default(s) else None,
        "status": s.status,
        "display_status": display_status(s, now),
        "conflict": False,
    }


_SCOPE = {
    "upcoming": {"Upcoming"},
    "completed": {"Auto completed", "Staff completed"},
    "cancelled": {"Cancelled"},
    "past": {"Auto completed", "Staff completed", "Cancelled"},
}


def list_sessions(
    db: Session,
    workspace_id: str,
    *,
    scope: str | None = None,
    student_id: str | None = None,
    teacher_id: str | None = None,
    dt_from: datetime | None = None,
    dt_to: datetime | None = None,
) -> list[dict]:
    q = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == workspace_id)
    if student_id:
        q = q.filter(ScheduledSession.student_id == student_id)
    if teacher_id:
        q = q.filter(ScheduledSession.teacher_user_id == teacher_id)
    rows = q.all()
    now = datetime.now(timezone.utc)
    out = []
    want = _SCOPE.get((scope or "").lower())
    for s in rows:
        start = _aware(s.starts_at)
        if dt_from and start and start < _aware(dt_from):
            continue
        if dt_to and start and start > _aware(dt_to):
            continue
        row = session_out(db, s, now)
        if want is not None and row["display_status"] not in want:
            continue
        out.append(row)
    out.sort(key=lambda r: r["starts_at"] or "")
    return out


def affected_students(db: Session, s: ScheduledSession) -> list[str]:
    if s.student_id:
        return [s.student_id]
    if not s.cohort_id:
        return []
    return [
        e.student_id
        for e in db.query(Enrollment).filter(
            Enrollment.workspace_id == s.workspace_id,
            Enrollment.cohort_id == s.cohort_id,
        )
    ]


def cancel(
    db: Session,
    ports: MockPorts,
    workspace_id: str,
    s: ScheduledSession,
    actor_user_id: str,
    reason: str,
    student_whatsapp_on: bool,
) -> dict:
    s.status = "cancelled"
    s.cancelled_at = utcnow()
    if reason:
        s.cancel_reason = reason
    body = f"Session cancelled: {s.title}"
    event_ids = []
    for sid in affected_students(db, s):
        ev = timeline.append(db, workspace_id, sid, "session.cancelled", body, actor_user_id)
        event_ids.append(ev.id)
    notify_result = notify.dispatch_after_timeline(db, ports, workspace_id, body, student_whatsapp_on)
    db.flush()
    return {"timeline_event_ids": event_ids, "notify": notify_result}
