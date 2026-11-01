from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.services import lesson_packs as pack_svc
from app.services import sessions as sessions_svc
from app.services.auth import Principal

router = APIRouter()


class EnquiryIn(BaseModel):
    name: str
    phone: str
    hours: int


class BookingIn(BaseModel):
    start: datetime


@router.get("/students/{student_id}/lesson-pack")
def lesson_pack(
    student_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant", "student", "parent")),
):
    return pack_svc.read_pack(db, principal, student_id)


@router.post("/owner/enquiries")
def create_enquiry(
    body: EnquiryIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    return pack_svc.create_enquiry(db, principal.workspace_id, body.name, body.phone, body.hours)


@router.get("/parent/open-hours")
def open_hours(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("parent")),
):
    return pack_svc.open_hours(db, principal)


@router.post("/parent/bookings")
def book(
    body: BookingIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("parent")),
):
    row = pack_svc.book(db, principal, body.start)
    return sessions_svc.session_out(db, row)
