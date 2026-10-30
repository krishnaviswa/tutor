from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.tables import AuditLog, NotificationDelivery, NotificationPref, Workspace
from app.ports.mocks import MockPorts
from app.services import quota as quota_svc


DEFAULT_ROLE_CHANNELS = {
    "teacher": {"whatsapp": True, "email": True, "push": True},
    "parent": {"whatsapp": True, "email": True, "push": True},
    "admin": {"whatsapp": True, "email": True, "push": True},
    "student": {"whatsapp": False, "email": False, "push": True},
}


def _channel_on(db: Session, workspace_id: str, role: str, channel: str, student_whatsapp_on: bool) -> bool:
    if role == "student" and channel == "whatsapp" and not student_whatsapp_on:
        return False
    merged = {k: dict(v) for k, v in DEFAULT_ROLE_CHANNELS.items()}
    row = (
        db.query(NotificationPref)
        .filter(NotificationPref.workspace_id == workspace_id)
        .first()
    )
    if row and isinstance(row.prefs, dict):
        for who, chans in row.prefs.items():
            if who in merged and isinstance(chans, dict):
                merged[who].update({k: bool(v) for k, v in chans.items()})
    return bool(merged.get(role, {}).get(channel, False))


def dispatch_after_timeline(
    db: Session,
    ports: MockPorts,
    workspace_id: str,
    body: str,
    student_whatsapp_on: bool,
) -> dict:
    """Channels after ledger write. Failed send does not roll back. Paid meters QuotaGuard."""
    sent = []
    skipped = []
    ws = db.get(Workspace, workspace_id)
    paused = bool(ws.whatsapp_paused) if ws else False
    roles = ["teacher", "parent", "admin"]
    if student_whatsapp_on:
        roles.append("student")
    for role in roles:
        if not _channel_on(db, workspace_id, role, "whatsapp", student_whatsapp_on):
            skipped.append({"channel": "whatsapp", "role": role, "reason": "prefs_off"})
            continue
        if paused:
            skipped.append({"channel": "whatsapp", "role": role, "reason": "whatsapp_pause"})
            db.add(
                NotificationDelivery(
                    workspace_id=workspace_id,
                    channel="whatsapp",
                    to_role=role,
                    body=body,
                    status="skipped_pause",
                )
            )
            continue
        decision = quota_svc.decide_paid_send(db, workspace_id, "whatsapp")
        if not decision.allowed:
            skipped.append({"channel": "whatsapp", "role": role, "reason": "quota_block"})
            db.add(
                NotificationDelivery(
                    workspace_id=workspace_id,
                    channel="whatsapp",
                    to_role=role,
                    body=body,
                    status="skipped_quota",
                )
            )
            continue
        try:
            ports.send_whatsapp(role, body)
        except Exception:
            skipped.append({"channel": "whatsapp", "role": role, "reason": "send_failed"})
            db.add(
                NotificationDelivery(
                    workspace_id=workspace_id,
                    channel="whatsapp",
                    to_role=role,
                    body=body,
                    status="failed",
                )
            )
            continue
        quota_svc.increment(db, workspace_id, "whatsapp")
        sent.append({"channel": "whatsapp", "role": role})
        db.add(
            NotificationDelivery(
                workspace_id=workspace_id,
                channel="whatsapp",
                to_role=role,
                body=body,
                status="sent",
            )
        )
    db.add(
        AuditLog(
            workspace_id=workspace_id,
            action="notify.dispatch",
            payload={"sent": sent, "skipped": skipped},
        )
    )
    return {"sent": sent, "skipped": skipped}


IN_APP_ROLES = ("teacher", "parent", "admin", "student")


def deliver_in_app(db: Session, workspace_id: str, body: str, student_ids: list[str]) -> None:
    """In-app copies. Independent of the mock WhatsApp provider."""
    targets = student_ids or [None]
    for sid in targets:
        roles = IN_APP_ROLES if sid else ("teacher", "admin")
        for role in roles:
            db.add(
                NotificationDelivery(
                    workspace_id=workspace_id,
                    channel="in_app",
                    to_role=role,
                    student_id=sid,
                    body=body,
                    status="sent",
                )
            )


def inbox_for(db: Session, principal) -> list[dict]:
    from app.services.scope import linked_student_ids, student_for_principal

    q = db.query(NotificationDelivery).filter(
        NotificationDelivery.workspace_id == principal.workspace_id,
        NotificationDelivery.channel == "in_app",
    )
    if principal.role == "owner":
        q = q.filter(NotificationDelivery.to_role.in_(("admin", "owner")))
    elif principal.role == "student":
        st = student_for_principal(db, principal)
        q = q.filter(NotificationDelivery.to_role == "student", NotificationDelivery.student_id == st.id)
    elif principal.role == "parent":
        allowed = linked_student_ids(db, principal)
        q = q.filter(
            NotificationDelivery.to_role == "parent",
            NotificationDelivery.student_id.in_(allowed or [""]),
        )
    else:
        q = q.filter(NotificationDelivery.to_role == principal.role)
    rows = q.all()
    rows.sort(key=lambda r: r.created_at or r.id, reverse=True)
    return [
        {
            "id": r.id,
            "channel": r.channel,
            "to_role": r.to_role,
            "student_id": r.student_id,
            "body": r.body,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
