"""Faculty-admin and contact grants. Not login roles."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.tables import ContactGrant, FacultyAdminGrant, StaffMembership


def holds_faculty_admin(db: Session, workspace_id: str, user_id: str) -> bool:
    row = (
        db.query(FacultyAdminGrant)
        .filter(
            FacultyAdminGrant.workspace_id == workspace_id,
            FacultyAdminGrant.user_id == user_id,
        )
        .first()
    )
    return row is not None


def holds_contact(db: Session, workspace_id: str, user_id: str) -> bool:
    row = (
        db.query(ContactGrant)
        .filter(
            ContactGrant.workspace_id == workspace_id,
            ContactGrant.teacher_user_id == user_id,
        )
        .first()
    )
    return row is not None


def is_owner(db: Session, workspace_id: str, user_id: str) -> bool:
    row = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "owner",
        )
        .first()
    )
    return row is not None


def workspace_owner_ids(db: Session, workspace_id: str) -> list[str]:
    rows = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == workspace_id,
            StaffMembership.role == "owner",
        )
        .all()
    )
    return [r.user_id for r in rows]
