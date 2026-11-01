"""Own profile, step-up, and reduced cards. Logic stays out of the router."""

from __future__ import annotations

import base64
import binascii

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.tables import (
    EmailChallenge,
    Identity,
    OtpChallenge,
    PersonProfile,
    StaffMembership,
    Student,
    User,
)
from app.ports.mocks import MockPorts
from app.services import quota as quota_svc
from app.services.auth import Principal
from app.services.grants import holds_faculty_admin, is_owner
from app.services.library import MAX_FILE_BYTES

_PRIVATE = ("phone", "address")
# Content files may use the library cap (50 MB). A profile photo is a small data URL on this row.
AVATAR_MAX_BYTES = min(2 * 1024 * 1024, MAX_FILE_BYTES)
_PHOTO_MIMES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _identity(db: Session, workspace_id: str, user_id: str, kind: str) -> str:
    row = (
        db.query(Identity)
        .filter(
            Identity.workspace_id == workspace_id,
            Identity.user_id == user_id,
            Identity.kind == kind,
        )
        .first()
    )
    return row.value if row else ""


def _profile(db: Session, workspace_id: str, user_id: str) -> PersonProfile | None:
    return (
        db.query(PersonProfile)
        .filter(PersonProfile.workspace_id == workspace_id, PersonProfile.user_id == user_id)
        .first()
    )


def _ensure(db: Session, workspace_id: str, user_id: str) -> PersonProfile:
    row = _profile(db, workspace_id, user_id)
    if row:
        return row
    row = PersonProfile(workspace_id=workspace_id, user_id=user_id)
    db.add(row)
    db.flush()
    return row


def _clean_photo(value: str) -> str:
    raw = value.strip()
    if not raw:
        return ""
    if len(raw) > ((AVATAR_MAX_BYTES + 2) // 3) * 4 + 64:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo is too large")
    if not raw.lower().startswith("data:image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo must be an image")
    header, sep, payload = raw.partition(",")
    if not sep or ";base64" not in header.lower():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo must be an image")
    mime = header[5:].split(";", 1)[0].strip().lower()
    if mime == "image/jpg":
        mime = "image/jpeg"
    if mime not in _PHOTO_MIMES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo must be an image")
    compact = "".join(payload.split())
    if not compact:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo must be an image")
    pad = (-len(compact)) % 4
    try:
        blob = base64.b64decode(compact + ("=" * pad), validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "photo must be an image") from None
    if not blob or len(blob) > AVATAR_MAX_BYTES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "photo is too large" if blob else "photo must be an image",
        )
    encoded = base64.b64encode(blob).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def profile_out(row: PersonProfile, *, organization_email: str = "", display_name: str = "") -> dict:
    return {
        "user_id": row.user_id,
        "display_name": display_name,
        "phone": row.phone or "",
        "address": row.address or "",
        "expertise": row.expertise or "",
        "subjects": row.subjects or "",
        "board_label": row.board_label or "",
        "grade_label": row.grade_label or "",
        "study_info": row.study_info or "",
        "photo": row.photo or "",
        "organization_email": organization_email,
        "active": bool(row.active),
    }


def _named(db: Session, row: PersonProfile) -> dict:
    user = db.get(User, row.user_id)
    return profile_out(
        row,
        organization_email=_identity(db, row.workspace_id, row.user_id, "email"),
        display_name=user.display_name if user else "",
    )


def read_own(db: Session, principal: Principal) -> dict:
    row = _ensure(db, principal.workspace_id, principal.user_id)
    return _named(db, row)


def _otp_row(db: Session, challenge_id: str | None, code: str | None, phone: str) -> OtpChallenge:
    settings = get_settings()
    if not code or code != settings.otp_code or not challenge_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "otp required")
    ch = db.get(OtpChallenge, challenge_id)
    if not ch or ch.consumed or ch.phone != phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "otp required")
    return ch


def _email_row(db: Session, principal: Principal, challenge_id: str | None, code: str | None) -> EmailChallenge:
    settings = get_settings()
    if not code or code != settings.otp_code or not challenge_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email confirmation required")
    ch = db.get(EmailChallenge, challenge_id)
    if (
        not ch
        or ch.consumed
        or ch.user_id != principal.user_id
        or ch.workspace_id != principal.workspace_id
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "email confirmation required")
    return ch


def start_step_up(db: Session, ports: MockPorts, principal: Principal) -> dict:
    """Send the existing OTP. Faculty admin also gets email. Neither call signs anyone in."""
    phone = _identity(db, principal.workspace_id, principal.user_id, "phone")
    if not phone:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no phone on the account")
    admin = holds_faculty_admin(db, principal.workspace_id, principal.user_id)
    sms = quota_svc.decide_paid_send(db, principal.workspace_id, "sms")
    if not sms.allowed:
        raise HTTPException(status.HTTP_409_CONFLICT, "sms blocked")
    email_id = None
    if admin:
        email = _identity(db, principal.workspace_id, principal.user_id, "email")
        if not email:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "no organization email")
        mail = quota_svc.decide_paid_send(db, principal.workspace_id, "email")
        if not mail.allowed:
            raise HTTPException(status.HTTP_409_CONFLICT, "email blocked")
    ch = OtpChallenge(workspace_id=principal.workspace_id, phone=phone)
    db.add(ch)
    db.flush()
    ports.send_sms(phone, f"OTP {get_settings().otp_code}")
    quota_svc.increment(db, principal.workspace_id, "sms")
    if admin:
        email = _identity(db, principal.workspace_id, principal.user_id, "email")
        ech = EmailChallenge(workspace_id=principal.workspace_id, user_id=principal.user_id, email=email)
        db.add(ech)
        db.flush()
        ports.send_email(email, "Confirm profile", f"Code {get_settings().otp_code}")
        quota_svc.increment(db, principal.workspace_id, "email")
        email_id = ech.id
    return {"challenge_id": ch.id, "email_challenge_id": email_id, "faculty_admin": admin}


def save_own(
    db: Session,
    principal: Principal,
    fields: dict,
    *,
    challenge_id: str | None,
    code: str | None,
    email_challenge_id: str | None,
    email_code: str | None,
) -> dict:
    if fields.get("photo") is not None:
        fields = {**fields, "photo": _clean_photo(str(fields["photo"]))}
    phone = _identity(db, principal.workspace_id, principal.user_id, "phone")
    otp = _otp_row(db, challenge_id, code, phone)
    email_row = None
    if holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        email_row = _email_row(db, principal, email_challenge_id, email_code)
    otp.consumed = 1
    if email_row is not None:
        email_row.consumed = 1
    row = _ensure(db, principal.workspace_id, principal.user_id)
    for key in ("phone", "address", "expertise", "subjects", "board_label", "grade_label", "study_info", "photo"):
        if key in fields and fields[key] is not None:
            setattr(row, key, fields[key])
    if principal.role != "student":
        # Board, grade, and study info are the student's own study labels.
        pass
    db.flush()
    users_before = db.query(User).count()
    out = _named(db, row)
    out["accounts"] = users_before
    return out


def _student_user(db: Session, workspace_id: str, user_id: str) -> Student | None:
    return (
        db.query(Student)
        .filter(Student.workspace_id == workspace_id, Student.user_id == user_id)
        .first()
    )


def reduced_card(db: Session, principal: Principal, user_id: str) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "person")
    row = _profile(db, principal.workspace_id, user_id)
    if row is not None and not row.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not active")
    target_student = _student_user(db, principal.workspace_id, user_id)
    target_staff = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "teacher",
        )
        .first()
    )
    if principal.role == "student" and target_staff:
        subjects = ""
        if row:
            subjects = row.subjects or row.expertise or ""
        return {
            "user_id": user_id,
            "name": user.display_name,
            "subjects": subjects,
            "organization_email": _identity(db, principal.workspace_id, user_id, "email"),
        }
    if principal.role in ("teacher", "owner", "assistant") and target_student:
        return {
            "user_id": user_id,
            "student_id": target_student.id,
            "grade": (row.grade_label if row else "") or "",
            "board": (row.board_label if row else "") or "",
            "study_info": (row.study_info if row else "") or "",
        }
    raise HTTPException(status.HTTP_403_FORBIDDEN, "no card for that person")


def assert_card_hides_private(card: dict) -> None:
    for key in _PRIVATE:
        if key in card:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "private field on card")


def admin_update_teacher(db: Session, principal: Principal, user_id: str, fields: dict) -> dict:
    if not holds_faculty_admin(db, principal.workspace_id, principal.user_id) and not is_owner(
        db, principal.workspace_id, principal.user_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")
    staff = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "teacher",
        )
        .first()
    )
    if not staff:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")
    if _student_user(db, principal.workspace_id, user_id) and user_id != staff.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "student profile stays with the student")
    row = _ensure(db, principal.workspace_id, user_id)
    if not row.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "profile not active")
    for key in ("phone", "address", "expertise", "subjects"):
        if fields.get(key) is not None:
            setattr(row, key, fields[key])
    db.flush()
    return _named(db, row)


def admin_remove_teacher(db: Session, principal: Principal, user_id: str) -> dict:
    if not holds_faculty_admin(db, principal.workspace_id, principal.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "faculty admin required")
    if _student_user(db, principal.workspace_id, user_id):
        teacher = (
            db.query(StaffMembership)
            .filter(
                StaffMembership.workspace_id == principal.workspace_id,
                StaffMembership.user_id == user_id,
                StaffMembership.role == "teacher",
            )
            .first()
        )
        if not teacher:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "student profiles stay the student's")
    staff = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == user_id,
            StaffMembership.role == "teacher",
        )
        .first()
    )
    if not staff:
        if _student_user(db, principal.workspace_id, user_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "student profiles stay the student's")
        raise HTTPException(status.HTTP_404_NOT_FOUND, "teacher")
    row = _ensure(db, principal.workspace_id, user_id)
    row.active = 0
    db.flush()
    return {"user_id": user_id, "active": False}
