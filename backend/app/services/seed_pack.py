"""Catalog demo rows so every wired screen has something to list. Biology is not required."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.tables import (
    Announcement,
    Assignment,
    Attempt,
    Attendance,
    AuditLog,
    AutomationRule,
    BacklogItem,
    Cohort,
    ContentItem,
    Doubt,
    Enrollment,
    Invoice,
    Message,
    NotificationDelivery,
    NotificationPref,
    ParentLink,
    Plan,
    Payout,
    PracticeSet,
    Question,
    ScheduledSession,
    SessionRecord,
    Student,
    Submission,
    Test,
    Workspace,
)
from app.services.seed import _ident_once, _put, _timeline_once, _user, cid
from app.services.seed_density import seed_density_facts
from app.services.seed_internal_v2 import seed_internal_v2


def seed_catalog_pack(
    db: Session,
    *,
    ws_id: str,
    slug: str,
    name: str,
    phone_prefix: str,
    topic_name: str,
    people: dict[str, str],
    when: datetime,
) -> dict:
    tag = ws_id.split("-")[1]
    student_id = cid(tag, 20)
    student2_id = cid(tag, 40)
    student3_id = cid(tag, 66)
    student2_user = f"bbbbbbbb-{tag}-4000-8000-000000000015"
    student3_user = f"bbbbbbbb-{tag}-4000-8000-000000000016"
    cohort_id = cid(tag, 21)
    empty_cohort_id = cid(tag, 67)
    session_id = cid(tag, 22)
    session_next_id = cid(tag, 53)
    session_draft_id = cid(tag, 73)
    topic_id = cid(tag, 24)
    q1 = cid(tag, 25)
    q2 = cid(tag, 42)
    q3 = cid(tag, 77)
    set_id = cid(tag, 26)
    empty_set_id = cid(tag, 76)
    plan_id = cid(tag, 28)
    plan_term_id = cid(tag, 81)
    asg_id = cid(tag, 29)
    asg_open_id = cid(tag, 74)
    test_id = cid(tag, 30)
    thread_id = f"thread-{slug}"
    thread2_id = f"thread-{slug}-s2"

    ws = db.get(Workspace, ws_id)
    if ws:
        ws.branding = {"accent": "#2E7D4F", "tagline": name}
        ws.integrations = ["calendar_video"]

    _user(db, student2_user, f"{slug} student 2")
    db.flush()
    _put(
        db,
        Student,
        student2_id,
        workspace_id=ws_id,
        user_id=student2_user,
        display_name=f"{slug} student 2",
    )
    _ident_once(db, ws_id, student2_user, "phone", f"{phone_prefix}s2")
    _ident_once(db, ws_id, student2_user, "email", f"student2@{slug}.sim")
    if not (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == ws_id,
            Enrollment.cohort_id == cohort_id,
            Enrollment.student_id == student2_id,
        )
        .first()
    ):
        db.add(Enrollment(workspace_id=ws_id, cohort_id=cohort_id, student_id=student2_id))
        db.flush()

    _user(db, student3_user, f"{slug} student 3 (unenrolled)")
    db.flush()
    _put(
        db,
        Student,
        student3_id,
        workspace_id=ws_id,
        user_id=student3_user,
        display_name=f"{slug} student 3 (unenrolled)",
    )
    _ident_once(db, ws_id, student3_user, "phone", f"{phone_prefix}s3")
    _ident_once(db, ws_id, student3_user, "email", f"student3@{slug}.sim")
    _put(db, Cohort, empty_cohort_id, workspace_id=ws_id, name=f"{name} overflow")
    if not db.query(ParentLink).filter(ParentLink.token == f"link-{slug}-pending").first():
        db.add(
            ParentLink(
                workspace_id=ws_id,
                student_id=student2_id,
                parent_user_id=None,
                token=f"link-{slug}-pending",
                accepted_at=None,
            )
        )
        db.flush()

    _put(
        db,
        ScheduledSession,
        session_next_id,
        workspace_id=ws_id,
        cohort_id=cohort_id,
        teacher_user_id=people["teacher"],
        title="Upcoming class",
        starts_at=when + timedelta(days=7),
        join_token=f"join-{slug}-next",
        video_url=f"mock://meet/{session_next_id}",
        recording_url=None,
        engagement=[],
    )
    _put(
        db,
        ScheduledSession,
        session_draft_id,
        workspace_id=ws_id,
        cohort_id=cohort_id,
        teacher_user_id=people["teacher"],
        title="Needs video link",
        starts_at=when + timedelta(days=14),
        join_token=None,
        video_url=None,
        recording_url=None,
        engagement=[],
    )
    _put(
        db,
        Attendance,
        cid(tag, 89),
        workspace_id=ws_id,
        session_id=session_id,
        student_id=student_id,
        status="present",
    )
    _put(
        db,
        Attendance,
        cid(tag, 90),
        workspace_id=ws_id,
        session_id=session_id,
        student_id=student2_id,
        status="absent",
    )

    _put(
        db,
        SessionRecord,
        cid(tag, 44),
        workspace_id=ws_id,
        session_id=session_id,
        notes=f"{topic_name}: taught, homework issued.",
        recorded_at=when,
    )
    _put(
        db,
        Question,
        q2,
        workspace_id=ws_id,
        topic_id=topic_id,
        stem=f"{topic_name} follow-up",
        choices=["A", "B", "C"],
        answer="B",
        created_by=people["teacher"],
    )
    pset = db.get(PracticeSet, set_id)
    if pset and q2 not in (pset.question_ids or []):
        pset.question_ids = list(pset.question_ids or []) + [q2]
    _put(
        db,
        Question,
        q3,
        workspace_id=ws_id,
        topic_id=topic_id,
        stem=f"{topic_name} unused bank item",
        choices=["A", "B", "C"],
        answer="C",
        created_by=people["teacher"],
    )
    _put(
        db,
        PracticeSet,
        empty_set_id,
        workspace_id=ws_id,
        title=f"{topic_name} empty set",
        question_ids=[],
        created_by=people["teacher"],
    )
    _put(
        db,
        ContentItem,
        cid(tag, 78),
        workspace_id=ws_id,
        topic_id=topic_id,
        title=f"{topic_name} handout",
        body="PDF path is mock storage.",
        storage_path=f"mock://files/{slug}/handout.pdf",
        created_by=people["teacher"],
    )
    _put(db, Plan, plan_term_id, workspace_id=ws_id, name="Term", amount_cents=15000, interval="term")
    _put(
        db,
        AutomationRule,
        cid(tag, 79),
        workspace_id=ws_id,
        name="Disabled ping",
        trigger="assignment_graded",
        action="timeline",
        enabled=0,
    )

    _put(
        db,
        Test,
        test_id,
        workspace_id=ws_id,
        title=f"{topic_name} test",
        question_ids=[q1, q2],
        cohort_id=cohort_id,
        created_by=people["teacher"],
    )
    _put(
        db,
        Assignment,
        asg_id,
        workspace_id=ws_id,
        cohort_id=cohort_id,
        title=f"{topic_name} homework",
        body="Submit a short note.",
        created_by=people["teacher"],
    )
    _put(
        db,
        Submission,
        cid(tag, 51),
        workspace_id=ws_id,
        assignment_id=asg_id,
        student_id=student_id,
        body="Done.",
        grade="A",
        feedback="Clear work.",
        graded_at=when,
    )
    _put(
        db,
        Assignment,
        asg_open_id,
        workspace_id=ws_id,
        cohort_id=cohort_id,
        title=f"{topic_name} worksheet (ungraded)",
        body="Student 2 submitted; grade on assign-grade.",
        created_by=people["teacher"],
    )
    _put(
        db,
        Submission,
        cid(tag, 75),
        workspace_id=ws_id,
        assignment_id=asg_open_id,
        student_id=student2_id,
        body="Draft answers.",
        grade=None,
        feedback="",
        graded_at=None,
    )
    _put(
        db,
        Attempt,
        cid(tag, 31),
        workspace_id=ws_id,
        student_id=student_id,
        practice_set_id=set_id,
        answers={q1: "A"},
        score=1,
        max_score=2,
        created_at=when,
    )
    _put(
        db,
        Attempt,
        cid(tag, 32),
        workspace_id=ws_id,
        student_id=student_id,
        test_id=test_id,
        answers={q1: "A", q2: "B"},
        score=2,
        max_score=2,
        created_at=when,
    )
    _put(
        db,
        Attempt,
        cid(tag, 50),
        workspace_id=ws_id,
        student_id=student2_id,
        practice_set_id=set_id,
        answers={q1: "B", q2: "A"},
        score=0,
        max_score=2,
        created_at=when,
    )
    _put(
        db,
        Doubt,
        cid(tag, 33),
        workspace_id=ws_id,
        student_id=student_id,
        topic_id=topic_id,
        body=f"Question on {topic_name}?",
        status="open",
        answer="",
        created_at=when,
    )
    _put(
        db,
        Doubt,
        cid(tag, 34),
        workspace_id=ws_id,
        student_id=student_id,
        topic_id=topic_id,
        body="Earlier doubt, already answered.",
        status="answered",
        answer="See the notes in the library.",
        created_at=when,
    )
    _put(
        db,
        Doubt,
        cid(tag, 83),
        workspace_id=ws_id,
        student_id=student2_id,
        topic_id=topic_id,
        body="Student 2 open doubt.",
        status="open",
        answer="",
        created_at=when,
    )
    _put(
        db,
        Message,
        cid(tag, 45),
        workspace_id=ws_id,
        thread_id=thread_id,
        student_id=student_id,
        sender_user_id=people["teacher"],
        body="How is practice going?",
        created_at=when,
    )
    _put(
        db,
        Message,
        cid(tag, 46),
        workspace_id=ws_id,
        thread_id=thread_id,
        student_id=student_id,
        sender_user_id=people["parent"],
        body="They finished the set.",
        created_at=when,
    )
    _put(
        db,
        Message,
        cid(tag, 84),
        workspace_id=ws_id,
        thread_id=thread2_id,
        student_id=student2_id,
        sender_user_id=people["teacher"],
        body="Catch up on the missed class.",
        created_at=when,
    )
    _put(
        db,
        Announcement,
        cid(tag, 35),
        workspace_id=ws_id,
        cohort_id=cohort_id,
        title="This week",
        body=f"Session recorded. {topic_name} homework is out.",
        created_by=people["teacher"],
        created_at=when,
    )
    _put(
        db,
        Announcement,
        cid(tag, 87),
        workspace_id=ws_id,
        cohort_id=None,
        title="Workspace notice",
        body="Applies to every cohort in this tenant.",
        created_by=people["owner"],
        created_at=when,
    )
    default_prefs = {
        "student": {"whatsapp": False, "email": False, "push": True},
        "teacher": {"whatsapp": True, "email": True, "push": True},
        "parent": {"whatsapp": True, "email": True, "push": True},
        "admin": {"whatsapp": True, "email": True, "push": True},
    }
    _put(
        db,
        NotificationPref,
        cid(tag, 47),
        workspace_id=ws_id,
        user_id=people["student"],
        prefs=default_prefs,
    )
    _put(
        db,
        NotificationPref,
        cid(tag, 48),
        workspace_id=ws_id,
        user_id=people["parent"],
        prefs=default_prefs,
    )
    _put(
        db,
        NotificationDelivery,
        cid(tag, 49),
        workspace_id=ws_id,
        channel="whatsapp",
        to_role="teacher",
        body="Seed: session recorded (channel, not ledger).",
        status="sent",
        created_at=when,
    )
    _put(
        db,
        NotificationDelivery,
        cid(tag, 88),
        workspace_id=ws_id,
        channel="whatsapp",
        to_role="parent",
        body="Seed: skipped_quota example.",
        status="skipped_quota",
        created_at=when,
    )
    _put(
        db,
        Invoice,
        cid(tag, 36),
        workspace_id=ws_id,
        student_id=student_id,
        plan_id=plan_id,
        amount_cents=500,
        status="open",
        created_at=when,
    )
    _put(
        db,
        Invoice,
        cid(tag, 37),
        workspace_id=ws_id,
        student_id=student_id,
        plan_id=plan_id,
        amount_cents=500,
        status="paid",
        created_at=when,
    )
    _put(
        db,
        Invoice,
        cid(tag, 82),
        workspace_id=ws_id,
        student_id=student2_id,
        plan_id=plan_term_id,
        amount_cents=15000,
        status="open",
        created_at=when,
    )
    _put(db, Payout, cid(tag, 38), workspace_id=ws_id, amount_cents=250, status="pending", created_at=when)
    _put(db, Payout, cid(tag, 80), workspace_id=ws_id, amount_cents=1000, status="paid", created_at=when)
    _put(
        db,
        BacklogItem,
        cid(tag, 39),
        workspace_id=ws_id,
        student_id=student_id,
        session_id=session_id,
        title="Mentor recap",
        kind="mentor",
        status="open",
    )
    _put(
        db,
        BacklogItem,
        cid(tag, 86),
        workspace_id=ws_id,
        student_id=student2_id,
        session_id=session_next_id,
        title="Missed class follow-up",
        kind="remediate",
        status="booked",
        booked_session_id=session_next_id,
    )
    _put(
        db,
        AuditLog,
        cid(tag, 41),
        workspace_id=ws_id,
        actor_user_id=people["owner"],
        action="catalog_seed",
        payload={"slug": slug},
        created_at=when,
    )

    teacher = people["teacher"]
    student_user = people["student"]
    _timeline_once(db, ws_id, student_id, "announcement", f"Announcement: This week ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "session_recorded", f"Recorded Seed session ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "assignment_graded", f"Homework graded A ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "practice_attempted", f"Practice set scored 1/2 ({topic_name}).", student_user, when)
    _timeline_once(db, ws_id, student_id, "doubt_opened", f"Doubt opened on {topic_name}.", student_user, when)
    _timeline_once(
        db,
        ws_id,
        student2_id,
        "practice_attempted",
        f"Practice set scored 0/2 ({topic_name}).",
        student2_user,
        when,
    )
    _timeline_once(db, ws_id, student2_id, "doubt_opened", "Student 2 open doubt.", student2_user, when)
    seed_density_facts(
        db,
        ws_id=ws_id,
        slug=slug,
        topic_name=topic_name,
        people=people,
        student_id=student_id,
        student2_id=student2_id,
        cohort_id=cohort_id,
        q1=q1,
    )
    seed_internal_v2(
        db,
        ws_id=ws_id,
        slug=slug,
        phone_prefix=phone_prefix,
        people=people,
        student_id=student_id,
        student2_id=student2_id,
        cohort_id=cohort_id,
        q1=q1,
        q2=q2,
        asg_id=asg_id,
        set_id=set_id,
    )
    db.flush()
    return {
        "join_token": f"join-{slug}",
        "join_token_next": f"join-{slug}-next",
        "parent_link": f"link-{slug}",
        "parent_link_pending": f"link-{slug}-pending",
        "thread_id": thread_id,
        "student_id": student_id,
        "student2_id": student2_id,
        "student3_id": student3_id,
        "content_id": cid(tag, 27),
        "assignment_id": asg_id,
        "assignment_ungraded_id": asg_open_id,
        "test_id": test_id,
        "practice_set_id": set_id,
        "attempt_practice_id": cid(tag, 31),
        "invoice_open_id": cid(tag, 36),
        "session_next_id": session_next_id,
        "session_draft_id": session_draft_id,
        "empty_cohort_id": empty_cohort_id,
    }
