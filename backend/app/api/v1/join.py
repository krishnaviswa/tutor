from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal
from app.db import get_db
from app.models.tables import Attendance, ScheduledSession, Workspace
from app.services.auth import Principal
from app.services import timeline
from app.services.scope import enrolled_in_session_cohort, student_for_principal

router = APIRouter()


def _by_token(db: Session, token: str) -> ScheduledSession:
    s = db.query(ScheduledSession).filter(ScheduledSession.join_token == token).first()
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "join token")
    return s


@router.get("/join/{token}")
def get_join(token: str, db: Session = Depends(get_db)):
    s = _by_token(db, token)
    ws = db.get(Workspace, s.workspace_id)
    return {
        "session_id": s.id,
        "workspace_id": s.workspace_id,
        "workspace_name": ws.name if ws else None,
        "title": s.title,
        "starts_at": s.starts_at.isoformat() if s.starts_at else None,
        "video_url": s.video_url,
    }


@router.post("/join/{token}/enter")
def enter_join(
    token: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(current_principal),
):
    if principal.role != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "student only")
    s = _by_token(db, token)
    if principal.workspace_id != s.workspace_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "wrong workspace")
    if not enrolled_in_session_cohort(db, s.workspace_id, s.cohort_id, principal.user_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not enrolled")
    st = student_for_principal(db, principal)
    att = (
        db.query(Attendance)
        .filter(
            Attendance.workspace_id == s.workspace_id,
            Attendance.session_id == s.id,
            Attendance.student_id == st.id,
        )
        .first()
    )
    if att:
        att.status = "present"
    else:
        db.add(
            Attendance(
                workspace_id=s.workspace_id,
                session_id=s.id,
                student_id=st.id,
                status="present",
            )
        )
    timeline.append(
        db,
        s.workspace_id,
        st.id,
        "session_joined",
        f"Joined {s.title}",
        principal.user_id,
    )
    db.flush()
    return {"session_id": s.id, "attendance": "present", "video_url": s.video_url}
