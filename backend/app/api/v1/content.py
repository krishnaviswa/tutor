from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import ports_dep, require_roles
from app.db import get_db
from app.models.tables import ContentItem, Topic
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services.internal_v2 import meta_of, put_meta
from app.services.progress import content_out

router = APIRouter()


class ContentIn(BaseModel):
    title: str
    body: str = ""
    topic_id: str | None = None
    storage_path: str = ""
    kind: str | None = None
    playlist_ids: list[str] | None = None
    drip_at: str | None = None


def _out(row: ContentItem, db: Session | None = None, *, lesson: bool = False) -> dict:
    return content_out(row, db, lesson=lesson)


@router.get("/content")
def list_content(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    rows = db.query(ContentItem).filter(ContentItem.workspace_id == principal.workspace_id).all()
    return [_out(r, db) for r in rows]


@router.post("/content")
def create_content(
    body: ContentIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    if body.topic_id:
        topic = (
            db.query(Topic)
            .filter(Topic.id == body.topic_id, Topic.workspace_id == principal.workspace_id)
            .first()
        )
        if not topic:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "topic")
    path = body.storage_path or f"local/{principal.workspace_id}/{body.title}"
    stored = ports.local_put(path)
    row = ContentItem(
        workspace_id=principal.workspace_id,
        topic_id=body.topic_id,
        title=body.title,
        body=body.body,
        storage_path=stored,
        created_by=principal.user_id,
    )
    db.add(row)
    db.flush()
    put_meta(row, kind=body.kind, playlist_ids=body.playlist_ids, drip_at=body.drip_at, views=0)
    return _out(row, db)


@router.get("/content/{content_id}")
def get_content(
    content_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student")),
):
    row = (
        db.query(ContentItem)
        .filter(ContentItem.id == content_id, ContentItem.workspace_id == principal.workspace_id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "content")
    return _out(row, db, lesson=True)
