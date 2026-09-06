"""Named operating facts on top of the catalog seed pack. No new tables."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.tables import (
    Attempt,
    Attendance,
    ContentItem,
    Doubt,
    Invoice,
    ScheduledSession,
)
from app.services.seed import _put, cid


def seed_density_facts(
    db: Session,
    *,
    ws_id: str,
    slug: str,
    topic_name: str,
    people: dict[str, str],
    student_id: str,
    student2_id: str,
    cohort_id: str,
    q1: str,
) -> None:
    tag = ws_id.split("-")[1]
    now = datetime.now(timezone.utc)
    upcoming_id = cid(tag, 53)
    next_token = f"join-{slug}-next"
    row = db.get(ScheduledSession, upcoming_id)
    if row:
        row.title = topic_name
        row.starts_at = now + timedelta(hours=6)
        if not row.join_token:
            row.join_token = next_token
        if not row.video_url:
            row.video_url = f"mock://meet/{upcoming_id}"
    else:
        db.add(
            ScheduledSession(
                id=upcoming_id,
                workspace_id=ws_id,
                cohort_id=cohort_id,
                teacher_user_id=people["teacher"],
                title=topic_name,
                starts_at=now + timedelta(hours=6),
                join_token=next_token,
                video_url=f"mock://meet/{upcoming_id}",
                engagement=[],
            )
        )
        db.flush()

    practice = db.get(Attempt, cid(tag, 31))
    if practice:
        practice.answers = {q1: "A"}
        practice.score = 1
        practice.max_score = 2
    missed = db.get(Attempt, cid(tag, 50))
    if missed:
        missed.max_score = 2
        missed.score = 0
    answered = db.get(Doubt, cid(tag, 34))
    if answered:
        answered.answer = "See the notes in the library. [clip]"

    notes = db.get(ContentItem, cid(tag, 27))
    if notes:
        notes.storage_path = json.dumps(
            {
                "kind": "notes",
                "duration_label": "14 pages",
                "progress_pct": 70,
                "notes": [
                    f"{topic_name}: core idea in the tenant notes.",
                    "Work the checks after you watch.",
                    "Ask a doubt if a step does not hold.",
                ],
            }
        )
    _put(
        db,
        ContentItem,
        cid(tag, 52),
        workspace_id=ws_id,
        topic_id=notes.topic_id if notes else None,
        title=f"{topic_name} video",
        body="Recorded walkthrough.",
        storage_path=json.dumps(
            {"kind": "video", "duration_label": "38 min", "progress_pct": 40, "notes": []}
        ),
        created_by=people["teacher"],
    )

    open_inv = db.get(Invoice, cid(tag, 36))
    if open_inv:
        open_inv.created_at = now - timedelta(days=20)
        open_inv.amount_cents = 450000
    paid_inv = db.get(Invoice, cid(tag, 37))
    if paid_inv:
        paid_inv.created_at = now - timedelta(days=40)
        paid_inv.amount_cents = 450000

    for i in range(1, 7):
        hist_id = cid(tag, 59 + i)
        _put(
            db,
            ScheduledSession,
            hist_id,
            workspace_id=ws_id,
            cohort_id=cohort_id,
            teacher_user_id=people["teacher"],
            title=f"{topic_name} · day {i}",
            starts_at=now - timedelta(days=i, hours=2),
            join_token=None,
            video_url=f"mock://meet/{hist_id}",
            recording_url=f"mock://rec/{hist_id}",
            engagement=[],
        )
        _put(
            db,
            Attendance,
            cid(tag, 90 + i),
            workspace_id=ws_id,
            session_id=hist_id,
            student_id=student_id,
            status="present" if i < 6 else "absent",
        )
        _put(
            db,
            Attendance,
            cid(tag, 96 + i),
            workspace_id=ws_id,
            session_id=hist_id,
            student_id=student2_id,
            status="present" if i <= 2 else "absent",
        )
    db.flush()
