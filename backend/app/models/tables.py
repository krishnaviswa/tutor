from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    """Person record. Tenant binding is memberships / students / parent_links, not this row."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    display_name: Mapped[str] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    identities: Mapped[list[Identity]] = relationship(back_populates="user")


class Identity(Base):
    __tablename__ = "identities"
    __table_args__ = (UniqueConstraint("kind", "value", name="uq_identity_kind_value"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(20))  # phone | email
    value: Mapped[str] = mapped_column(String(320))

    user: Mapped[User] = relationship(back_populates="identities")


class SessionAuth(Base):
    __tablename__ = "sessions_auth"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))
    token_jti: Mapped[str] = mapped_column(String(36), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OtpChallenge(Base):
    __tablename__ = "otp_challenges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    phone: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    consumed: Mapped[int] = mapped_column(Integer, default=0)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40))  # exam-prep | one-on-one | music
    student_whatsapp: Mapped[int] = mapped_column(Integer, default=0)
    whatsapp_paused: Mapped[int] = mapped_column(Integer, default=0)
    branding: Mapped[dict] = mapped_column(JSON, default=dict)
    integrations: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class StaffMembership(Base):
    __tablename__ = "staff_memberships"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", "role", name="uq_membership"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(20))  # owner | teacher | assistant
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    display_name: Mapped[str] = mapped_column(String(200))


class ParentLink(Base):
    __tablename__ = "parent_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    parent_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    token: Mapped[str] = mapped_column(String(64), unique=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("workspace_id", "cohort_id", "student_id", name="uq_enroll"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    cohort_id: Mapped[str] = mapped_column(ForeignKey("cohorts.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))


class ScheduledSession(Base):
    __tablename__ = "scheduled_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    cohort_id: Mapped[str] = mapped_column(ForeignKey("cohorts.id"))
    teacher_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(200))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    join_token: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recording_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    engagement: Mapped[list] = mapped_column(JSON, default=list)


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("workspace_id", "session_id", "student_id", name="uq_att"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("scheduled_sessions.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    status: Mapped[str] = mapped_column(String(20))  # present | absent


class SessionRecord(Base):
    __tablename__ = "session_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("scheduled_sessions.id"), unique=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class TranscriptEvent(Base):
    __tablename__ = "transcript_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    session_id: Mapped[str] = mapped_column(ForeignKey("scheduled_sessions.id"))
    body: Mapped[str] = mapped_column(Text)


class TimelineEvent(Base):
    __tablename__ = "timeline_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    actor_user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(80))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), unique=True)
    modules: Mapped[list] = mapped_column(JSON)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    actor_user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Taxonomy(Base):
    __tablename__ = "taxonomies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    taxonomy_id: Mapped[str] = mapped_column(ForeignKey("taxonomies.id"))
    name: Mapped[str] = mapped_column(String(200))


class UsageMeter(Base):
    __tablename__ = "usage_meters"
    __table_args__ = (UniqueConstraint("workspace_id", "meter_key", name="uq_meter"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    meter_key: Mapped[str] = mapped_column(String(40))
    used: Mapped[int] = mapped_column(Integer, default=0)
    cap: Mapped[int] = mapped_column(Integer, default=100)


class QuotaPolicy(Base):
    __tablename__ = "quota_policies"
    __table_args__ = (UniqueConstraint("workspace_id", "meter_key", name="uq_policy"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    meter_key: Mapped[str] = mapped_column(String(40))
    policy: Mapped[str] = mapped_column(String(20))  # warn | block | allow_overage



class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    storage_path: Mapped[str] = mapped_column(String(500), default="")
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    cohort_id: Mapped[str | None] = mapped_column(ForeignKey("cohorts.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Submission(Base):
    __tablename__ = "submissions"
    __table_args__ = (UniqueConstraint("workspace_id", "assignment_id", "student_id", name="uq_submission"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"))
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    body: Mapped[str] = mapped_column(Text, default="")
    grade: Mapped[str | None] = mapped_column(String(40), nullable=True)
    feedback: Mapped[str] = mapped_column(Text, default="")
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    stem: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSON, default=list)
    answer: Mapped[str] = mapped_column(String(400), default="")
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class PracticeSet(Base):
    __tablename__ = "practice_sets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(200))
    question_ids: Mapped[list] = mapped_column(JSON, default=list)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Test(Base):
    __test__ = False
    __tablename__ = "tests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(200))
    question_ids: Mapped[list] = mapped_column(JSON, default=list)
    cohort_id: Mapped[str | None] = mapped_column(ForeignKey("cohorts.id"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Attempt(Base):
    __tablename__ = "attempts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    practice_set_id: Mapped[str | None] = mapped_column(ForeignKey("practice_sets.id"), nullable=True)
    test_id: Mapped[str | None] = mapped_column(ForeignKey("tests.id"), nullable=True)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[int] = mapped_column(Integer, default=0)
    max_score: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Doubt(Base):
    __tablename__ = "doubts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    topic_id: Mapped[str | None] = mapped_column(ForeignKey("topics.id"), nullable=True)
    body: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open")
    answer: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    thread_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    sender_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    cohort_id: Mapped[str | None] = mapped_column(ForeignKey("cohorts.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class NotificationPref(Base):
    __tablename__ = "notification_prefs"
    __table_args__ = (UniqueConstraint("workspace_id", "user_id", name="uq_notif_pref"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    prefs: Mapped[dict] = mapped_column(JSON, default=dict)


class NotificationDelivery(Base):
    """Channel journal. Ledger remains timeline_events."""

    __tablename__ = "notification_deliveries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    to_role: Mapped[str] = mapped_column(String(20))
    body: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(20), default="sent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    interval: Mapped[str] = mapped_column(String(20), default="month")
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("students.id"))
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("plans.id"), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class Payout(Base):
    __tablename__ = "payouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(200))
    trigger: Mapped[str] = mapped_column(String(80), default="")
    action: Mapped[str] = mapped_column(String(80), default="")
    enabled: Mapped[int] = mapped_column(Integer, default=1)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)


class BacklogItem(Base):
    __tablename__ = "backlog_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    workspace_id: Mapped[str] = mapped_column(String(36), index=True)
    student_id: Mapped[str | None] = mapped_column(ForeignKey("students.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(ForeignKey("scheduled_sessions.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(40), default="mentor")
    status: Mapped[str] = mapped_column(String(20), default="open")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    booked_session_id: Mapped[str | None] = mapped_column(ForeignKey("scheduled_sessions.id"), nullable=True)
