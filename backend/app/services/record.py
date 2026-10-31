from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Attendance, AutomationRule, BacklogItem, Enrollment, ScheduledSession, SessionRecord, Student, utcnow
from app.ports.mocks import MockPorts
from app.services import notify, timeline
from app.services.lesson_packs import canonical_attendance, sync_attendance_marks


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
    teacher_status: str | None = None,
    actor_role: str = "teacher",
    waive: bool = False,
) -> dict:
    if waive and actor_role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    rec = get_or_create_record(db, workspace_id, session.id)
    if teacher_status is not None:
        if teacher_status == "":
            rec.teacher_status = None
        elif teacher_status not in ("present", "absent"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "teacher_status")
        else:
            rec.teacher_status = teacher_status
    if notes is not None:
        rec.notes = notes
        rec.recorded_at = utcnow()
    if session.status != "cancelled":
        session.status = "completed"
        session.completed_at = utcnow()
    student_ids: list[str] = []
    if attendance is not None:
        db.query(Attendance).filter(
            Attendance.workspace_id == workspace_id,
            Attendance.session_id == session.id,
        ).delete()
        marked: dict[str, str] = {}
        for row in attendance:
            sid = row.get("student_id")
            if not sid:
                continue
            raw = row.get("status")
            if raw in (None, "", "unmarked"):
                continue
            if canonical_attendance(raw) is None:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "attendance status")
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
                    status=raw,
                )
            )
            student_ids.append(st.id)
            marked[st.id] = raw
        sync_attendance_marks(db, session, marked, actor_role=actor_role, waive=waive)
    elif session.student_id:
        student_ids = [session.student_id]
    elif session.cohort_id:
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
        "teacher_status": rec.teacher_status,
        "timeline_event_ids": events,
        "notify": notify_result,
    }
