from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.tables import PlatformSubscription, QuotaPolicy, UsageMeter, utcnow

ALWAYS_ON = ("A1", "A2", "A3", "G1", "G2", "D4", "F2")
PAID_METERS = ("whatsapp", "sms", "email")


@dataclass
class QuotaDecision:
    allowed: bool
    warn: bool
    percent: float
    policy: str
    meter_key: str


def meter_row(db: Session, workspace_id: str, meter_key: str) -> UsageMeter | None:
    return (
        db.query(UsageMeter)
        .filter(UsageMeter.workspace_id == workspace_id, UsageMeter.meter_key == meter_key)
        .first()
    )


def policy_row(db: Session, workspace_id: str, meter_key: str) -> QuotaPolicy | None:
    return (
        db.query(QuotaPolicy)
        .filter(QuotaPolicy.workspace_id == workspace_id, QuotaPolicy.meter_key == meter_key)
        .first()
    )


def snapshot(db: Session, workspace_id: str) -> list[dict]:
    out = []
    for m in db.query(UsageMeter).filter(UsageMeter.workspace_id == workspace_id):
        pol = policy_row(db, workspace_id, m.meter_key)
        pct = (m.used / m.cap * 100) if m.cap else 0
        out.append(
            {
                "meter_key": m.meter_key,
                "used": m.used,
                "cap": m.cap,
                "percent": round(pct, 1),
                "policy": pol.policy if pol else "warn",
                "warn": pct >= 80,
                "block": pct >= 100 and (pol.policy if pol else "warn") == "block",
            }
        )
    return out


def _aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        from datetime import timezone

        return dt.replace(tzinfo=timezone.utc)
    return dt


def subscription_lapsed(db: Session, workspace_id: str) -> bool:
    """Metered sends only. Core (login, timeline, sessions) stays available.

    No subscription row means the workspace has not opened billing yet — do not throttle.
    """
    sub = (
        db.query(PlatformSubscription)
        .filter(PlatformSubscription.workspace_id == workspace_id)
        .first()
    )
    if not sub:
        return False
    if sub.status == "paused":
        return False
    now = utcnow()
    end = _aware(sub.period_end)
    period_over = bool(end and now >= end)
    if sub.status == "canceled":
        return True
    if sub.status in ("trial", "active", "cancel_at_period_end"):
        return period_over
    return False


def decide_paid_send(db: Session, workspace_id: str, meter_key: str) -> QuotaDecision:
    m = meter_row(db, workspace_id, meter_key)
    pol = policy_row(db, workspace_id, meter_key)
    if subscription_lapsed(db, workspace_id):
        policy = pol.policy if pol else "block"
        pct = (m.used / m.cap * 100) if m and m.cap else 100
        return QuotaDecision(False, True, pct, policy, meter_key)
    if not m:
        return QuotaDecision(True, False, 0, "warn", meter_key)
    policy = pol.policy if pol else "warn"
    pct = (m.used / m.cap * 100) if m.cap else 0
    warn = pct >= 80
    if pct >= 100 and policy == "block":
        return QuotaDecision(False, warn, pct, policy, meter_key)
    return QuotaDecision(True, warn, pct, policy, meter_key)


def increment(db: Session, workspace_id: str, meter_key: str, n: int = 1) -> None:
    m = meter_row(db, workspace_id, meter_key)
    if m:
        m.used += n
        db.add(m)
