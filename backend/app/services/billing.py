"""Platform subscription, student invoice trail, payouts, hourly cohorts. Mock money only."""

from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.tables import (
    AuditLog,
    Cohort,
    Enrollment,
    Invoice,
    InvoiceEvent,
    Plan,
    PlatformInvoice,
    PlatformSubscription,
    Payout,
    Receipt,
    ScheduledSession,
    Student,
    User,
    utcnow,
)
from app.ports.mocks import MockPorts
from app.services import timeline
from app.services.internal_v2 import meta_of
from app.services.sessions import display_status, ends_or_default

# Placeholder prices in the existing amount_cents unit. Not a live price list.
TIER_PRICES = {"starter": 0, "cohort": 4900, "institute": 14900}
TRIAL_DAYS = 14
PERIOD_DAYS = 30
BILLABLE_DISPLAY = {"Staff completed", "Auto completed"}


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    aware = _aware(dt)
    return aware.isoformat() if aware else None


def audit(db: Session, workspace_id: str, actor_user_id: str | None, action: str, payload: dict) -> None:
    db.add(
        AuditLog(
            workspace_id=workspace_id,
            actor_user_id=actor_user_id,
            action=action,
            payload=payload,
        )
    )


def ensure_subscription(db: Session, workspace_id: str) -> PlatformSubscription:
    row = (
        db.query(PlatformSubscription)
        .filter(PlatformSubscription.workspace_id == workspace_id)
        .first()
    )
    if row:
        _refresh_lapsed(row)
        return row
    now = utcnow()
    end = now + timedelta(days=TRIAL_DAYS)
    row = PlatformSubscription(
        workspace_id=workspace_id,
        tier="starter",
        status="trial",
        period_end=end,
        trial_ends_at=end,
    )
    db.add(row)
    db.flush()
    return row


def _refresh_lapsed(row: PlatformSubscription) -> None:
    end = _aware(row.period_end)
    if not end or utcnow() < end:
        return
    if row.status in ("trial", "cancel_at_period_end"):
        row.status = "canceled"


def subscription_public(db: Session, row: PlatformSubscription) -> dict:
    history = (
        db.query(PlatformInvoice)
        .filter(PlatformInvoice.workspace_id == row.workspace_id)
        .all()
    )
    history.sort(key=lambda r: _aware(r.created_at) or utcnow(), reverse=True)
    return {
        "tier": row.tier,
        "status": row.status,
        "period_end": _iso(row.period_end),
        "trial_ends_at": _iso(row.trial_ends_at),
        "amount_cents": TIER_PRICES.get(row.tier, 0),
        "prices": dict(TIER_PRICES),
        "invoices": [
            {
                "id": inv.id,
                "tier": inv.tier,
                "amount_cents": inv.amount_cents,
                "action": inv.action,
                "created_at": _iso(inv.created_at),
            }
            for inv in history
        ],
    }


def change_tier(db: Session, workspace_id: str, actor_user_id: str, tier: str) -> PlatformSubscription:
    if tier not in TIER_PRICES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "tier")
    row = ensure_subscription(db, workspace_id)
    previous = row.tier
    if previous == tier and row.status == "active":
        return row
    now = utcnow()
    action = "upgrade" if TIER_PRICES[tier] > TIER_PRICES.get(previous, 0) else "downgrade"
    if TIER_PRICES[tier] == TIER_PRICES.get(previous, 0):
        action = "change"
    row.tier = tier
    row.status = "active"
    row.period_end = now + timedelta(days=PERIOD_DAYS)
    db.add(
        PlatformInvoice(
            workspace_id=workspace_id,
            tier=tier,
            amount_cents=TIER_PRICES[tier],
            action=action,
        )
    )
    audit(
        db,
        workspace_id,
        actor_user_id,
        "billing.tier_change",
        {"from": previous, "to": tier, "amount_cents": TIER_PRICES[tier]},
    )
    db.flush()
    return row


def cancel_subscription(db: Session, workspace_id: str, actor_user_id: str) -> PlatformSubscription:
    row = ensure_subscription(db, workspace_id)
    if row.status != "canceled":
        row.status = "cancel_at_period_end"
    audit(db, workspace_id, actor_user_id, "billing.cancel", {"period_end": _iso(row.period_end)})
    db.flush()
    return row


def pause_subscription(db: Session, workspace_id: str, actor_user_id: str) -> PlatformSubscription:
    row = ensure_subscription(db, workspace_id)
    row.status = "paused"
    audit(db, workspace_id, actor_user_id, "billing.pause", {"tier": row.tier})
    db.flush()
    return row


def resume_subscription(db: Session, workspace_id: str, actor_user_id: str) -> PlatformSubscription:
    row = ensure_subscription(db, workspace_id)
    end = _aware(row.period_end)
    if row.status == "canceled" or (end and utcnow() >= end and row.status != "paused"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "period ended")
    row.status = "active"
    audit(db, workspace_id, actor_user_id, "billing.resume", {"tier": row.tier})
    db.flush()
    return row


def note_invoice_created(db: Session, row: Invoice, actor_user_id: str | None = None) -> None:
    exists = (
        db.query(InvoiceEvent)
        .filter(
            InvoiceEvent.workspace_id == row.workspace_id,
            InvoiceEvent.invoice_id == row.id,
            InvoiceEvent.event_type == "created",
        )
        .first()
    )
    if exists:
        return
    _event(db, row, "created", row.amount_cents, actor_user_id, f"Invoice created {row.id}")


def _event(
    db: Session,
    row: Invoice,
    event_type: str,
    amount_cents: int,
    actor_user_id: str | None,
    body: str,
    *,
    reason: str = "",
    idempotency_key: str | None = None,
    payload: dict | None = None,
) -> InvoiceEvent:
    ev = InvoiceEvent(
        workspace_id=row.workspace_id,
        invoice_id=row.id,
        student_id=row.student_id,
        event_type=event_type,
        amount_cents=amount_cents,
        reason=reason,
        idempotency_key=idempotency_key,
        payload=payload or {},
    )
    db.add(ev)
    db.flush()
    timeline.append(db, row.workspace_id, row.student_id, f"invoice.{event_type}", body, actor_user_id)
    return ev


def invoice_events(db: Session, row: Invoice) -> list[dict]:
    rows = (
        db.query(InvoiceEvent)
        .filter(InvoiceEvent.workspace_id == row.workspace_id, InvoiceEvent.invoice_id == row.id)
        .all()
    )
    rows.sort(key=lambda r: _aware(r.created_at) or utcnow())
    return [
        {
            "id": r.id,
            "event_type": r.event_type,
            "amount_cents": r.amount_cents,
            "reason": r.reason,
            "created_at": _iso(r.created_at),
        }
        for r in rows
    ]


def stored_receipt(db: Session, row: Invoice) -> Receipt | None:
    return (
        db.query(Receipt)
        .filter(Receipt.workspace_id == row.workspace_id, Receipt.invoice_id == row.id)
        .first()
    )


def _ensure_receipt(db: Session, row: Invoice) -> Receipt:
    existing = stored_receipt(db, row)
    if existing:
        return existing
    code = f"RCT-{row.id[-4:].upper()}"
    body = f"Receipt {code} invoice {row.id} amount_cents {row.amount_cents}"
    rec = Receipt(
        workspace_id=row.workspace_id,
        invoice_id=row.id,
        student_id=row.student_id,
        code=code,
        body=body,
    )
    db.add(rec)
    db.flush()
    return rec


def pay_invoice(
    db: Session,
    ports: MockPorts,
    row: Invoice,
    actor_user_id: str | None,
    idempotency_key: str | None,
) -> dict:
    if row.status == "pending_review":
        raise HTTPException(status.HTTP_409_CONFLICT, "pending review")
    if idempotency_key:
        prior = (
            db.query(InvoiceEvent)
            .filter(
                InvoiceEvent.workspace_id == row.workspace_id,
                InvoiceEvent.idempotency_key == idempotency_key,
            )
            .first()
        )
        if prior:
            rec = stored_receipt(db, row)
            return {
                "invoice_id": row.id,
                "status": row.status,
                "idempotent": True,
                "mock": (prior.payload or {}).get("mock"),
                "receipt": rec.body if rec else None,
            }
    if row.status == "paid":
        rec = stored_receipt(db, row)
        return {
            "invoice_id": row.id,
            "status": row.status,
            "idempotent": True,
            "mock": None,
            "receipt": rec.body if rec else None,
        }
    if row.status not in ("open", "failed"):
        raise HTTPException(status.HTTP_409_CONFLICT, "not payable")
    _event(
        db,
        row,
        "payment_attempted",
        row.amount_cents,
        actor_user_id,
        f"Payment attempted {row.id}",
    )
    try:
        result = ports.checkout_invoice(row.id, row.amount_cents)
    except Exception as exc:
        row.status = "failed"
        _event(
            db,
            row,
            "failed",
            row.amount_cents,
            actor_user_id,
            f"Payment failed {row.id}",
            idempotency_key=idempotency_key,
            payload={"error": str(exc)},
        )
        db.flush()
        return {"invoice_id": row.id, "status": row.status, "idempotent": False, "mock": None}
    if result.get("status") != "mock_ok":
        row.status = "failed"
        _event(
            db,
            row,
            "failed",
            row.amount_cents,
            actor_user_id,
            f"Payment failed {row.id}",
            idempotency_key=idempotency_key,
            payload={"mock": result},
        )
        db.flush()
        return {"invoice_id": row.id, "status": row.status, "idempotent": False, "mock": result}
    row.status = "paid"
    _event(
        db,
        row,
        "paid",
        row.amount_cents,
        actor_user_id,
        f"Invoice paid {row.id}",
        idempotency_key=idempotency_key,
        payload={"mock": result},
    )
    rec = _ensure_receipt(db, row)
    db.flush()
    return {
        "invoice_id": row.id,
        "status": row.status,
        "idempotent": False,
        "mock": result,
        "receipt": rec.body,
    }


def refund_invoice(
    db: Session,
    row: Invoice,
    actor_user_id: str,
    amount_cents: int,
    reason: str,
) -> Invoice:
    if row.status not in ("paid",):
        raise HTTPException(status.HTTP_409_CONFLICT, "not paid")
    text = (reason or "").strip()
    if not text:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "reason required")
    if amount_cents <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "amount")
    remaining = row.amount_cents - (row.refunded_cents or 0)
    if amount_cents > remaining:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "amount exceeds remaining")
    row.refunded_cents = (row.refunded_cents or 0) + amount_cents
    if row.refunded_cents >= row.amount_cents:
        row.status = "refunded"
    _event(
        db,
        row,
        "refunded",
        amount_cents,
        actor_user_id,
        f"Refund {amount_cents} on {row.id}: {text}",
        reason=text,
    )
    audit(
        db,
        row.workspace_id,
        actor_user_id,
        "billing.refund",
        {"invoice_id": row.id, "amount_cents": amount_cents, "reason": text, "status": row.status},
    )
    db.flush()
    return row


def scheduled_minutes(s: ScheduledSession) -> int:
    start = _aware(s.starts_at)
    end = ends_or_default(s)
    if not start or not end:
        return 0
    seconds = (end - start).total_seconds()
    if seconds <= 0:
        return 0
    return int(round(seconds / 60))


def _hours(minutes: int) -> float:
    return round(minutes / 60, 4)


def _amount(minutes: int, rate_cents: int) -> int:
    return int(round(minutes * rate_cents / 60))


def apply_cohort_billing(cohort: Cohort, billing_mode: str | None, hourly_rate_cents: int | None) -> None:
    if billing_mode is None and hourly_rate_cents is None:
        return
    if billing_mode is not None and billing_mode not in ("static", "hourly"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "billing_mode")
    mode = billing_mode if billing_mode is not None else (cohort.billing_mode or "static")
    rate = cohort.hourly_rate_cents or 0
    if hourly_rate_cents is not None:
        if hourly_rate_cents < 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "hourly rate")
        rate = hourly_rate_cents
        cohort.hourly_rate_cents = hourly_rate_cents
    if mode == "hourly" and rate <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hourly rate required")
    cohort.billing_mode = mode


def _in_range(s: ScheduledSession, start: datetime, end: datetime) -> bool:
    begins = _aware(s.starts_at)
    if not begins:
        return False
    return _aware(start) <= begins <= _aware(end)


def hourly_invoice(
    db: Session,
    workspace_id: str,
    actor_user_id: str,
    cohort_id: str,
    period_start: datetime,
    period_end: datetime,
) -> list[Invoice]:
    cohort = (
        db.query(Cohort).filter(Cohort.id == cohort_id, Cohort.workspace_id == workspace_id).first()
    )
    if not cohort:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "cohort")
    if (cohort.billing_mode or "static") != "hourly":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "cohort is not hourly")
    rate = cohort.hourly_rate_cents or 0
    if rate <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hourly rate required")
    sessions = (
        db.query(ScheduledSession)
        .filter(ScheduledSession.workspace_id == workspace_id, ScheduledSession.cohort_id == cohort.id)
        .all()
    )
    lines = []
    total_minutes = 0
    for s in sessions:
        if not _in_range(s, period_start, period_end):
            continue
        shown = display_status(s)
        if shown not in BILLABLE_DISPLAY:
            continue
        minutes = scheduled_minutes(s)
        total_minutes += minutes
        lines.append(
            {
                "id": s.id,
                "title": s.title,
                "minutes": minutes,
                "hours": _hours(minutes),
                "display_status": shown,
                "starts_at": _iso(s.starts_at),
            }
        )
    amount = _amount(total_minutes, rate)
    snapshot = {
        "hours": _hours(total_minutes),
        "minutes": total_minutes,
        "amount_cents": amount,
        "rate_cents": rate,
        "sessions": lines,
        "frozen": False,
        "period_start": _iso(_aware(period_start)),
        "period_end": _iso(_aware(period_end)),
    }
    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.workspace_id == workspace_id, Enrollment.cohort_id == cohort.id)
        .all()
    )
    active = [e for e in enrollments if (e.status or "active") != "canceled"]
    if not active:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "no enrolled students")
    created: list[Invoice] = []
    for enr in active:
        row = Invoice(
            workspace_id=workspace_id,
            student_id=enr.student_id,
            amount_cents=amount,
            kind="hourly",
            status="pending_review",
            meta={"snapshot": copy.deepcopy(snapshot)},
        )
        db.add(row)
        db.flush()
        note_invoice_created(db, row, actor_user_id)
        created.append(row)
    audit(
        db,
        workspace_id,
        actor_user_id,
        "billing.hourly_invoice",
        {"cohort_id": cohort.id, "invoice_ids": [r.id for r in created], "amount_cents": amount},
    )
    db.flush()
    return created


def approve_invoice(db: Session, row: Invoice, actor_user_id: str) -> Invoice:
    if (row.kind or "static") != "hourly" or row.status != "pending_review":
        raise HTTPException(status.HTTP_409_CONFLICT, "not pending review")
    meta = meta_of(row)
    snap = dict(meta.get("snapshot") or {})
    snap["frozen"] = True
    snap["amount_cents"] = row.amount_cents
    meta["snapshot"] = snap
    row.meta = meta
    row.status = "open"
    audit(
        db,
        row.workspace_id,
        actor_user_id,
        "billing.hourly_approve",
        {"invoice_id": row.id, "amount_cents": row.amount_cents, "hours": snap.get("hours")},
    )
    db.flush()
    return row


def _interval_days(interval: str | None) -> int:
    key = (interval or "month").lower()
    if key == "year":
        return 365
    if key == "week":
        return 7
    if key == "term":
        return 90
    return 30


def _renewal_due(db: Session, workspace_id: str, plan: Plan, student_id: str, today: str) -> bool:
    rows = (
        db.query(Invoice)
        .filter(
            Invoice.workspace_id == workspace_id,
            Invoice.plan_id == plan.id,
            Invoice.student_id == student_id,
        )
        .all()
    )
    if any((meta_of(r).get("renewal_day") == today) for r in rows):
        return False
    if not rows:
        return True
    latest = max(rows, key=lambda r: _aware(r.created_at) or utcnow())
    created = _aware(latest.created_at) or utcnow()
    return utcnow() >= created + timedelta(days=_interval_days(plan.interval))


def run_renewals(db: Session, workspace_id: str, actor_user_id: str) -> dict:
    """One invoice per active enrollment on a due plan. A second run the same UTC day does not duplicate."""
    today = utcnow().date().isoformat()
    plans = db.query(Plan).filter(Plan.workspace_id == workspace_id).all()
    created: list[str] = []
    skipped = 0
    for plan in plans:
        enrollments = (
            db.query(Enrollment)
            .filter(Enrollment.workspace_id == workspace_id, Enrollment.plan_id == plan.id)
            .all()
        )
        for enr in enrollments:
            if (enr.status or "active") == "canceled":
                skipped += 1
                continue
            if not _renewal_due(db, workspace_id, plan, enr.student_id, today):
                skipped += 1
                continue
            row = Invoice(
                workspace_id=workspace_id,
                student_id=enr.student_id,
                plan_id=plan.id,
                amount_cents=plan.amount_cents,
                kind="static",
                status="open",
                meta={"renewal": True, "renewal_day": today, "enrollment_id": enr.id},
            )
            db.add(row)
            db.flush()
            note_invoice_created(db, row, actor_user_id)
            created.append(row.id)
    audit(db, workspace_id, actor_user_id, "billing.renewal", {"created": created, "day": today})
    db.flush()
    return {"created": created, "skipped": skipped, "day": today}


def cancel_enrollment(db: Session, workspace_id: str, actor_user_id: str, cohort_id: str, student_id: str) -> Enrollment:
    row = (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == workspace_id,
            Enrollment.cohort_id == cohort_id,
            Enrollment.student_id == student_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "enrollment")
    row.status = "canceled"
    audit(
        db,
        workspace_id,
        actor_user_id,
        "billing.enrollment_cancel",
        {"enrollment_id": row.id, "student_id": student_id, "plan_id": row.plan_id},
    )
    db.flush()
    return row


def link_enrollment_plan(
    db: Session, workspace_id: str, cohort_id: str, student_id: str, plan_id: str
) -> Enrollment:
    row = (
        db.query(Enrollment)
        .filter(
            Enrollment.workspace_id == workspace_id,
            Enrollment.cohort_id == cohort_id,
            Enrollment.student_id == student_id,
        )
        .first()
    )
    if not row or (row.status or "active") == "canceled":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "enrollment")
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.workspace_id == workspace_id).first()
    if not plan:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "plan")
    row.plan_id = plan.id
    db.flush()
    return row


def sync_payouts(db: Session, workspace_id: str) -> list[Payout]:
    """Amounts come from staff-completed and auto-completed sessions, not seeded rows."""
    sessions = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == workspace_id).all()
    cohorts = {c.id: c for c in db.query(Cohort).filter(Cohort.workspace_id == workspace_id).all()}
    grouped: dict[str, list[ScheduledSession]] = {}
    for s in sessions:
        if display_status(s) not in BILLABLE_DISPLAY:
            continue
        grouped.setdefault(s.teacher_user_id, []).append(s)
    touched: list[Payout] = []
    for teacher_id, rows in grouped.items():
        amount = 0
        flat_n = 0
        hourly_n = 0
        for s in rows:
            cohort = cohorts.get(s.cohort_id) if s.cohort_id else None
            hourly = cohort and (cohort.billing_mode or "static") == "hourly" and (cohort.hourly_rate_cents or 0) > 0
            if hourly:
                amount += _amount(scheduled_minutes(s), cohort.hourly_rate_cents or 0)
                hourly_n += 1
            else:
                flat_n += 1
        explanation = (
            f"{len(rows)} taught sessions; {hourly_n} hourly billed {amount} cents; "
            f"{flat_n} flat-plan sessions contribute 0"
        )
        user = db.get(User, teacher_id)
        name = user.display_name if user else "Teacher"
        row = (
            db.query(Payout)
            .filter(Payout.workspace_id == workspace_id, Payout.teacher_user_id == teacher_id)
            .first()
        )
        if not row:
            row = Payout(workspace_id=workspace_id, teacher_user_id=teacher_id, status="pending", amount_cents=0)
            db.add(row)
            db.flush()
        row.amount_cents = amount
        meta = meta_of(row)
        meta.update(
            {
                "teacher_name": name,
                "sessions": len(rows),
                "explanation": explanation,
                "hourly_sessions": hourly_n,
                "flat_sessions": flat_n,
            }
        )
        row.meta = meta
        touched.append(row)
    db.flush()
    touched.sort(key=lambda r: (meta_of(r).get("teacher_name") or "", r.id))
    return touched


def payout_out(row: Payout) -> dict:
    meta = meta_of(row)
    return {
        "id": row.id,
        "amount_cents": row.amount_cents,
        "status": row.status,
        "teacher_user_id": row.teacher_user_id,
        "teacher_name": meta.get("teacher_name"),
        "period": meta.get("period"),
        "sessions": meta.get("sessions"),
        "explanation": meta.get("explanation") or "",
    }


def advance_payout(db: Session, workspace_id: str, actor_user_id: str, payout_id: str, new_status: str) -> Payout:
    row = db.query(Payout).filter(Payout.id == payout_id, Payout.workspace_id == workspace_id).first()
    if not row or not row.teacher_user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "payout")
    allowed = {"pending": "approved", "approved": "paid"}
    if allowed.get(row.status) != new_status:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "status")
    row.status = new_status
    audit(
        db,
        workspace_id,
        actor_user_id,
        "payout.advance",
        {"payout_id": row.id, "status": new_status, "amount_cents": row.amount_cents},
    )
    db.flush()
    return row


def revenue_rollup(db: Session, workspace_id: str) -> dict:
    platform = (
        db.query(PlatformInvoice).filter(PlatformInvoice.workspace_id == workspace_id).all()
    )
    invoices = db.query(Invoice).filter(Invoice.workspace_id == workspace_id).all()
    student = 0
    for inv in invoices:
        if inv.status == "paid":
            student += inv.amount_cents - (inv.refunded_cents or 0)
        elif inv.status == "refunded":
            student += max(inv.amount_cents - (inv.refunded_cents or 0), 0)
    return {
        "platform_cents": sum(p.amount_cents for p in platform),
        "student_cents": student,
    }


def get_invoice(db: Session, workspace_id: str, invoice_id: str) -> Invoice:
    row = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.workspace_id == workspace_id).first()
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice")
    return row


def assert_student_visible(db: Session, principal, student_id: str) -> None:
    from app.services.scope import can_read_student

    if principal.role == "owner":
        st = db.query(Student).filter(Student.id == student_id, Student.workspace_id == principal.workspace_id).first()
        if not st:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice")
        return
    if principal.role in ("student", "parent") and can_read_student(db, principal, student_id):
        return
    raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
