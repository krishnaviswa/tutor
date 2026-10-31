"""Session read / derive / cancel logic. Routers stay thin. Mock ports only."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Enrollment, ScheduledSession, Student, utcnow
from app.ports.mocks import MockPorts
from app.services import notify, timeline
from app.services.auth import Principal
from app.services.scope import student_for_principal

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
    if s.status == "declined":
        return "Declined"
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
        "subject_label": s.subject_label or "",
        "library_item_id": s.library_item_id,
        "prior_teacher_user_id": s.prior_teacher_user_id,
        "cancel_reason": s.cancel_reason or "",
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


def _enrollment_active(status_value: str | None) -> bool:
    return (status_value or "active") != "canceled"


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
        if _enrollment_active(e.status)
    ]


def student_belongs(db: Session, principal: Principal, s: ScheduledSession) -> bool:
    try:
        st = student_for_principal(db, principal)
    except HTTPException:
        return False
    if s.student_id:
        return st.id == s.student_id
    if not s.cohort_id:
        return False
    row = (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == s.workspace_id,
            Enrollment.cohort_id == s.cohort_id,
            Enrollment.student_id == st.id,
        )
        .first()
    )
    return bool(row and _enrollment_active(row.status))


def assert_board_access(db: Session, principal: Principal, s: ScheduledSession, *, write: bool) -> None:
    """Owner and teacher read and write. Assistant reads (session GET includes assistant; PATCH does not).
    A student who belongs to the session reads and writes. Parents do not."""
    if principal.role == "parent":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    if principal.role in ("owner", "teacher"):
        return
    if principal.role == "assistant":
        if write:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        return
    if principal.role == "student":
        if student_belongs(db, principal, s):
            return
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
    raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")


PEN_COLORS = (
    "black",
    "white",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "brown",
    "gray",
)


def board_out(s: ScheduledSession) -> dict:
    data = s.board if isinstance(s.board, dict) else {}
    return {
        "strokes": list(data.get("strokes") or []),
        "texts": list(data.get("texts") or []),
        "placements": list(data.get("placements") or []),
        "erases": list(data.get("erases") or []),
        "updated_at": data.get("updated_at"),
    }


def _color_ok(item: dict) -> bool:
    if "color" not in item or item.get("color") in (None, ""):
        return True
    return item.get("color") in PEN_COLORS


def board_put(
    s: ScheduledSession,
    strokes: list | None,
    updated_at: str | None = None,
    *,
    texts: list | None = None,
    placements: list | None = None,
    erases: list | None = None,
    remove_placement_ids: list | None = None,
    db: Session | None = None,
    ports: MockPorts | None = None,
    workspace_id: str | None = None,
) -> dict:
    """Merge a paint document. Erases never delete placements. Legacy strokes stay readable."""
    from app.services import quota as quota_svc

    prev = board_out(s)
    next_strokes = list(strokes) if strokes is not None else list(prev["strokes"])
    next_texts = list(texts) if texts is not None else list(prev["texts"])
    next_erases = list(erases) if erases is not None else list(prev["erases"])
    for item in next_strokes + next_texts:
        if isinstance(item, dict) and not _color_ok(item):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "unknown color")
    kept = {p.get("id"): dict(p) for p in prev["placements"] if isinstance(p, dict) and p.get("id")}
    incoming = list(placements) if placements is not None else []
    remove = set(remove_placement_ids or [])
    new_files = []
    for item in incoming:
        if not isinstance(item, dict):
            continue
        if item.get("file_body") or item.get("file_name"):
            new_files.append(item)
    if new_files:
        if db is None or ports is None or not workspace_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "storage")
        decision = quota_svc.decide_paid_send(db, workspace_id, "storage")
        if not decision.allowed:
            raise HTTPException(status.HTTP_409_CONFLICT, "storage blocked")
    placed: list[dict] = []
    seen: set[str] = set()
    for item in incoming:
        if not isinstance(item, dict):
            continue
        pid = str(item.get("id") or "")
        if not pid or pid in remove:
            continue
        seen.add(pid)
        stored = dict(kept.get(pid) or {})
        stored.update({k: v for k, v in item.items() if k != "file_body"})
        if item.get("file_body") or item.get("file_name"):
            path = item.get("file_name") or f"local/{workspace_id}/{pid}"
            stored["storage_path"] = ports.local_put(path)  # type: ignore[union-attr]
            stored.pop("file_body", None)
            quota_svc.increment(db, workspace_id, "storage")  # type: ignore[arg-type]
        placed.append(stored)
    if placements is None:
        placed = [p for p in prev["placements"] if isinstance(p, dict) and p.get("id") not in remove]
    else:
        for pid, old in kept.items():
            if pid not in seen and pid not in remove:
                placed.append(old)
    s.board = {
        "strokes": next_strokes,
        "texts": next_texts,
        "placements": placed,
        "erases": next_erases,
        "updated_at": updated_at or utcnow().isoformat(),
    }
    return board_out(s)


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
    students = affected_students(db, s)
    event_ids = []
    for sid in students:
        ev = timeline.append(db, workspace_id, sid, "session.cancelled", body, actor_user_id)
        event_ids.append(ev.id)
    notify.deliver_in_app(db, workspace_id, body, students)
    notify_result = notify.dispatch_after_timeline(db, ports, workspace_id, body, student_whatsapp_on)
    db.flush()
    return {"timeline_event_ids": event_ids, "notify": notify_result}


def start_session(
    db: Session,
    workspace_id: str,
    s: ScheduledSession,
    actor_user_id: str,
) -> dict:
    """Idempotent. Timeline + in-app only. Does not call a provider."""
    if s.started_at is not None:
        return {
            "session_id": s.id,
            "started_at": _aware(s.started_at).isoformat() if _aware(s.started_at) else None,
            "idempotent": True,
            "timeline_event_ids": [],
        }
    s.started_at = utcnow()
    body = f"Class started: {s.title}"
    students = affected_students(db, s)
    event_ids = []
    for sid in students:
        ev = timeline.append(db, workspace_id, sid, "session.started", body, actor_user_id)
        event_ids.append(ev.id)
    notify.deliver_in_app(db, workspace_id, body, students)
    db.flush()
    return {
        "session_id": s.id,
        "started_at": _aware(s.started_at).isoformat() if s.started_at else None,
        "idempotent": False,
        "timeline_event_ids": event_ids,
    }


def student_change(
    db: Session,
    ports: MockPorts,
    principal: Principal,
    s: ScheduledSession,
    *,
    action: str,
    reason: str,
    starts_at: datetime | None,
    student_whatsapp_on: bool,
) -> ScheduledSession:
    """Student declines or moves a 1-on-1 they belong to. The other person reads the session."""
    from app.services.internal_v2 import staff_available, teacher_conflict

    if principal.role != "student" or not student_belongs(db, principal, s):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your session")
    if s.student_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "not a 1-on-1")
    if action == "decline":
        if reason not in ("unavailable", "unwell"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "reason")
        s.status = "declined"
        s.cancel_reason = reason
        s.cancelled_at = utcnow()
        body = f"Session declined ({reason}): {s.title}"
    elif action == "reschedule":
        if starts_at is None:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "starts_at")
        if not staff_available(db, s.workspace_id, s.teacher_user_id, starts_at):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "outside availability")
        if teacher_conflict(db, s.workspace_id, s.teacher_user_id, starts_at, skip_id=s.id):
            raise HTTPException(status.HTTP_409_CONFLICT, "teacher conflict")
        s.starts_at = starts_at
        s.status = "scheduled"
        s.cancel_reason = reason or ""
        body = f"Session rescheduled: {s.title}"
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "action")
    for sid in affected_students(db, s):
        timeline.append(db, s.workspace_id, sid, "session.student_change", body, principal.user_id)
    notify.deliver_in_app(db, s.workspace_id, body, affected_students(db, s))
    notify.dispatch_after_timeline(db, ports, s.workspace_id, body, student_whatsapp_on)
    db.flush()
    return s


def handoff(
    db: Session,
    principal: Principal,
    s: ScheduledSession,
    to_teacher_user_id: str,
) -> ScheduledSession:
    from app.services.handoff import hand_session

    return hand_session(db, principal, s, to_teacher_user_id)


def revert_handoff(db: Session, principal: Principal, s: ScheduledSession) -> ScheduledSession:
    from app.services.handoff import revert_session

    return revert_session(db, principal, s)


def place_library_item(
    db: Session,
    ports: MockPorts,
    principal: Principal,
    s: ScheduledSession,
    content_id: str,
) -> dict:
    """Put a library file on this session's board. A local upload still works without it."""
    from app.models.tables import ContentItem
    from app.services import quota as quota_svc

    assert_board_access(db, principal, s, write=True)
    item = (
        db.query(ContentItem)
        .filter(ContentItem.id == content_id, ContentItem.workspace_id == principal.workspace_id)
        .first()
    )
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "content")
    decision = quota_svc.decide_paid_send(db, principal.workspace_id, "storage")
    if not decision.allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, "storage blocked")
    prev = board_out(s)
    placement = {
        "id": f"lib-{item.id}",
        "kind": "library",
        "name": item.title,
        "storage_path": item.storage_path,
        "content_id": item.id,
        "x": 40,
        "y": 40,
        "w": 640,
        "h": 480,
    }
    s.library_item_id = item.id
    quota_svc.increment(db, principal.workspace_id, "storage")
    ports.local_put(item.storage_path or item.title)
    return _place_without_reupload(s, prev, placement)


def _place_without_reupload(s: ScheduledSession, prev: dict, placement: dict) -> dict:
    placements = [p for p in prev["placements"] if isinstance(p, dict) and p.get("id") != placement["id"]]
    placements.append(placement)
    s.board = {
        "strokes": prev["strokes"],
        "texts": prev["texts"],
        "placements": placements,
        "erases": prev["erases"],
        "updated_at": utcnow().isoformat(),
    }
    return board_out(s)
