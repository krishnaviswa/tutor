from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import ParentLink, Student, new_id
from app.services.auth import Principal

router = APIRouter()


class LinkIn(BaseModel):
    student_id: str


@router.post("/parent-links")
def create_link(
    body: LinkIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    st = (
        db.query(Student)
        .filter(Student.id == body.student_id, Student.workspace_id == principal.workspace_id)
        .first()
    )
    if not st:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    token = new_id()
    db.add(ParentLink(workspace_id=principal.workspace_id, student_id=st.id, token=token))
    db.flush()
    return {"token": token, "student_id": st.id}


@router.post("/parent-links/{token}/accept")
def accept_link(
    token: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("parent")),
):
    link = (
        db.query(ParentLink)
        .filter(ParentLink.token == token, ParentLink.workspace_id == principal.workspace_id)
        .first()
    )
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "link")
    link.parent_user_id = principal.user_id
    link.accepted_at = datetime.now(timezone.utc)
    db.flush()
    return {"student_id": link.student_id, "accepted": True}


@router.get("/parent/home")
def parent_home(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("parent")),
):
    links = (
        db.query(ParentLink)
        .filter(
            ParentLink.workspace_id == principal.workspace_id,
            ParentLink.parent_user_id == principal.user_id,
            ParentLink.accepted_at.isnot(None),
        )
        .all()
    )
    children = []
    for link in links:
        st = db.get(Student, link.student_id)
        if st and st.workspace_id == principal.workspace_id:
            children.append({"student_id": st.id, "display_name": st.display_name})
    return {
        "children": children,
        "hub": [
            "timeline",
            "reports",
            "practice-result",
            "payments",
            "messages",
            "notif-prefs",
        ],
    }
