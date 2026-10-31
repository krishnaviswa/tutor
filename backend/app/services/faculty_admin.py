"""Faculty-admin grant, supervision, contact provision, succession, planning attendance."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import (
    Attendance,
    ContactGrant,
    FacultyAdminGrant,
    Identity,
    PersonProfile,
    ScheduledSession,
    SessionRecord,
    StaffMembership,
    TeacherSupervision,
    User,
)
from app.services.auth import Principal
from app.services.grants import holds_contact, holds_faculty_admin, is_owner, workspace_owner_ids


def _require_admin_or_owner(db: Session, principal: Principal) -> None:
    if holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        return
    if is_owner(db, principal.workspace_id, principal.user_id):
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")


def _require_admin(db: Session, principal: Principal) -> None:
    if not holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")


def _teacher_member(db: Session, workspace_id: str, user_id: str) -> StaffMembership | None:
    return (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "teacher",
        )
        .first()
    )


def grant_faculty_admin(db: Session, principal: Principal, user_id: str) -> dict:
    if not is_owner(db, principal.workspace_id, principal.user_id) and not holds_faculty_admin(
        db, principal.workspace_id, principal.user_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")
    member = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "person")
    existing = (
        db.query(FacultyAdminGrant)
        .filter(
            FacultyAdminGrant.workspace_id == principal.workspace_id,
            FacultyAdminGrant.user_id == user_id,
        )
        .first()
    )
    if not existing:
        db.add(
            FacultyAdminGrant(
                workspace_id=principal.workspace_id,
                user_id=user_id,
                granted_by=principal.user_id,
            )
        )
        db.flush()
    return {"user_id": user_id, "faculty_admin": True, "owner_ids": workspace_owner_ids(db, principal.workspace_id)}


def succession(db: Session, principal: Principal, to_user_id: str) -> dict:
    _require_admin(db, principal)
    if to_user_id == principal.user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "pick someone else")
    member = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == to_user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "person")
    owners_before = workspace_owner_ids(db, principal.workspace_id)
    mine = (
        db.query(FacultyAdminGrant)
        .filter(
            FacultyAdminGrant.workspace_id == principal.workspace_id,
            FacultyAdminGrant.user_id == principal.user_id,
        )
        .first()
    )
    if mine:
        db.delete(mine)
        db.flush()
    if not holds_faculty_admin(db, principal.workspace_id, to_user_id):
        db.add(
            FacultyAdminGrant(
                workspace_id=principal.workspace_id,
                user_id=to_user_id,
                granted_by=principal.user_id,
            )
        )
    db.flush()
    owners_after = workspace_owner_ids(db, principal.workspace_id)
    if owners_after != owners_before:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "owner changed")
    return {
        "faculty_admin_user_id": to_user_id,
        "owner_ids": owners_after,
        "previous_can_supervise": holds_faculty_admin(db, principal.workspace_id, principal.user_id),
    }


def supervise(db: Session, principal: Principal, teacher_user_id: str) -> dict:
    _require_admin(db, principal)
    if not _teacher_member(db, principal.workspace_id, teacher_user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")
    row = (
        db.query(TeacherSupervision)
        .filter(
            TeacherSupervision.workspace_id == principal.workspace_id,
            TeacherSupervision.admin_user_id == principal.user_id,
            TeacherSupervision.teacher_user_id == teacher_user_id,
        )
        .first()
    )
    if not row:
        db.add(
            TeacherSupervision(
                workspace_id=principal.workspace_id,
                admin_user_id=principal.user_id,
                teacher_user_id=teacher_user_id,
            )
        )
        db.flush()
    return {"admin_user_id": principal.user_id, "teacher_user_id": teacher_user_id}


def list_supervised(db: Session, principal: Principal) -> list[dict]:
    _require_admin(db, principal)
    rows = (
        db.query(TeacherSupervision)
        .filter(
            TeacherSupervision.workspace_id == principal.workspace_id,
            TeacherSupervision.admin_user_id == principal.user_id,
        )
        .all()
    )
    out = []
    for row in rows:
        user = db.get(User, row.teacher_user_id)
        out.append(
            {
                "teacher_user_id": row.teacher_user_id,
                "name": user.display_name if user else row.teacher_user_id,
            }
        )
    return out


def withhold_contact(db: Session, principal: Principal, teacher_user_id: str) -> dict:
    """Remove the teacher's right to speak with students and parents."""
    _require_admin_or_owner(db, principal)
    if not _teacher_member(db, principal.workspace_id, teacher_user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")
    row = (
        db.query(ContactGrant)
        .filter(
            ContactGrant.workspace_id == principal.workspace_id,
            ContactGrant.teacher_user_id == teacher_user_id,
        )
        .first()
    )
    if row:
        db.delete(row)
        db.flush()
    return {"teacher_user_id": teacher_user_id, "contact": False}


def grant_contact(db: Session, principal: Principal, teacher_user_id: str) -> dict:
    _require_admin_or_owner(db, principal)
    if not _teacher_member(db, principal.workspace_id, teacher_user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")
    row = (
        db.query(ContactGrant)
        .filter(
            ContactGrant.workspace_id == principal.workspace_id,
            ContactGrant.teacher_user_id == teacher_user_id,
        )
        .first()
    )
    if not row:
        db.add(
            ContactGrant(
                workspace_id=principal.workspace_id,
                teacher_user_id=teacher_user_id,
                granted_by=principal.user_id,
            )
        )
        db.flush()
    return {"teacher_user_id": teacher_user_id, "contact": True}


def assigned_sessions(db: Session, workspace_id: str, user_id: str) -> list[str]:
    rows = (
        db.query(ScheduledSession)
        .filter(
            ScheduledSession.workspace_id == workspace_id,
            ScheduledSession.teacher_user_id == user_id,
        )
        .all()
    )
    return [r.id for r in rows]


def planning_attendance(db: Session, principal: Principal) -> list[dict]:
    _require_admin(db, principal)
    sessions = (
        db.query(ScheduledSession)
        .filter(ScheduledSession.workspace_id == principal.workspace_id)
        .all()
    )
    out = []
    for sess in sessions:
        att = (
            db.query(Attendance)
            .filter(
                Attendance.workspace_id == principal.workspace_id,
                Attendance.session_id == sess.id,
            )
            .all()
        )
        rec = (
            db.query(SessionRecord)
            .filter(
                SessionRecord.workspace_id == principal.workspace_id,
                SessionRecord.session_id == sess.id,
            )
            .first()
        )
        out.append(
            {
                "session_id": sess.id,
                "teacher_user_id": sess.teacher_user_id,
                "student_attendance": [{"student_id": a.student_id, "status": a.status} for a in att],
                "teacher_status": rec.teacher_status if rec else None,
            }
        )
    return out


def _organization_email(db: Session, workspace_id: str, user_id: str) -> str:
    row = (
        db.query(Identity)
        .filter(
            Identity.workspace_id == workspace_id,
            Identity.user_id == user_id,
            Identity.kind == "email",
        )
        .first()
    )
    return row.value if row else ""


def directory(db: Session, principal: Principal) -> dict:
    """People a faculty admin can supervise. Phone and home address stay off these cards."""
    _require_admin(db, principal)
    members = (
        db.query(StaffMembership)
        .filter(StaffMembership.workspace_id == principal.workspace_id)
        .all()
    )
    people: list[dict] = []
    teachers: list[dict] = []
    for member in members:
        user = db.get(User, member.user_id)
        name = user.display_name if user else member.user_id
        people.append({"user_id": member.user_id, "name": name, "role": member.role})
        if member.role != "teacher":
            continue
        profile = (
            db.query(PersonProfile)
            .filter(
                PersonProfile.workspace_id == principal.workspace_id,
                PersonProfile.user_id == member.user_id,
            )
            .first()
        )
        if profile is not None and not profile.active:
            continue
        teachers.append(
            {
                "user_id": member.user_id,
                "name": name,
                "subjects": (profile.subjects if profile else "") or "",
                "expertise": (profile.expertise if profile else "") or "",
                "organization_email": _organization_email(db, principal.workspace_id, member.user_id),
                "contact": holds_contact(db, principal.workspace_id, member.user_id),
            }
        )
    return {"people": people, "teachers": teachers}


def me(db: Session, principal: Principal) -> dict:
    return {
        "faculty_admin": holds_faculty_admin(db, principal.workspace_id, principal.user_id),
        "owner": is_owner(db, principal.workspace_id, principal.user_id),
        "assigned_session_ids": assigned_sessions(db, principal.workspace_id, principal.user_id),
    }
