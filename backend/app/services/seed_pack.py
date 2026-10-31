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
from app.services.seed import TENANT_HUMAN, _ident_once, _put, _timeline_once, _user, cid
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
    human = TENANT_HUMAN.get(slug, {})
    student1_name = human.get("student", f"{slug} student")
    student2_name = human.get("student2", f"{slug} student 2")
    student3_name = human.get("student3", f"{slug} student 3")
    teacher_name = human.get("teacher", f"{slug} teacher")
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

    _user(db, student2_user, student2_name)
    db.flush()
    _put(
        db,
        Student,
        student2_id,
        workspace_id=ws_id,
        user_id=student2_user,
        display_name=student2_name,
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

    _user(db, student3_user, student3_name)
    db.flush()
    _put(
        db,
        Student,
        student3_id,
        workspace_id=ws_id,
        user_id=student3_user,
        display_name=student3_name,
    )
    _ident_once(db, ws_id, student3_user, "phone", f"{phone_prefix}s3")
    _ident_once(db, ws_id, student3_user, "email", f"student3@{slug}.sim")
    _put(
        db,
        Cohort,
        empty_cohort_id,
        workspace_id=ws_id,
        name=human.get("overflow_cohort", "Weekend Fast-Track Batch"),
    )
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
        title="Projectile Motion Problem Solving",
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
        notes="Covered relative velocity and river-boat problems. Aarav solved all 4 numericals; revise graph slopes before Friday.",
        recorded_at=when,
    )
    _put(
        db,
        Question,
        q2,
        workspace_id=ws_id,
        topic_id=topic_id,
        stem="In a velocity-time graph, the slope of the line represents:",
        choices=["Displacement", "Instantaneous acceleration", "Average speed", "Net impulse"],
        answer="Instantaneous acceleration",
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
        stem="Two forces of equal magnitude F have a resultant F when the angle between them is:",
        choices=["60°", "90°", "120°", "180°"],
        answer="120°",
        created_by=people["teacher"],
    )
    _put(
        db,
        PracticeSet,
        empty_set_id,
        workspace_id=ws_id,
        title="Practice Set 2: Vector Resolution & Inclined Planes",
        question_ids=[],
        created_by=people["teacher"],
    )
    _put(
        db,
        ContentItem,
        cid(tag, 78),
        workspace_id=ws_id,
        topic_id=topic_id,
        title=f"{topic_name} — Formula Sheet & Handout (PDF)",
        body="Downloadable reference sheet covering vector resolution, projectile trajectories, and relative velocity.",
        storage_path=f"mock://files/{slug}/handout.pdf",
        created_by=people["teacher"],
    )
    _put(db, Plan, plan_term_id, workspace_id=ws_id, name="Full Term Plan", amount_cents=15000, interval="term")
    _put(
        db,
        AutomationRule,
        cid(tag, 79),
        workspace_id=ws_id,
        name="Notify parent when homework is graded",
        trigger="assignment_graded",
        action="timeline",
        enabled=0,
    )

    _put(
        db,
        Test,
        test_id,
        workspace_id=ws_id,
        title=f"{topic_name} — Weekly Checkpoint Test",
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
        title="Problem Set 1: Kinematics & Graphs",
        body="Solve problems 1–6 showing velocity-time graphs and displacement steps.",
        created_by=people["teacher"],
    )
    _put(
        db,
        Submission,
        cid(tag, 51),
        workspace_id=ws_id,
        assignment_id=asg_id,
        student_id=student_id,
        body="Submitted worked solutions for problems 1–6 with velocity-time graphs.",
        grade="A",
        feedback="Clean free-body diagrams and accurate slope calculations. Well done!",
        graded_at=when,
    )
    _put(
        db,
        Assignment,
        asg_open_id,
        workspace_id=ws_id,
        cohort_id=cohort_id,
        title="Worksheet 2: Projectile Trajectory & Range",
        body="Complete the 4 river-swimmer and inclined-projectile derivations before Friday.",
        created_by=people["teacher"],
    )
    _put(
        db,
        Submission,
        cid(tag, 75),
        workspace_id=ws_id,
        assignment_id=asg_open_id,
        student_id=student2_id,
        body="Completed questions 1–3; checking the inclined plane range derivation in Q4.",
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
        answers={q1: "Half of initial KE"},
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
        answers={q1: "Half of initial KE", q2: "Instantaneous acceleration"},
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
        answers={q1: "Zero", q2: "Displacement"},
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
        body="In problem 4, why does horizontal velocity stay constant when air resistance is ignored?",
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
        body="How do we choose the reference frame when two objects move in perpendicular directions?",
        status="answered",
        answer="Take one object as stationary and subtract its velocity vector from the other — see the worked diagram in the lecture notes. [clip]",
        created_at=when,
    )
    _put(
        db,
        Doubt,
        cid(tag, 83),
        workspace_id=ws_id,
        student_id=student2_id,
        topic_id=topic_id,
        body="When resolving weight along an inclined plane, why is gravity split into mg sin θ and mg cos θ?",
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
        body=f"{student1_name} did great on the relative velocity problems today. Please remind them to review graph slopes before Friday.",
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
        body=f"Thank you, {teacher_name}! {student1_name} finished Problem Set 1 this evening and is revising the lecture notes.",
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
        body=f"Hi {student2_name}, we missed you in today's session. The recording and formula handout are posted in the library.",
        created_at=when,
    )
    _put(
        db,
        Announcement,
        cid(tag, 35),
        workspace_id=ws_id,
        cohort_id=cohort_id,
        title="This Week: Problem Set 1 & Checkpoint Test",
        body=f"Session recording is live in the library. Problem Set 1 on {topic_name} is due before Friday's class.",
        created_by=people["teacher"],
        created_at=when,
    )
    _put(
        db,
        Announcement,
        cid(tag, 87),
        workspace_id=ws_id,
        cohort_id=None,
        title="Monthly Assessment Window Opens Friday",
        body="All batches have a 30-minute checkpoint assessment this Friday. Please review your topic notes and practice sets.",
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
        body="Class summary filed for Vectors & Relative Motion — Live Class.",
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
        body="WhatsApp notification paused by workspace quota policy.",
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
        title="1-on-1 Concept Check: Relative Velocity Graphs",
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
        title="Missed Class Follow-Up: Vector Resolution",
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
    _timeline_once(db, ws_id, student_id, "announcement", f"Announcement posted: This Week — Problem Set 1 ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "session_recorded", f"Class summary filed: Vectors & Relative Motion — Live Class ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "assignment_graded", f"Problem Set 1: Kinematics & Graphs graded A ({topic_name}).", teacher, when)
    _timeline_once(db, ws_id, student_id, "practice_attempted", f"Practice Set 1: Projectile & Relative Motion scored 1/2 ({topic_name}).", student_user, when)
    _timeline_once(db, ws_id, student_id, "doubt_opened", f"Doubt opened on {topic_name}: horizontal velocity in projectile motion.", student_user, when)
    _timeline_once(
        db,
        ws_id,
        student2_id,
        "practice_attempted",
        f"Practice Set 1: Projectile & Relative Motion scored 0/2 ({topic_name}).",
        student2_user,
        when,
    )
    _timeline_once(db, ws_id, student2_id, "doubt_opened", f"Doubt opened on {topic_name}: resolving forces on an inclined plane.", student2_user, when)
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
