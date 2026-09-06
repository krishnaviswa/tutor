"""Deterministic seeds for 002-sim-spine. Biology is not required."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.tables import (
    AutomationRule,
    Cohort,
    ContentItem,
    Enrollment,
    FeatureFlag,
    Identity,
    ParentLink,
    Plan,
    PracticeSet,
    Question,
    QuotaPolicy,
    ScheduledSession,
    StaffMembership,
    Student,
    Taxonomy,
    Topic,
    UsageMeter,
    User,
    Workspace,
)
from app.services.quota import ALWAYS_ON

CATALOG_MODULES = list(ALWAYS_ON) + [
    "A4",
    "A5",
    "B1",
    "B2",
    "B3",
    "B4",
    "B5",
    "B6",
    "C1",
    "C2",
    "C3",
    "C4",
    "C5",
    "D1",
    "D2",
    "D3",
    "D5",
    "E1",
    "E2",
    "E3",
    "E4",
    "E5",
    "F1",
    "F3",
    "F5",
    "F6",
    "G3",
    "G4",
    "G5",
]
SLICE_MODULES = list(CATALOG_MODULES)

WS_EXAM = "aaaaaaaa-0001-4000-8000-000000000001"
WS_LANG = "aaaaaaaa-0002-4000-8000-000000000002"
WS_MUSIC = "aaaaaaaa-0003-4000-8000-000000000003"

METERS = ("whatsapp", "sms", "email", "storage", "seats", "students", "hosted_minutes", "stt")


def _user(db: Session, uid: str, name: str) -> User:
    existing = db.get(User, uid)
    if existing:
        return existing
    u = User(id=uid, display_name=name)
    db.add(u)
    return u


def _ident(db: Session, workspace_id: str, user_id: str, kind: str, value: str) -> None:
    db.add(Identity(workspace_id=workspace_id, user_id=user_id, kind=kind, value=value))


def _meters(db: Session, workspace_id: str, whatsapp_used: int, whatsapp_cap: int, policy: str) -> None:
    for key in METERS:
        used = whatsapp_used if key == "whatsapp" else 0
        cap = whatsapp_cap if key == "whatsapp" else 1000
        pol = policy if key in ("whatsapp", "sms", "email") else "warn"
        db.add(UsageMeter(workspace_id=workspace_id, meter_key=key, used=used, cap=cap))
        db.add(QuotaPolicy(workspace_id=workspace_id, meter_key=key, policy=pol))


def _people(prefix: str) -> dict[str, str]:
    return {
        "owner": f"{prefix}-0000-4000-8000-000000000010",
        "teacher": f"{prefix}-0000-4000-8000-000000000011",
        "assistant": f"{prefix}-0000-4000-8000-000000000012",
        "student": f"{prefix}-0000-4000-8000-000000000013",
        "parent": f"{prefix}-0000-4000-8000-000000000014",
    }


def seed_workspace(
    db: Session,
    *,
    ws_id: str,
    slug: str,
    name: str,
    kind: str,
    phone_prefix: str,
    topic_name: str,
    whatsapp_used: int,
    whatsapp_cap: int,
    policy: str,
    starts_at: datetime,
) -> dict:
    ids = _people(ws_id[:8])
    # people ids must be valid uuid. Use explicit constants instead.
    return seed_workspace_ids(
        db,
        ws_id=ws_id,
        slug=slug,
        name=name,
        kind=kind,
        phone_prefix=phone_prefix,
        topic_name=topic_name,
        whatsapp_used=whatsapp_used,
        whatsapp_cap=whatsapp_cap,
        policy=policy,
        starts_at=starts_at,
        people=ids,
    )


def seed_workspace_ids(
    db: Session,
    *,
    ws_id: str,
    slug: str,
    name: str,
    kind: str,
    phone_prefix: str,
    topic_name: str,
    whatsapp_used: int,
    whatsapp_cap: int,
    policy: str,
    starts_at: datetime,
    people: dict[str, str],
) -> dict:
    db.add(Workspace(id=ws_id, slug=slug, name=name, kind=kind, student_whatsapp=0))
    roles_staff = {"owner": people["owner"], "teacher": people["teacher"], "assistant": people["assistant"]}
    labels = {
        people["owner"]: f"{slug} owner",
        people["teacher"]: f"{slug} teacher",
        people["assistant"]: f"{slug} assistant",
        people["student"]: f"{slug} student",
        people["parent"]: f"{slug} parent",
    }
    for uid, label in labels.items():
        _user(db, uid, label)
    db.flush()
    for role, uid in roles_staff.items():
        db.add(StaffMembership(workspace_id=ws_id, user_id=uid, role=role))
        _ident(db, ws_id, uid, "phone", f"{phone_prefix}{role[0]}")
        _ident(db, ws_id, uid, "email", f"{role}@{slug}.sim")
    _ident(db, ws_id, people["student"], "phone", f"{phone_prefix}s")
    _ident(db, ws_id, people["student"], "email", f"student@{slug}.sim")
    _ident(db, ws_id, people["parent"], "phone", f"{phone_prefix}p")
    _ident(db, ws_id, people["parent"], "email", f"parent@{slug}.sim")

    tag = ws_id.split("-")[1]
    student_id = f"cccccccc-{tag}-4000-8000-000000000020"
    cohort_id = f"cccccccc-{tag}-4000-8000-000000000021"
    session_id = f"cccccccc-{tag}-4000-8000-000000000022"
    tax_id = f"cccccccc-{tag}-4000-8000-000000000023"
    topic_id = f"cccccccc-{tag}-4000-8000-000000000024"
    link_token = f"link-{slug}"

    db.add(Student(id=student_id, workspace_id=ws_id, user_id=people["student"], display_name=labels[people["student"]]))
    db.add(Cohort(id=cohort_id, workspace_id=ws_id, name=f"{name} cohort"))
    db.flush()
    db.add(Enrollment(workspace_id=ws_id, cohort_id=cohort_id, student_id=student_id))
    db.flush()
    db.add(
        ScheduledSession(
            id=session_id,
            workspace_id=ws_id,
            cohort_id=cohort_id,
            teacher_user_id=people["teacher"],
            title="Seed session",
            starts_at=starts_at,
        )
    )
    db.add(
        ParentLink(
            workspace_id=ws_id,
            student_id=student_id,
            parent_user_id=people["parent"],
            token=link_token,
            accepted_at=starts_at,
        )
    )
    db.add(Taxonomy(id=tax_id, workspace_id=ws_id, name="Course outline"))
    db.flush()
    db.add(Topic(id=topic_id, workspace_id=ws_id, taxonomy_id=tax_id, name=topic_name))
    db.add(FeatureFlag(workspace_id=ws_id, modules=SLICE_MODULES))
    db.flush()
    qid = f"cccccccc-{tag}-4000-8000-000000000025"
    db.add(
        Question(
            id=qid,
            workspace_id=ws_id,
            topic_id=topic_id,
            stem=f"{topic_name} check",
            choices=["A", "B"],
            answer="A",
            created_by=people["teacher"],
        )
    )
    db.add(
        PracticeSet(
            id=f"cccccccc-{tag}-4000-8000-000000000026",
            workspace_id=ws_id,
            title=f"{topic_name} set",
            question_ids=[qid],
            created_by=people["teacher"],
        )
    )
    db.add(
        ContentItem(
            workspace_id=ws_id,
            topic_id=topic_id,
            title=f"{topic_name} notes",
            body="Seed material",
            created_by=people["teacher"],
        )
    )
    db.add(Plan(workspace_id=ws_id, name="Seat", amount_cents=500))
    db.add(
        AutomationRule(
            workspace_id=ws_id,
            name="After record ping",
            trigger="session_recorded",
            action="timeline",
            enabled=1,
        )
    )
    _meters(db, ws_id, whatsapp_used, whatsapp_cap, policy)
    db.flush()
    return {
        "workspace_id": ws_id,
        "people": people,
        "student_id": student_id,
        "cohort_id": cohort_id,
        "session_id": session_id,
        "phones": {
            "owner": f"{phone_prefix}o",
            "teacher": f"{phone_prefix}t",
            "assistant": f"{phone_prefix}a",
            "student": f"{phone_prefix}s",
            "parent": f"{phone_prefix}p",
        },
    }


PEOPLE_EXAM = {
    "owner": "bbbbbbbb-0001-4000-8000-000000000010",
    "teacher": "bbbbbbbb-0001-4000-8000-000000000011",
    "assistant": "bbbbbbbb-0001-4000-8000-000000000012",
    "student": "bbbbbbbb-0001-4000-8000-000000000013",
    "parent": "bbbbbbbb-0001-4000-8000-000000000014",
}
PEOPLE_LANG = {
    "owner": "bbbbbbbb-0002-4000-8000-000000000010",
    "teacher": "bbbbbbbb-0002-4000-8000-000000000011",
    "assistant": "bbbbbbbb-0002-4000-8000-000000000012",
    "student": "bbbbbbbb-0002-4000-8000-000000000013",
    "parent": "bbbbbbbb-0002-4000-8000-000000000014",
}
PEOPLE_MUSIC = {
    "owner": "bbbbbbbb-0003-4000-8000-000000000010",
    "teacher": "bbbbbbbb-0003-4000-8000-000000000011",
    "assistant": "bbbbbbbb-0003-4000-8000-000000000012",
    "student": "bbbbbbbb-0003-4000-8000-000000000013",
    "parent": "bbbbbbbb-0003-4000-8000-000000000014",
}


def seed_all(db: Session) -> dict:
    if db.get(Workspace, WS_EXAM):
        return {"already": True}
    when = datetime(2026, 9, 5, 12, 0, tzinfo=timezone.utc)
    exam = seed_workspace_ids(
        db,
        ws_id=WS_EXAM,
        slug="exam-prep",
        name="Coaching exam-prep",
        kind="exam-prep",
        phone_prefix="+9101",
        topic_name="Unit 1",
        whatsapp_used=80,
        whatsapp_cap=100,
        policy="warn",
        starts_at=when,
        people=PEOPLE_EXAM,
    )
    lang = seed_workspace_ids(
        db,
        ws_id=WS_LANG,
        slug="language-1on1",
        name="Language 1-on-1",
        kind="one-on-one",
        phone_prefix="+9102",
        topic_name="Conversation",
        whatsapp_used=100,
        whatsapp_cap=100,
        policy="block",
        starts_at=when,
        people=PEOPLE_LANG,
    )
    music = seed_workspace_ids(
        db,
        ws_id=WS_MUSIC,
        slug="music",
        name="Music studio",
        kind="music",
        phone_prefix="+9103",
        topic_name="Scales",
        whatsapp_used=10,
        whatsapp_cap=100,
        policy="warn",
        starts_at=when,
        people=PEOPLE_MUSIC,
    )
    db.commit()
    return {"exam": exam, "lang": lang, "music": music}
