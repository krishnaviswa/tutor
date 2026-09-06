from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import Enrollment, ParentLink, Student
from app.services.auth import Principal


def student_for_principal(db: Session, principal: Principal) -> Student:
    st = (
        db.query(Student)
        .filter(Student.user_id == principal.user_id, Student.workspace_id == principal.workspace_id)
        .first()
    )
    if not st:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    return st


def linked_student_ids(db: Session, principal: Principal) -> set[str]:
    rows = (
        db.query(ParentLink)
        .filter(
            ParentLink.workspace_id == principal.workspace_id,
            ParentLink.parent_user_id == principal.user_id,
            ParentLink.accepted_at.isnot(None),
        )
        .all()
    )
    return {r.student_id for r in rows}


def can_read_student(db: Session, principal: Principal, student_id: str) -> bool:
    st = (
        db.query(Student)
        .filter(Student.id == student_id, Student.workspace_id == principal.workspace_id)
        .first()
    )
    if not st:
        return False
    if principal.role in ("owner", "teacher", "assistant"):
        return True
    if principal.role == "student":
        return st.user_id == principal.user_id
    if principal.role == "parent":
        return student_id in linked_student_ids(db, principal)
    return False


def enrolled_in_session_cohort(db: Session, workspace_id: str, cohort_id: str, user_id: str) -> bool:
    st = (
        db.query(Student)
        .filter(Student.user_id == user_id, Student.workspace_id == workspace_id)
        .first()
    )
    if not st:
        return False
    row = (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == workspace_id,
            Enrollment.cohort_id == cohort_id,
            Enrollment.student_id == st.id,
        )
        .first()
    )
    return row is not None
