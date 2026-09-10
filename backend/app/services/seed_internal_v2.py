"""In-app v2 seed facts. Mock ports only. Called from the catalog pack."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.tables import (
    Assignment,
    Attempt,
    AutomationRule,
    ParentLink,
    Payout,
    PracticeSet,
    Question,
    ScheduledSession,
    StaffAvailability,
    StaffMembership,
    Workspace,
)
from app.services.internal_v2 import put_branding, put_meta
from app.services.seed import _ident_once, _put, _user, cid


def seed_internal_v2(
    db: Session,
    *,
    ws_id: str,
    slug: str,
    phone_prefix: str,
    people: dict[str, str],
    student_id: str,
    student2_id: str,
    cohort_id: str,
    q1: str,
    q2: str,
    asg_id: str,
    set_id: str,
) -> None:
    tag = ws_id.split("-")[1]
    now = datetime.now(timezone.utc)
    ws = db.get(Workspace, ws_id)
    if ws:
        put_branding(
            ws,
            auth_methods=["otp", "magic"],
            availability=[{"weekday": now.strftime("%a"), "start": "00:00", "end": "23:59"}],
            coupons={"SAVE10": {"percent": 10}},
            preview_mode=False,
            preview_modules=[],
        )

    from app.models.tables import Cohort

    cohort = db.get(Cohort, cohort_id)
    if cohort:
        put_meta(cohort, invite_token=f"invite-{slug}", waitlist=[student2_id])

    link = (
        db.query(ParentLink)
        .filter(ParentLink.workspace_id == ws_id, ParentLink.parent_user_id == people["parent"])
        .first()
    )
    if link:
        put_meta(link, fee_visible=True)

    parent2_id = cid(tag, 70)
    _user(db, parent2_id, f"{slug} parent 2")
    db.flush()
    _ident_once(db, ws_id, parent2_id, "phone", f"{phone_prefix}g")
    _ident_once(db, ws_id, parent2_id, "email", f"parent2@{slug}.sim")
    _put(
        db,
        ParentLink,
        cid(tag, 71),
        workspace_id=ws_id,
        student_id=student_id,
        parent_user_id=parent2_id,
        token=f"link-{slug}-g2",
        accepted_at=now,
        meta={"fee_visible": False},
    )

    assistant = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == ws_id,
            StaffMembership.user_id == people["assistant"],
        )
        .first()
    )
    if assistant:
        put_meta(assistant, modules=["A5", "B1", "B2", "B3", "B5", "D1"])

    for qid, difficulty, tags in ((q1, "core", ["weak"]), (q2, "stretch", ["review"])):
        q = db.get(Question, qid)
        if q:
            put_meta(q, difficulty=difficulty, tags=tags, usage_count=1)

    asg = db.get(Assignment, asg_id)
    if asg:
        put_meta(asg, rubric=[{"name": "Complete", "points": 5}], due_at=now.isoformat(), allow_resubmit=True)

    pset = db.get(PracticeSet, set_id)
    if pset:
        put_meta(pset, tag="weak")

    extra_miss = cid(tag, 72)
    if not db.get(Attempt, extra_miss):
        db.add(
            Attempt(
                id=extra_miss,
                workspace_id=ws_id,
                student_id=student2_id,
                practice_set_id=set_id,
                answers={},
                score=0,
                max_score=2,
            )
        )

    _put(
        db,
        AutomationRule,
        cid(tag, 73),
        workspace_id=ws_id,
        name="Missed two practices",
        trigger="miss_2_practices",
        action="backlog",
        enabled=1,
    )

    payout = db.get(Payout, cid(tag, 38))
    if payout:
        put_meta(payout, teacher_name=f"{slug} teacher", period="Sep", sessions=4)

    # 007: per-staff availability for the teacher (weekly windows + one time-off block).
    teacher_id = people["teacher"]
    has_avail = (
        db.query(StaffAvailability)
        .filter(
            StaffAvailability.workspace_id == ws_id,
            StaffAvailability.user_id == teacher_id,
        )
        .first()
    )
    if not has_avail:
        for wd in ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat"):
            db.add(
                StaffAvailability(
                    workspace_id=ws_id,
                    user_id=teacher_id,
                    kind="window",
                    weekday=wd,
                    start_time="06:00",
                    end_time="21:00",
                    available=1,
                )
            )
        db.add(
            StaffAvailability(
                workspace_id=ws_id,
                user_id=teacher_id,
                kind="block",
                on_date="2026-12-25",
                start_time="00:00",
                end_time="23:59",
                available=0,
                note="Holiday",
            )
        )

    # 007: a completed (time-passed) and a cancelled session so the list tabs have content.
    _put(
        db,
        ScheduledSession,
        cid(tag, 54),
        workspace_id=ws_id,
        cohort_id=cohort_id,
        teacher_user_id=teacher_id,
        title="Last week recap",
        starts_at=now - timedelta(days=3),
        status="scheduled",
    )
    _put(
        db,
        ScheduledSession,
        cid(tag, 55),
        workspace_id=ws_id,
        cohort_id=cohort_id,
        teacher_user_id=teacher_id,
        title="Cancelled — teacher unwell",
        starts_at=now + timedelta(days=2),
        status="cancelled",
        cancelled_at=now,
        cancel_reason="teacher unwell",
    )
    _put(
        db,
        ScheduledSession,
        cid(tag, 56),
        workspace_id=ws_id,
        student_id=student_id,
        teacher_user_id=teacher_id,
        title="1-on-1 catch-up",
        starts_at=now + timedelta(days=1, hours=2),
        status="scheduled",
    )
