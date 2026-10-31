"""Content library filing. Board, subject, and unit are workspace topics."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import ContentItem, ScheduledSession, Taxonomy, Topic
from app.ports.mocks import MockPorts
from app.services import quota as quota_svc
from app.services.auth import Principal
from app.services.internal_v2 import put_meta

ALLOWED_KINDS = {
    "png",
    "svg",
    "pdf",
    "drawio",
    "office",
    "doc",
    "docx",
    "ppt",
    "pptx",
    "xls",
    "xlsx",
    "odt",
    "odp",
    "ods",
}

OFFICE = {"office", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods"}


def _kind_ok(kind: str) -> bool:
    return kind.lower().strip(".") in ALLOWED_KINDS


def _topic(db: Session, workspace_id: str, topic_id: str | None, name: str | None) -> Topic | None:
    if topic_id:
        row = (
            db.query(Topic)
            .filter(Topic.id == topic_id, Topic.workspace_id == workspace_id)
            .first()
        )
        if not row:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "topic")
        return row
    label = (name or "").strip()
    if not label:
        return None
    found = (
        db.query(Topic)
        .filter(Topic.workspace_id == workspace_id, Topic.name == label)
        .first()
    )
    if found:
        return found
    tax = db.query(Taxonomy).filter(Taxonomy.workspace_id == workspace_id).first()
    if not tax:
        tax = Taxonomy(workspace_id=workspace_id, name="Topics")
        db.add(tax)
        db.flush()
    row = Topic(workspace_id=workspace_id, taxonomy_id=tax.id, name=label)
    db.add(row)
    db.flush()
    return row


def file_material(
    db: Session,
    ports: MockPorts,
    principal: Principal,
    *,
    title: str,
    body: str,
    file_kind: str,
    storage_name: str,
    board: str | None,
    subject: str | None,
    unit: str | None,
    board_topic_id: str | None,
    subject_topic_id: str | None,
    unit_topic_id: str | None,
    session_id: str | None,
) -> ContentItem:
    if principal.role not in ("teacher", "owner"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    kind = (file_kind or "").lower().strip(".")
    if not _kind_ok(kind):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file type")
    decision = quota_svc.decide_paid_send(db, principal.workspace_id, "storage")
    if not decision.allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, "storage blocked")
    board_topic = _topic(db, principal.workspace_id, board_topic_id, board)
    subject_topic = _topic(db, principal.workspace_id, subject_topic_id, subject)
    unit_topic = _topic(db, principal.workspace_id, unit_topic_id, unit)
    if session_id:
        sess = (
            db.query(ScheduledSession)
            .filter(
                ScheduledSession.id == session_id,
                ScheduledSession.workspace_id == principal.workspace_id,
            )
            .first()
        )
        if not sess:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "session")
        if principal.role == "teacher" and sess.teacher_user_id != principal.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not your session")
    path = storage_name or f"local/{principal.workspace_id}/{title}"
    stored = ports.local_put(path)
    quota_svc.increment(db, principal.workspace_id, "storage")
    row = ContentItem(
        workspace_id=principal.workspace_id,
        topic_id=unit_topic.id if unit_topic else (subject_topic.id if subject_topic else None),
        title=title,
        body=body,
        storage_path=stored,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    put_meta(
        row,
        kind="office" if kind in OFFICE else kind,
        file_kind=kind,
        board_topic_id=board_topic.id if board_topic else None,
        subject_topic_id=subject_topic.id if subject_topic else None,
        unit_topic_id=unit_topic.id if unit_topic else None,
        board_label=board_topic.name if board_topic else (board or ""),
        subject_label=subject_topic.name if subject_topic else (subject or ""),
        unit_label=unit_topic.name if unit_topic else (unit or ""),
        session_id=session_id,
        views=0,
    )
    if session_id:
        sess = (
            db.query(ScheduledSession)
            .filter(ScheduledSession.id == session_id, ScheduledSession.workspace_id == principal.workspace_id)
            .first()
        )
        if sess and not sess.library_item_id:
            sess.library_item_id = row.id
            if subject_topic and not sess.subject_label:
                sess.subject_label = subject_topic.name
    return row
