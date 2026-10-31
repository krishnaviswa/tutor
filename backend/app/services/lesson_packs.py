"""Prepaid hour packs. Minutes are integers. A class does not burn until it is delivered or forfeited.

Notice window is 24 hours before the session start.
Attended and no-show burn. A student cancel or a reschedule burns only inside that window.
At or outside the window, a student cancel or a reschedule does not burn.
A teacher cancel does not burn. The owner may waive a forfeit inside the window.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import (
    Attendance,
    Identity,
    LessonPack,
    LessonPackLedger,
    ScheduledSession,
    SessionRecord,
    StaffAvailability,
    Student,
    User,
    Workspace,
)
from app.services.auth import Principal
from app.services.internal_v2 import branding_of, teachers_for_student
from app.services.scope import can_read_student, linked_student_ids

NOTICE_WINDOW_HOURS = 24
HOUR_MINUTES = 60
OPEN_DAYS = 7

_CANONICAL = {
    "present": "attended",
    "attended": "attended",
    "absent": "no_show",
    "no_show": "no_show",
    "student_cancel": "student_cancel",
    "teacher_cancel": "teacher_cancel",
}
def canonical_attendance(raw: str | None) -> str | None:
    """Old present reads as attended. Old absent reads as no-show. Unmarked stays unmarked."""
    if raw in (None, "", "unmarked"):
        return None
    return _CANONICAL.get(raw)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def inside_notice_window(starts_at: datetime | None, now: datetime | None = None) -> bool:
    start = _aware(starts_at)
    if start is None:
        return False
    current = _aware(now) or _now()
    return start - current < timedelta(hours=NOTICE_WINDOW_HOURS)


def burn_minutes(session: ScheduledSession) -> int:
    """Session length in minutes. Sixty when the session has no end."""
    start = _aware(session.starts_at)
    end = _aware(session.ends_at) if session.ends_at else None
    if start and end:
        minutes = int(round((end - start).total_seconds() / 60))
        if minutes > 0:
            return minutes
    return HOUR_MINUTES


def pack_summary(db: Session, workspace_id: str, student_id: str) -> dict:
    packs = (
        db.query(LessonPack)
        .filter(LessonPack.workspace_id == workspace_id, LessonPack.student_id == student_id)
        .all()
    )
    lines = (
        db.query(LessonPackLedger)
        .filter(LessonPackLedger.workspace_id == workspace_id, LessonPackLedger.student_id == student_id)
        .all()
    )
    return {
        "balance_minutes": sum(row.minutes or 0 for row in lines),
        "purchased_minutes": sum(row.purchased_minutes or 0 for row in packs),
    }


def read_pack(db: Session, principal: Principal, student_id: str) -> dict:
    student = (
        db.query(Student)
        .filter(Student.id == student_id, Student.workspace_id == principal.workspace_id)
        .first()
    )
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    if not can_read_student(db, principal, student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    return {"student_id": student.id, **pack_summary(db, principal.workspace_id, student.id)}


def grant_pack(db: Session, workspace_id: str, student_id: str, hours: int) -> dict:
    if hours < 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hours")
    minutes = hours * HOUR_MINUTES
    db.add(
        LessonPack(
            workspace_id=workspace_id,
            student_id=student_id,
            purchased_minutes=minutes,
        )
    )
    db.add(
        LessonPackLedger(
            workspace_id=workspace_id,
            student_id=student_id,
            kind="purchase",
            reason="purchase",
            minutes=minutes,
        )
    )
    db.flush()
    return pack_summary(db, workspace_id, student_id)


def create_enquiry(db: Session, workspace_id: str, name: str, phone: str, hours: int) -> dict:
    """Owner turns a demo enquiry into a student and a pack. No syllabus fields."""
    name = (name or "").strip()
    phone = (phone or "").strip()
    if not name or not phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name and phone")
    if hours < 1:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hours")
    taken = db.query(Identity).filter(Identity.kind == "phone", Identity.value == phone).first()
    if taken:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "phone already used")
    user = User(display_name=name)
    db.add(user)
    db.flush()
    student = Student(workspace_id=workspace_id, user_id=user.id, display_name=name)
    db.add(student)
    db.flush()
    db.add(Identity(workspace_id=workspace_id, user_id=user.id, kind="phone", value=phone))
    summary = grant_pack(db, workspace_id, student.id, hours)
    return {
        "student_id": student.id,
        "name": name,
        "phone": phone,
        "hours": hours,
        **summary,
    }


def _attendance_line(db: Session, session: ScheduledSession, student_id: str) -> LessonPackLedger | None:
    return (
        db.query(LessonPackLedger)
        .filter(
            LessonPackLedger.workspace_id == session.workspace_id,
            LessonPackLedger.session_id == session.id,
            LessonPackLedger.student_id == student_id,
            LessonPackLedger.kind == "attendance",
        )
        .first()
    )


def _save_attendance_line(
    db: Session,
    session: ScheduledSession,
    student_id: str,
    reason: str,
    minutes: int,
    existing: LessonPackLedger | None = None,
) -> None:
    row = existing if existing is not None else _attendance_line(db, session, student_id)
    if row:
        row.kind = "attendance"
        row.reason = reason
        row.minutes = minutes
        return
    db.add(
        LessonPackLedger(
            workspace_id=session.workspace_id,
            student_id=student_id,
            session_id=session.id,
            kind="attendance",
            reason=reason,
            minutes=minutes,
        )
    )


def _attendance_effect(session: ScheduledSession, canon: str, *, actor_role: str, waive: bool) -> tuple[str, int]:
    span = burn_minutes(session)
    if canon in ("attended", "no_show"):
        return canon, -span
    if canon == "teacher_cancel":
        return "teacher_cancel", 0
    if canon == "student_cancel":
        forfeits = inside_notice_window(session.starts_at)
        if forfeits and waive and actor_role == "owner":
            return "waive", 0
        if forfeits:
            return "student_cancel", -span
        return "student_cancel", 0
    return canon, 0


def sync_attendance_marks(
    db: Session,
    session: ScheduledSession,
    marked: dict[str, str],
    *,
    actor_role: str,
    waive: bool,
) -> None:
    """One attendance ledger line per student. Rewriting the roll replaces that line."""
    if waive and actor_role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    existing = (
        db.query(LessonPackLedger)
        .filter(
            LessonPackLedger.workspace_id == session.workspace_id,
            LessonPackLedger.session_id == session.id,
            LessonPackLedger.kind == "attendance",
        )
        .all()
    )
    by_student: dict[str, list[LessonPackLedger]] = {}
    for row in existing:
        by_student.setdefault(row.student_id, []).append(row)
    for sid, rows in by_student.items():
        if sid not in marked:
            for row in rows:
                db.delete(row)
    for sid, raw in marked.items():
        canon = canonical_attendance(raw)
        if canon is None:
            continue
        reason, minutes = _attendance_effect(session, canon, actor_role=actor_role, waive=waive)
        rows = by_student.get(sid) or []
        if rows:
            keep = rows[0]
            keep.kind = "attendance"
            keep.reason = reason
            keep.minutes = minutes
            for extra in rows[1:]:
                db.delete(extra)
        else:
            db.add(
                LessonPackLedger(
                    workspace_id=session.workspace_id,
                    student_id=sid,
                    session_id=session.id,
                    kind="attendance",
                    reason=reason,
                    minutes=minutes,
                )
            )
    db.flush()


def note_teacher_cancel(db: Session, session: ScheduledSession) -> None:
    """Staff cancel keeps the hour. A class already marked attended or no-show stays burned."""
    from app.services.sessions import affected_students

    for sid in affected_students(db, session):
        row = _attendance_line(db, session, sid)
        if row and row.reason in ("attended", "no_show") and (row.minutes or 0) < 0:
            continue
        _save_attendance_line(db, session, sid, "teacher_cancel", 0, existing=row)
    db.flush()


def note_student_cancel(db: Session, session: ScheduledSession, *, actor_role: str, waive: bool) -> None:
    if waive and actor_role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    from app.services.sessions import affected_students

    reason, minutes = _attendance_effect(session, "student_cancel", actor_role=actor_role, waive=waive)
    for sid in affected_students(db, session):
        _save_attendance_line(db, session, sid, reason, minutes)
    db.flush()


def apply_reschedule(
    db: Session,
    session: ScheduledSession,
    *,
    actor_role: str,
    new_start: datetime,
    waive: bool,
) -> str | None:
    """Judge the old start. Returns stays or used when the start actually moves."""
    old = _aware(session.starts_at)
    new = _aware(new_start)
    if old is not None and new is not None and abs((old - new).total_seconds()) < 1:
        return None
    if waive and actor_role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    inside = inside_notice_window(old)
    waived = inside and waive and actor_role == "owner"
    used = inside and not waived
    from app.services.sessions import affected_students

    for sid in affected_students(db, session):
        db.add(
            LessonPackLedger(
                workspace_id=session.workspace_id,
                student_id=sid,
                session_id=session.id,
                kind="move",
                reason="waive" if waived else "reschedule",
                minutes=-burn_minutes(session) if used else 0,
            )
        )
    db.flush()
    return "used" if used else "stays"


def _linked_student(db: Session, principal: Principal) -> Student:
    ids = sorted(linked_student_ids(db, principal))
    if not ids:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    packed = {
        row.student_id
        for row in db.query(LessonPack)
        .filter(LessonPack.workspace_id == principal.workspace_id, LessonPack.student_id.in_(ids))
        .all()
    }
    chosen = next((sid for sid in ids if sid in packed), ids[0])
    student = db.get(Student, chosen)
    if not student or student.workspace_id != principal.workspace_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    return student


def _linked_teacher(db: Session, workspace_id: str, student_id: str) -> str | None:
    now = _now()
    rows = (
        db.query(ScheduledSession)
        .filter(
            ScheduledSession.workspace_id == workspace_id,
            ScheduledSession.student_id == student_id,
            ScheduledSession.teacher_user_id.isnot(None),
        )
        .all()
    )
    live = [row for row in rows if (row.status or "") not in ("cancelled", "declined") and row.starts_at]
    live.sort(key=lambda row: _aware(row.starts_at) or now)
    future = [row for row in live if (_aware(row.starts_at) or now) >= now]
    if future:
        return future[0].teacher_user_id
    if live:
        return live[-1].teacher_user_id
    found = sorted(teachers_for_student(db, workspace_id, student_id))
    return found[0] if found else None


def _clock(day: date, hhmm: str | None) -> datetime | None:
    text = (hhmm or "00:00").strip()
    if ":" not in text:
        return None
    hour_text, minute_text = text.split(":", 1)
    if not (hour_text.isdigit() and minute_text.isdigit()):
        return None
    hour, minute = int(hour_text), int(minute_text)
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return datetime(day.year, day.month, day.day, hour, minute, tzinfo=timezone.utc)


def _weekday(day: date) -> str:
    return datetime(day.year, day.month, day.day, 12, tzinfo=timezone.utc).strftime("%a")


def _slots_inside(day: date, start_hhmm: str | None, end_hhmm: str | None) -> list[datetime]:
    start = _clock(day, start_hhmm)
    end = _clock(day, end_hhmm)
    if start is None or end is None or end <= start:
        return []
    slot = timedelta(minutes=HOUR_MINUTES)
    cursor = start
    found: list[datetime] = []
    while cursor + slot <= end:
        found.append(cursor)
        cursor = cursor + slot
    return found


def _busy_intervals(db: Session, workspace_id: str, teacher_id: str) -> list[tuple[datetime, datetime]]:
    rows = (
        db.query(ScheduledSession)
        .filter(
            ScheduledSession.workspace_id == workspace_id,
            ScheduledSession.teacher_user_id == teacher_id,
        )
        .all()
    )
    busy: list[tuple[datetime, datetime]] = []
    for row in rows:
        if (row.status or "") in ("cancelled", "declined") or row.starts_at is None:
            continue
        start = _aware(row.starts_at)
        if start is None:
            continue
        end = _aware(row.ends_at) if row.ends_at else start + timedelta(minutes=HOUR_MINUTES)
        if end is None or end <= start:
            end = start + timedelta(minutes=HOUR_MINUTES)
        busy.append((start, end))
    return busy


def _published_slots(
    db: Session,
    workspace_id: str,
    teacher_id: str,
    now: datetime,
    horizon: datetime,
) -> list[datetime]:
    """60-minute starts inside published availability. Off blocks remove a slot they overlap."""
    rows = (
        db.query(StaffAvailability)
        .filter(
            StaffAvailability.workspace_id == workspace_id,
            StaffAvailability.user_id == teacher_id,
        )
        .all()
    )
    found: list[datetime] = []
    day = now.date()
    last = horizon.date()
    while day <= last:
        weekday = _weekday(day)
        added: list[datetime] = []
        off: list[tuple[datetime, datetime]] = []
        if rows:
            for row in rows:
                if row.kind == "window" and row.weekday == weekday and int(row.available or 0) == 1:
                    added.extend(_slots_inside(day, row.start_time, row.end_time))
                elif row.kind == "block" and row.on_date == day.isoformat():
                    if int(row.available or 0) == 1:
                        added.extend(_slots_inside(day, row.start_time, row.end_time))
                    else:
                        start = _clock(day, row.start_time)
                        end = _clock(day, row.end_time)
                        if start and end and end > start:
                            off.append((start, end))
        else:
            ws = db.get(Workspace, workspace_id)
            for window in branding_of(ws).get("availability") or []:
                if window.get("weekday") == weekday:
                    added.extend(_slots_inside(day, window.get("start"), window.get("end")))
        slot = timedelta(minutes=HOUR_MINUTES)
        for start in added:
            end = start + slot
            if not (now < start < horizon):
                continue
            if any(start < off_end and off_start < end for off_start, off_end in off):
                continue
            found.append(start)
        day = day + timedelta(days=1)
    unique = sorted(set(found))
    return unique


def _overlaps(start: datetime, busy: list[tuple[datetime, datetime]]) -> bool:
    end = start + timedelta(minutes=HOUR_MINUTES)
    return any(start < busy_end and busy_start < end for busy_start, busy_end in busy)


def _matches(start: datetime, slots: list[datetime]) -> bool:
    target = _aware(start)
    if target is None:
        return False
    return any(abs((slot - target).total_seconds()) < 1 for slot in slots)


def open_hours(db: Session, principal: Principal) -> dict:
    student = _linked_student(db, principal)
    teacher_id = _linked_teacher(db, principal.workspace_id, student.id)
    if not teacher_id:
        return {"student_id": student.id, "teacher_user_id": None, "starts": []}
    now = _now()
    horizon = now + timedelta(days=OPEN_DAYS)
    published = _published_slots(db, principal.workspace_id, teacher_id, now, horizon)
    busy = _busy_intervals(db, principal.workspace_id, teacher_id)
    starts = [slot for slot in published if not _overlaps(slot, busy)]
    return {
        "student_id": student.id,
        "teacher_user_id": teacher_id,
        "starts": [slot.isoformat() for slot in starts],
    }


def book(db: Session, principal: Principal, start: datetime) -> ScheduledSession:
    """1-on-1 hold. The hour stays on the pack until the class is delivered or forfeited."""
    student = _linked_student(db, principal)
    summary = pack_summary(db, principal.workspace_id, student.id)
    if summary["balance_minutes"] < HOUR_MINUTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "balance under 60 minutes")
    teacher_id = _linked_teacher(db, principal.workspace_id, student.id)
    if not teacher_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no teacher")
    when = _aware(start)
    if when is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start")
    now = _now()
    horizon = now + timedelta(days=OPEN_DAYS)
    published = _published_slots(db, principal.workspace_id, teacher_id, now, horizon)
    if not _matches(when, published):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "outside availability")
    busy = _busy_intervals(db, principal.workspace_id, teacher_id)
    if _overlaps(when, busy):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "overlaps a session")
    row = ScheduledSession(
        workspace_id=principal.workspace_id,
        student_id=student.id,
        teacher_user_id=teacher_id,
        title="1-on-1",
        starts_at=when,
        ends_at=when + timedelta(minutes=HOUR_MINUTES),
        status="scheduled",
    )
    db.add(row)
    db.flush()
    return row


def delivered_by_teacher(db: Session, workspace_id: str, sessions: list[ScheduledSession]) -> dict[str, list[dict]]:
    """Sessions where the student attended and the teacher was present. Hours, not a payment call."""
    if not sessions:
        return {}
    ids = [row.id for row in sessions]
    records = {
        row.session_id: row
        for row in db.query(SessionRecord)
        .filter(SessionRecord.workspace_id == workspace_id, SessionRecord.session_id.in_(ids))
        .all()
    }
    marks: dict[str, list[Attendance]] = {}
    for mark in (
        db.query(Attendance)
        .filter(Attendance.workspace_id == workspace_id, Attendance.session_id.in_(ids))
        .all()
    ):
        marks.setdefault(mark.session_id, []).append(mark)
    grouped: dict[str, list[dict]] = {}
    for row in sessions:
        if (row.status or "") in ("cancelled", "declined") or not row.teacher_user_id:
            continue
        record = records.get(row.id)
        if not record or record.teacher_status != "present":
            continue
        students = [
            mark.student_id
            for mark in marks.get(row.id, [])
            if canonical_attendance(mark.status) == "attended"
        ]
        if not students:
            continue
        minutes = burn_minutes(row)
        grouped.setdefault(row.teacher_user_id, []).append(
            {
                "session_id": row.id,
                "student_ids": students,
                "hours": round(minutes / 60, 2),
            }
        )
    return grouped
