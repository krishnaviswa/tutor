"""Named operating facts for dashboards. Ledger tables only; routers stay thin."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.tables import (
    Attempt,
    Attendance,
    Cohort,
    ContentItem,
    Doubt,
    Enrollment,
    Invoice,
    PracticeSet,
    Payout,
    Question,
    ScheduledSession,
    SessionRecord,
    StaffMembership,
    Student,
    Submission,
    Test,
    TimelineEvent,
    Topic,
    User,
    Workspace,
)
from app.services.auth import Principal
from app.services.internal_v2 import fee_visible_for
from app.services.scope import linked_student_ids, student_for_principal

PARENT_HUB = [
    "timeline",
    "reports",
    "practice-result",
    "payments",
    "messages",
    "notif-prefs",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    a = _aware(dt)
    return a.isoformat() if a else None


def _pct(n: float, d: float) -> int:
    if d <= 0:
        return 0
    return int(round(100.0 * n / d))


def content_meta(row: ContentItem) -> dict:
    data = dict(getattr(row, "meta", None) or {})
    raw = (row.storage_path or "").strip()
    if raw.startswith("{"):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                merged = dict(parsed)
                merged.update(data)
                return merged
        except json.JSONDecodeError:
            pass
    return data


def _practice_sets(db: Session, workspace_id: str) -> list[PracticeSet]:
    rows = db.query(PracticeSet).filter(PracticeSet.workspace_id == workspace_id).all()
    filled = [p for p in rows if p.question_ids]
    return filled or rows


def _first_practice(db: Session, workspace_id: str) -> dict | None:
    sets = _practice_sets(db, workspace_id)
    if not sets:
        return None
    pset = sets[0]
    return {"id": pset.id, "title": pset.title}


def content_out(row: ContentItem, db: Session | None = None, *, lesson: bool = False) -> dict:
    meta = content_meta(row)
    out: dict = {
        "id": row.id,
        "workspace_id": row.workspace_id,
        "topic_id": row.topic_id,
        "title": row.title,
        "body": row.body,
        "storage_path": row.storage_path,
        "kind": str(meta.get("kind") or "notes"),
        "duration_label": str(meta.get("duration_label") or ""),
        "progress_pct": int(meta.get("progress_pct") or 0),
        "playlist_ids": meta.get("playlist_ids") or [],
        "drip_at": meta.get("drip_at"),
        "views": int(meta.get("views") or 0),
    }
    if lesson:
        notes = meta.get("notes") or []
        out["notes"] = [str(n) for n in notes] if isinstance(notes, list) else []
        out["next_practice"] = _first_practice(db, row.workspace_id) if db is not None else None
    return out


def invoice_out(row: Invoice) -> dict:
    created = _aware(row.created_at) or _now()
    due = created.date()
    today = _now().date()
    paid = row.status == "paid"
    if paid:
        state = "paid"
    elif due < today:
        state = "overdue"
    else:
        state = "pending"
    return {
        "id": row.id,
        "student_id": row.student_id,
        "amount_cents": row.amount_cents,
        "status": row.status,
        "due_on": due.isoformat(),
        "label": created.strftime("%B"),
        "state": state,
        "receipt_id": f"RCT-{row.id[-4:].upper()}" if paid else None,
    }


def _enrolled_cohort_ids(db: Session, workspace_id: str, student_id: str) -> set[str]:
    rows = (
        db.query(Enrollment)
        .filter(Enrollment.workspace_id == workspace_id, Enrollment.student_id == student_id)
        .all()
    )
    return {r.cohort_id for r in rows}


def _upcoming_sessions(
    db: Session, workspace_id: str, cohort_ids: set[str] | None = None
) -> list[ScheduledSession]:
    now = _now()
    rows = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == workspace_id).all()
    out: list[ScheduledSession] = []
    for sess in rows:
        starts = _aware(sess.starts_at)
        if starts is None or starts < now:
            continue
        if cohort_ids is not None and sess.cohort_id not in cohort_ids:
            continue
        out.append(sess)
    out.sort(key=lambda s: _aware(s.starts_at) or now)
    return out


def _session_card(sess: ScheduledSession) -> dict:
    starts = _aware(sess.starts_at)
    opens = starts - timedelta(minutes=15) if starts else None
    return {
        "id": sess.id,
        "title": sess.title,
        "starts_at": _iso(starts),
        "join_opens_at": _iso(opens),
    }


def _sorted_attempts(attempts: list[Attempt]) -> list[Attempt]:
    return sorted(attempts, key=lambda a: _aware(a.created_at) or datetime.min.replace(tzinfo=timezone.utc))


def _weak_tags(db: Session, workspace_id: str, attempts: list[Attempt]) -> list[str]:
    questions = {q.id: q for q in db.query(Question).filter(Question.workspace_id == workspace_id).all()}
    topics = {t.id: t.name for t in db.query(Topic).filter(Topic.workspace_id == workspace_id).all()}
    sets = {p.id: p for p in db.query(PracticeSet).filter(PracticeSet.workspace_id == workspace_id).all()}
    tests = {t.id: t for t in db.query(Test).filter(Test.workspace_id == workspace_id).all()}
    names: list[str] = []
    seen: set[str] = set()
    for att in attempts:
        qids: list[str] = []
        if att.practice_set_id and att.practice_set_id in sets:
            qids = list(sets[att.practice_set_id].question_ids or [])
        elif att.test_id and att.test_id in tests:
            qids = list(tests[att.test_id].question_ids or [])
        answers = att.answers or {}
        for qid in qids:
            q = questions.get(qid)
            if not q:
                continue
            given = answers.get(qid)
            if given is not None and given == q.answer:
                continue
            name = topics.get(q.topic_id)
            if name and name not in seen:
                seen.add(name)
                names.append(name)
    return names[:6]


def _due_practice(
    db: Session, workspace_id: str, attempts: list[Attempt], next_sess: ScheduledSession | None
) -> dict | None:
    sets = _practice_sets(db, workspace_id)
    pset = sets[0] if sets else None
    if not pset:
        return None
    qids = list(pset.question_ids or [])
    total = len(qids) or 1
    latest = None
    for att in _sorted_attempts(attempts):
        if att.practice_set_id == pset.id:
            latest = att
    answered = len(latest.answers or {}) if latest else 0
    unanswered = max(total - answered, 0)
    due_at = None
    starts = _aware(next_sess.starts_at) if next_sess else None
    if starts:
        due_at = starts.replace(hour=23, minute=0, second=0, microsecond=0)
    return {
        "id": pset.id,
        "title": pset.title,
        "unanswered": unanswered,
        "total": total,
        "due_at": _iso(due_at),
    }


def student_dashboard(db: Session, principal: Principal) -> dict:
    st = student_for_principal(db, principal)
    ws = principal.workspace_id
    attempts = db.query(Attempt).filter(Attempt.workspace_id == ws, Attempt.student_id == st.id).all()
    last = _sorted_attempts(attempts)[-1] if attempts else None
    cohorts = _enrolled_cohort_ids(db, ws, st.id)
    upcoming = _upcoming_sessions(db, ws, cohorts)
    next_sess = upcoming[0] if upcoming else None
    tests = db.query(Test).filter(Test.workspace_id == ws).all()
    this_week = None
    if tests:
        t = tests[0]
        this_week = {
            "title": t.title,
            "starts_at": _iso(_aware(next_sess.starts_at) if next_sess else None),
            "kind": "test",
        }
    doubts = db.query(Doubt).filter(Doubt.workspace_id == ws, Doubt.student_id == st.id).all()
    doubt_card = None
    if doubts:
        ordered = sorted(doubts, key=lambda d: _aware(d.created_at) or _now(), reverse=True)
        chosen = next((d for d in ordered if d.status == "answered" and "[clip]" in (d.answer or "")), None)
        if chosen is None:
            chosen = next((d for d in ordered if d.status == "answered"), ordered[0])
        doubt_card = {
            "id": chosen.id,
            "title": (chosen.body or "").strip()[:80],
            "status": chosen.status,
            "has_clip": "[clip]" in (chosen.answer or ""),
        }
    return {
        "student_id": st.id,
        "upcoming_sessions": len(upcoming),
        "attempts": len(attempts),
        "last_score": last.score if last else None,
        "last_attempt_id": last.id if last else None,
        "next_session": _session_card(next_sess) if next_sess else None,
        "due_practice": _due_practice(db, ws, attempts, next_sess),
        "this_week": this_week,
        "doubt": doubt_card,
        "weak_tags": _weak_tags(db, ws, attempts),
    }


def _attendance_week(sessions: list[ScheduledSession], att_rows: list[Attendance]) -> list[dict]:
    now = _now()
    cutoff = now - timedelta(days=7)
    buckets: dict = {}
    for sess in sessions:
        starts = _aware(sess.starts_at)
        if starts is None or starts > now or starts < cutoff:
            continue
        buckets.setdefault(starts.date(), []).append(sess)
    week = []
    for day in sorted(buckets):
        ids = {s.id for s in buckets[day]}
        day_att = [a for a in att_rows if a.session_id in ids]
        week.append(
            {"day": day.strftime("%a"), "pct": _pct(sum(1 for a in day_att if a.status == "present"), len(day_att))}
        )
    return week


def _practice_by_set(db: Session, workspace_id: str, student_ids: list[str], attempts: list[Attempt]) -> list[dict]:
    out = []
    for pset in _practice_sets(db, workspace_id):
        qn = len(pset.question_ids or []) or 1
        done = 0.0
        for sid in student_ids:
            latest = None
            for att in _sorted_attempts(attempts):
                if att.student_id == sid and att.practice_set_id == pset.id:
                    latest = att
            if latest and latest.max_score:
                done += latest.score / latest.max_score
            elif latest:
                done += min(len(latest.answers or {}) / qn, 1.0)
        out.append({"title": pset.title, "pct": _pct(done, len(student_ids) or 1)})
    return out


def _at_risk(students: list[Student], att_rows: list[Attendance], attempts: list[Attempt]) -> list[dict]:
    att_by: dict[str, list[Attendance]] = {}
    for row in att_rows:
        att_by.setdefault(row.student_id, []).append(row)
    out = []
    for st in students:
        reasons: list[str] = []
        tone = "warn"
        rows = att_by.get(st.id, [])
        if rows:
            present = sum(1 for a in rows if a.status == "present")
            pct = _pct(present, len(rows))
            if pct < 70:
                reasons.append(f"Attendance {pct}% this fortnight")
                tone = "bad"
        practice = [a for a in attempts if a.student_id == st.id and a.practice_set_id]
        if practice and all((a.score or 0) == 0 for a in practice):
            reasons.append("Practice missed")
            tone = "bad"
        if not reasons:
            continue
        out.append(
            {
                "student_id": st.id,
                "display_name": st.display_name,
                "reason": " · ".join(reasons),
                "tone": tone,
            }
        )
    return out


def teacher_dashboard(db: Session, principal: Principal) -> dict:
    ws = principal.workspace_id
    sessions = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == ws).all()
    students = db.query(Student).filter(Student.workspace_id == ws).all()
    attempts = db.query(Attempt).filter(Attempt.workspace_id == ws).all()
    att_rows = db.query(Attendance).filter(Attendance.workspace_id == ws).all()
    cohort = None
    size = 0
    for row in db.query(Cohort).filter(Cohort.workspace_id == ws).all():
        n = (
            db.query(Enrollment)
            .filter(Enrollment.workspace_id == ws, Enrollment.cohort_id == row.id)
            .count()
        )
        if cohort is None or n > size:
            cohort, size = row, n
    present = sum(1 for a in att_rows if a.status == "present")
    open_doubts = db.query(Doubt).filter(Doubt.workspace_id == ws, Doubt.status == "open").count()
    return {
        "sessions": len(sessions),
        "students": len(students),
        "attempts": len(attempts),
        "cohort": {"id": cohort.id, "name": cohort.name, "size": size} if cohort else None,
        "attendance_pct": _pct(present, len(att_rows)),
        "attendance_week": _attendance_week(sessions, att_rows),
        "practice_by_set": _practice_by_set(db, ws, [s.id for s in students], attempts),
        "doubt_backlog": open_doubts,
        "at_risk": _at_risk(students, att_rows, attempts),
    }


def _practice_pct(students: list[Student], attempts: list[Attempt]) -> int:
    if not students:
        return 0
    total = 0.0
    for st in students:
        latest = None
        for att in _sorted_attempts(attempts):
            if att.student_id == st.id and att.practice_set_id:
                latest = att
        if latest and latest.max_score:
            total += latest.score / latest.max_score
        elif latest:
            total += 1.0 if latest.score else 0.0
    return _pct(total, len(students))


def _doubt_sla_pct(doubts: list[Doubt]) -> int:
    if not doubts:
        return 100
    now = _now()
    met = 0
    for d in doubts:
        created = _aware(d.created_at) or now
        if d.status == "answered" or (now - created) < timedelta(hours=24):
            met += 1
    return _pct(met, len(doubts))


def owner_density(db: Session, workspace_id: str) -> dict:
    sessions = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == workspace_id).all()
    students = db.query(Student).filter(Student.workspace_id == workspace_id).all()
    attempts = db.query(Attempt).filter(Attempt.workspace_id == workspace_id).all()
    doubts = db.query(Doubt).filter(Doubt.workspace_id == workspace_id).all()
    invoices = db.query(Invoice).filter(Invoice.workspace_id == workspace_id).all()
    att_rows = db.query(Attendance).filter(Attendance.workspace_id == workspace_id).all()
    now = _now()
    done = sum(1 for s in sessions if _aware(s.starts_at) and _aware(s.starts_at) < now)
    revenue = sum(i.amount_cents for i in invoices)
    collected = sum(i.amount_cents for i in invoices if i.status == "paid")
    at_risk = _at_risk(students, att_rows, attempts)
    sla = _doubt_sla_pct(doubts)
    teachers_out = []
    memberships = (
        db.query(StaffMembership)
        .filter(StaffMembership.workspace_id == workspace_id, StaffMembership.role == "teacher")
        .all()
    )
    for m in memberships:
        user = db.get(User, m.user_id)
        taught = sum(1 for s in sessions if s.teacher_user_id == m.user_id)
        teachers_out.append({"name": user.display_name if user else "Teacher", "sessions": taught, "sla_pct": sla})
    payouts = db.query(Payout).filter(Payout.workspace_id == workspace_id).all()
    payout_sum = sum(p.amount_cents for p in payouts)
    pnl = []
    for cohort in db.query(Cohort).filter(Cohort.workspace_id == workspace_id).all():
        enrolled = {
            e.student_id
            for e in db.query(Enrollment).filter(
                Enrollment.workspace_id == workspace_id, Enrollment.cohort_id == cohort.id
            )
        }
        in_cents = sum(i.amount_cents for i in invoices if i.student_id in enrolled)
        margin = _pct(max(in_cents - payout_sum, 0), in_cents) if in_cents else 0
        pnl.append({"name": cohort.name, "in_cents": in_cents, "margin_pct": margin})
    return {
        "scorecard": {
            "sessions_done": done,
            "sessions_plan": len(sessions),
            "active_students": len(students),
            "practice_pct": _practice_pct(students, attempts),
            "doubt_sla_pct": sla,
            "revenue_cents": revenue,
            "collected_pct": _pct(collected, revenue) if revenue else 0,
            "churn_risk": len(at_risk),
        },
        "teachers": teachers_out,
        "cohort_pnl": pnl,
    }


def owner_console(db: Session, principal: Principal) -> dict:
    ws = db.get(Workspace, principal.workspace_id)
    density = owner_density(db, principal.workspace_id)
    return {
        "workspace": {"id": ws.id, "name": ws.name, "slug": ws.slug} if ws else None,
        **density,
    }


def _latest_timeline(db: Session, workspace_id: str, student_id: str) -> TimelineEvent | None:
    rows = (
        db.query(TimelineEvent)
        .filter(TimelineEvent.workspace_id == workspace_id, TimelineEvent.student_id == student_id)
        .all()
    )
    if not rows:
        return None
    rows.sort(key=lambda e: _aware(e.created_at) or _now())
    return rows[-1]


def _fee_due(invoices: list[Invoice]) -> dict | None:
    unpaid = [i for i in invoices if i.status != "paid"]
    if not unpaid:
        return None
    unpaid.sort(key=lambda i: _aware(i.created_at) or _now())
    row = unpaid[0]
    out = invoice_out(row)
    return {"amount_cents": out["amount_cents"], "due_on": out["due_on"], "status": out["state"]}


def child_slice(db: Session, workspace_id: str, st: Student, *, fee_visible: bool = True) -> dict:
    att_rows = (
        db.query(Attendance)
        .filter(Attendance.workspace_id == workspace_id, Attendance.student_id == st.id)
        .all()
    )
    present = sum(1 for a in att_rows if a.status == "present")
    attempts = db.query(Attempt).filter(Attempt.workspace_id == workspace_id, Attempt.student_id == st.id).all()
    practice = None
    test = None
    for att in reversed(_sorted_attempts(attempts)):
        if practice is None and att.practice_set_id:
            pset = db.get(PracticeSet, att.practice_set_id)
            qn = len((pset.question_ids if pset else []) or []) or att.max_score or 1
            practice = {"score": att.score, "total": qn, "title": pset.title if pset else "Practice"}
        if test is None and att.test_id:
            t = db.get(Test, att.test_id)
            test = {"score": att.score, "max": att.max_score, "title": t.title if t else "Test"}
        if practice and test:
            break
    invoices = db.query(Invoice).filter(Invoice.workspace_id == workspace_id, Invoice.student_id == st.id).all()
    event = _latest_timeline(db, workspace_id, st.id)
    return {
        "student_id": st.id,
        "display_name": st.display_name,
        "attendance": {"present": present, "total": len(att_rows)},
        "latest_practice": practice,
        "latest_test": test,
        "fee_due": _fee_due(invoices) if fee_visible else None,
        "fee_visible": fee_visible,
        "activity_summary": (event.body if event else "No activity yet.")[:120],
    }


def parent_home(db: Session, principal: Principal) -> dict:
    allowed = linked_student_ids(db, principal)
    children = []
    for sid in allowed:
        st = db.get(Student, sid)
        if st and st.workspace_id == principal.workspace_id:
            children.append(
                child_slice(
                    db,
                    principal.workspace_id,
                    st,
                    fee_visible=fee_visible_for(db, principal, st.id),
                )
            )
    return {"children": children, "hub": list(PARENT_HUB)}


def _teacher_note(db: Session, workspace_id: str, student_id: str) -> str:
    sub = (
        db.query(Submission)
        .filter(Submission.workspace_id == workspace_id, Submission.student_id == student_id)
        .all()
    )
    graded = [s for s in sub if s.feedback]
    if graded:
        graded.sort(key=lambda s: _aware(s.graded_at) or _now())
        return graded[-1].feedback
    rec = db.query(SessionRecord).filter(SessionRecord.workspace_id == workspace_id).all()
    if rec:
        rec.sort(key=lambda r: _aware(r.recorded_at) or _now())
        return rec[-1].notes
    return ""


def report_slice(db: Session, workspace_id: str, student_ids: set[str] | None) -> list[dict]:
    q = db.query(Student).filter(Student.workspace_id == workspace_id)
    if student_ids is not None:
        q = q.filter(Student.id.in_(student_ids or [""]))
    students = q.all()
    ids = [s.id for s in students]
    attempts = (
        db.query(Attempt)
        .filter(Attempt.workspace_id == workspace_id, Attempt.student_id.in_(ids or [""]))
        .all()
    )
    att_rows = (
        db.query(Attendance)
        .filter(Attendance.workspace_id == workspace_id, Attendance.student_id.in_(ids or [""]))
        .all()
    )
    by_attempts: dict[str, list[Attempt]] = {}
    for a in attempts:
        by_attempts.setdefault(a.student_id, []).append(a)
    present = {s.id: 0 for s in students}
    total_att = {s.id: 0 for s in students}
    for row in att_rows:
        total_att[row.student_id] = total_att.get(row.student_id, 0) + 1
        if row.status == "present":
            present[row.student_id] = present.get(row.student_id, 0) + 1
    out = []
    for s in students:
        atts = _sorted_attempts(by_attempts.get(s.id, []))
        last = atts[-1] if atts else None
        latest_test = None
        practice_score = 0.0
        practice_n = 0
        for att in reversed(atts):
            if latest_test is None and att.test_id:
                t = db.get(Test, att.test_id)
                latest_test = {"score": att.score, "max": att.max_score, "title": t.title if t else "Test"}
            if att.practice_set_id and att.max_score:
                practice_score += att.score / att.max_score
                practice_n += 1
        out.append(
            {
                "student_id": s.id,
                "display_name": s.display_name,
                "attempts": len(atts),
                "last_score": last.score if last else None,
                "last_max": last.max_score if last else None,
                "attendance_present": present.get(s.id, 0),
                "attendance_total": total_att.get(s.id, 0),
                "attendance": {"present": present.get(s.id, 0), "total": total_att.get(s.id, 0)},
                "practice_pct": _pct(practice_score, practice_n or 1) if practice_n else 0,
                "latest_test": latest_test,
                "teacher_note": _teacher_note(db, workspace_id, s.id),
            }
        )
    return out
