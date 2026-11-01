"""Workspace topics. G3 taxonomy rows — not a syllabus table."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import Topic
from app.services.auth import Principal

router = APIRouter()


@router.get("/topics")
def list_topics(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student", "parent")),
):
    rows = (
        db.query(Topic)
        .filter(Topic.workspace_id == principal.workspace_id)
        .order_by(Topic.name, Topic.id)
        .all()
    )
    return [
        {"id": row.id, "name": row.name, "taxonomy_id": row.taxonomy_id}
        for row in rows
    ]
