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
        ports.send_whatsapp(role, body)
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
