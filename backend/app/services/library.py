"""Content library filing. Board, subject, and unit are workspace topics."""

from __future__ import annotations

import base64
import binascii
from typing import NamedTuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import ContentItem, ScheduledSession, Taxonomy, Topic
from app.ports.mocks import MockPorts
from app.services import quota as quota_svc
from app.services.auth import Principal
from app.services.internal_v2 import put_meta

ALLOWED_KINDS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
    "gif",
    "svg",
    "txt",
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

# Extensions the library file picker accepts. Legacy file_kind values stay in ALLOWED_KINDS.
UPLOAD_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
    "webp",
    "svg",
    "gif",
    "pdf",
    "ppt",
    "pptx",
    "doc",
    "docx",
    "txt",
}

MIME_BY_EXT = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "svg": "image/svg+xml",
    "gif": "image/gif",
    "pdf": "application/pdf",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}

OFFICE = {"office", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "odt", "odp", "ods"}

MAX_FILE_BYTES = 50 * 1024 * 1024


def exceeds_file_cap(size_bytes: int) -> bool:
    return size_bytes > MAX_FILE_BYTES


def _encoded_too_long(encoded_length: int) -> bool:
    return encoded_length > ((MAX_FILE_BYTES + 2) // 3) * 4 + 8


class StoredFile(NamedTuple):
    name: str
    mime: str
    data_base64: str
    size_bytes: int
    ext: str


def _kind_ok(kind: str) -> bool:
    return kind.lower().strip(".") in ALLOWED_KINDS


def _accept_upload(filename: str, mime: str, data_base64: str) -> StoredFile:
    name = filename.strip().replace("\\", "/").split("/")[-1].strip()
    if not name or name.startswith(".") or "." not in name or len(name) > 200:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "filename")
    ext = name.rsplit(".", 1)[-1].lower()
    if ext not in UPLOAD_EXTENSIONS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file type")
    raw = data_base64.strip()
    if raw.startswith("data:"):
        parts = raw.split(",", 1)
        raw = parts[1] if len(parts) == 2 else ""
    raw = "".join(raw.split())
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file body")
    if _encoded_too_long(len(raw)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file too large")
    pad = (-len(raw)) % 4
    if pad:
        raw += "=" * pad
    try:
        blob = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "file body") from None
    if not blob or exceeds_file_cap(len(blob)):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "file body" if not blob else "file too large",
        )
    claimed = (mime or "").split(";")[0].strip().lower()
    stored_mime = MIME_BY_EXT[ext]
    if ext in {"jpg", "jpeg"} and claimed in {"image/jpg", "image/jpeg", "image/pjpeg"}:
        stored_mime = "image/jpeg"
    return StoredFile(
        name=name,
        mime=stored_mime,
        data_base64=base64.b64encode(blob).decode("ascii"),
        size_bytes=len(blob),
        ext=ext,
    )


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
    filename: str | None = None,
    mime: str | None = None,
    data_base64: str | None = None,
) -> ContentItem:
    if principal.role not in ("teacher", "owner"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
    uploaded: StoredFile | None = None
    if (data_base64 or "").strip():
        uploaded = _accept_upload(filename or "", mime or "", data_base64 or "")
        kind = uploaded.ext
    else:
        kind = (file_kind or "").lower().strip(".")
        if not _kind_ok(kind):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "file type")
    clean_title = (title or "").strip()
    if not clean_title and uploaded:
        clean_title = uploaded.name
    clean_title = clean_title[:200]
    if not clean_title:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "title")
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
    leaf = uploaded.name if uploaded else clean_title
    path = storage_name or f"local/{principal.workspace_id}/{leaf}"
    stored = ports.local_put(path)
    quota_svc.increment(db, principal.workspace_id, "storage")
    row = ContentItem(
        workspace_id=principal.workspace_id,
        topic_id=unit_topic.id if unit_topic else (subject_topic.id if subject_topic else None),
        title=clean_title,
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
        filename=uploaded.name if uploaded else None,
        mime=uploaded.mime if uploaded else None,
        data_base64=uploaded.data_base64 if uploaded else None,
        size_bytes=uploaded.size_bytes if uploaded else None,
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
