from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.tables import Attendance, AutomationRule, BacklogItem, Enrollment, ScheduledSession, SessionRecord, Student, utcnow
from app.ports.mocks import MockPorts
from app.services import notify, timeline


def get_or_create_record(db: Session, workspace_id: str, session_id: str) -> SessionRecord:
    rec = (
        db.query(SessionRecord)
        .filter(SessionRecord.workspace_id == workspace_id, SessionRecord.session_id == session_id)
        .first()
    )
    if rec:
        return rec
    rec = SessionRecord(workspace_id=workspace_id, session_id=session_id, notes="")
    db.add(rec)
    db.flush()
    return rec


def patch_record(
    db: Session,
    ports: MockPorts,
    workspace_id: str,
    session: ScheduledSession,
    actor_user_id: str,
    notes: str | None,
    attendance: list[dict] | None,
    student_whatsapp_on: bool,
) -> dict:
    rec = get_or_create_record(db, workspace_id, session.id)
    if notes is not None:
        rec.notes = notes
        rec.recorded_at = utcnow()
    student_ids: list[str] = []
    if attendance is not None:
        db.query(Attendance).filter(
            Attendance.workspace_id == workspace_id,
            Attendance.session_id == session.id,
        ).delete()
        for row in attendance:
            sid = row["student_id"]
            st = (
                db.query(Student)
                .filter(Student.id == sid, Student.workspace_id == workspace_id)
                .first()
            )
            if not st:
                continue
            db.add(
                Attendance(
                    workspace_id=workspace_id,
                    session_id=session.id,
                    student_id=st.id,
                    status=row.get("status", "present"),
                )
            )
            student_ids.append(st.id)
    else:
        student_ids = [
            e.student_id
            for e in db.query(Enrollment).filter(
                Enrollment.workspace_id == workspace_id,
                Enrollment.cohort_id == session.cohort_id,
            )
        ]
    events = []
    body = f"Session recorded: {session.title}"
    for sid in student_ids:
        ev = timeline.append(
            db,
            workspace_id,
            sid,
            "session_recorded",
            body,
            actor_user_id,
        )
        events.append(ev.id)
    rules = (
        db.query(AutomationRule)
        .filter(
            AutomationRule.workspace_id == workspace_id,
            AutomationRule.trigger == "session_recorded",
            AutomationRule.enabled == 1,
        )
        .all()
    )
    for rule in rules:
        if rule.action == "backlog":
            db.add(
                BacklogItem(
                    workspace_id=workspace_id,
                    session_id=session.id,
                    title=rule.name or "After record",
                    kind="automation",
                    status="open",
                    payload={"trigger": rule.trigger, "rule_id": rule.id},
                )
            )
        else:
            for sid in student_ids:
                ev = timeline.append(
                    db,
                    workspace_id,
                    sid,
                    "automation",
                    f"Rule: {rule.name}",
                    actor_user_id,
                )
                events.append(ev.id)
    notify_result = notify.dispatch_after_timeline(
        db, ports, workspace_id, body, student_whatsapp_on
    )
    db.flush()
    return {
        "record_id": rec.id,
        "session_id": session.id,
        "notes": rec.notes,
        "timeline_event_ids": events,
        "notify": notify_result,
    }
