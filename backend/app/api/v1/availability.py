from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import require_roles
from app.db import get_db
from app.models.tables import StaffAvailability, StaffMembership, User
from app.services.auth import Principal

router = APIRouter()


class Window(BaseModel):
    weekday: str  # Mon..Sun
    start: str = "00:00"
    end: str = "23:59"
    note: str = ""


class Block(BaseModel):
    date: str  # YYYY-MM-DD
    start: str = "00:00"
    end: str = "23:59"
    available: bool = False  # default: a block is time off
    note: str = ""


class AvailabilityIn(BaseModel):
    windows: list[Window] = []
    blocks: list[Block] = []


def _out(rows: list[StaffAvailability], user_id: str) -> dict:
    return {
        "teacher_id": user_id,
        "windows": [
            {"weekday": r.weekday, "start": r.start_time, "end": r.end_time, "note": r.note}
            for r in rows
            if r.kind == "window"
        ],
        "blocks": [
            {
                "date": r.on_date,
                "start": r.start_time,
                "end": r.end_time,
                "available": bool(r.available),
                "note": r.note,
            }
            for r in rows
            if r.kind == "block"
        ],
    }


def _rows(db: Session, workspace_id: str, user_id: str) -> list[StaffAvailability]:
    return (
        db.query(StaffAvailability)
        .filter(
            StaffAvailability.workspace_id == workspace_id,
            StaffAvailability.user_id == user_id,
        )
        .all()
    )


@router.get("/staff")
def list_staff(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    rows = (
        db.query(StaffMembership)
        .filter(StaffMembership.workspace_id == principal.workspace_id)
        .all()
    )
    out = []
    for m in rows:
        u = db.get(User, m.user_id)
        out.append({"id": m.user_id, "display_name": u.display_name if u else m.user_id, "role": m.role})
    return out


@router.get("/availability")
def get_availability(
    teacher_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    target = teacher_id or principal.user_id
    if target != principal.user_id and principal.role not in ("owner", "assistant"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not your availability")
    return _out(_rows(db, principal.workspace_id, target), target)


@router.put("/staff/{user_id}/availability")
def put_availability(
    user_id: str,
    body: AvailabilityIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher", "assistant")),
):
    if user_id != principal.user_id and principal.role != "owner":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "only the owner may edit another staff member")
    member = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "staff member")
    db.query(StaffAvailability).filter(
        StaffAvailability.workspace_id == principal.workspace_id,
        StaffAvailability.user_id == user_id,
    ).delete()
    for w in body.windows:
        db.add(
            StaffAvailability(
                workspace_id=principal.workspace_id,
                user_id=user_id,
                kind="window",
                weekday=w.weekday,
                start_time=w.start,
                end_time=w.end,
                available=1,
                note=w.note,
            )
        )
    for b in body.blocks:
        db.add(
            StaffAvailability(
                workspace_id=principal.workspace_id,
                user_id=user_id,
                kind="block",
                on_date=b.date,
                start_time=b.start,
                end_time=b.end,
                available=1 if b.available else 0,
                note=b.note,
            )
        )
    db.flush()
    return _out(_rows(db, principal.workspace_id, user_id), user_id)
