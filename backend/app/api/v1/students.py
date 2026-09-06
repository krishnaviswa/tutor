from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import Identity, Student, User
from app.services.auth import Principal

router = APIRouter()


class StudentIn(BaseModel):
    display_name: str
    phone: str | None = None
    email: str | None = None


class ImportIn(BaseModel):
    rows: list[StudentIn]


def _out(s: Student) -> dict:
    return {"id": s.id, "workspace_id": s.workspace_id, "user_id": s.user_id, "display_name": s.display_name}


def _add_student(db: Session, workspace_id: str, body: StudentIn) -> Student:
    user = User(display_name=body.display_name)
    db.add(user)
    db.flush()
    st = Student(workspace_id=workspace_id, user_id=user.id, display_name=body.display_name)
    db.add(st)
    db.flush()
    if body.phone:
        db.add(Identity(workspace_id=workspace_id, user_id=user.id, kind="phone", value=body.phone))
    if body.email:
        db.add(Identity(workspace_id=workspace_id, user_id=user.id, kind="email", value=body.email))
    return st


@router.get("/students")
def list_students(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    rows = db.query(Student).filter(Student.workspace_id == principal.workspace_id).all()
    return [_out(s) for s in rows]


@router.post("/students")
def create_student(
    body: StudentIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "assistant")),
):
    return _out(_add_student(db, principal.workspace_id, body))


@router.post("/students/import")
def import_students(
    body: ImportIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "assistant")),
):
    created = [_out(_add_student(db, principal.workspace_id, row)) for row in body.rows]
    return {"created": created}


@router.get("/students/{student_id}/timeline")
def student_timeline(
    student_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student", "parent")),
):
    from app.models.tables import ParentLink, TimelineEvent

    st = (
        db.query(Student)
        .filter(Student.id == student_id, Student.workspace_id == principal.workspace_id)
        .first()
    )
    if not st:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    if principal.role == "student" and st.user_id != principal.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your timeline")
    if principal.role == "parent":
        link = (
            db.query(ParentLink)
            .filter(
                ParentLink.workspace_id == principal.workspace_id,
                ParentLink.parent_user_id == principal.user_id,
                ParentLink.student_id == student_id,
                ParentLink.accepted_at.isnot(None),
            )
            .first()
        )
        if not link:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not linked")
    events = (
        db.query(TimelineEvent)
        .filter(
            TimelineEvent.workspace_id == principal.workspace_id,
            TimelineEvent.student_id == student_id,
        )
        .order_by(TimelineEvent.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "body": e.body,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]
