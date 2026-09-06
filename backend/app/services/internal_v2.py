"""In-app blueprint v2 helpers. Mock ports only. Routers stay thin."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.tables import (
    Attempt,
    AutomationRule,
    BacklogItem,
    Invoice,
    NotificationDelivery,
    ParentLink,
    Plan,
    PracticeSet,
    Question,
    ScheduledSession,
    StaffMembership,
    Workspace,
)
from app.services.auth import Principal


def meta_of(row) -> dict:
    return dict(getattr(row, "meta", None) or {})


def put_meta(row, **fields) -> dict:
    data = meta_of(row)
    for key, value in fields.items():
        if value is not None:
            data[key] = value
    row.meta = data
    return data


def branding_of(ws: Workspace | None) -> dict:
    return dict((ws.branding if ws else None) or {})


def put_branding(ws: Workspace, **fields) -> dict:
    data = branding_of(ws)
    for key, value in fields.items():
        if value is not None:
            data[key] = value
    ws.branding = data
    return data


def auth_methods(ws: Workspace | None) -> list[str]:
    methods = branding_of(ws).get("auth_methods") or ["otp", "magic"]
    return [m for m in methods if m in ("otp", "magic")]


def staff_allowed_modules(db: Session, principal: Principal) -> list[str] | None:
    if principal.role not in ("teacher", "assistant"):
        return None
    row = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == principal.workspace_id,
            StaffMembership.user_id == principal.user_id,
            StaffMembership.role == principal.role,
        )
        .first()
    )
    if not row:
        return None
    mods = meta_of(row).get("modules")
    return list(mods) if mods else None


def fee_visible_for(db: Session, principal: Principal, student_id: str) -> bool:
    if principal.role != "parent":
        return True
    link = (
        db.query(ParentLink)
        .filter(
            ParentLink.workspace_id == principal.workspace_id,
            ParentLink.parent_user_id == principal.user_id,
            ParentLink.student_id == student_id,
            ParentLink.accepted_at.isnot(None),
        )
        .first()
    )
    if not link:
        return False
    return bool(meta_of(link).get("fee_visible", True))


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def teacher_conflict(db: Session, workspace_id: str, teacher_user_id: str, starts_at: datetime, skip_id: str | None = None) -> bool:
    window = timedelta(hours=1)
    start = _aware(starts_at)
    rows = (
        db.query(ScheduledSession)
        .filter(
            ScheduledSession.workspace_id == workspace_id,
            ScheduledSession.teacher_user_id == teacher_user_id,
        )
        .all()
    )
    for s in rows:
        if skip_id and s.id == skip_id:
            continue
        if s.starts_at is None:
            continue
        delta = abs((_aware(s.starts_at) - start).total_seconds())
        if delta < window.total_seconds():
            return True
    return False


def in_availability(ws: Workspace | None, starts_at: datetime) -> bool:
    windows = branding_of(ws).get("availability") or []
    if not windows:
        return True
    weekday = starts_at.strftime("%a")
    hhmm = starts_at.strftime("%H:%M")
    for w in windows:
        if w.get("weekday") == weekday and w.get("start") <= hhmm < w.get("end"):
            return True
    return False


def auto_assemble(db: Session, workspace_id: str, spec: dict) -> list[str]:
    rows = db.query(Question).filter(Question.workspace_id == workspace_id).all()
    tag = spec.get("tag")
    difficulty = spec.get("difficulty")
    picked = []
    for q in rows:
        m = meta_of(q)
        tags = m.get("tags") or []
        if tag and tag not in tags:
            continue
        if difficulty and m.get("difficulty") != difficulty:
            continue
        picked.append(q.id)
    return picked[: spec.get("limit", 10) or 10]


def bump_question_usage(db: Session, workspace_id: str, question_ids: list[str]) -> None:
    for qid in question_ids:
        q = db.query(Question).filter(Question.id == qid, Question.workspace_id == workspace_id).first()
        if not q:
            continue
        m = meta_of(q)
        m["usage_count"] = int(m.get("usage_count") or 0) + 1
        q.meta = m


def score_with_rules(got: int, max_s: int, *, negative_mark: bool, partial: dict | None) -> int:
    if partial:
        total = 0.0
        for pts in partial.values():
            try:
                total += float(pts)
            except (TypeError, ValueError):
                continue
        return int(round(total))
    if negative_mark:
        wrong = max(0, max_s - got)
        return max(0, got - wrong)
    return got


def next_item(db: Session, workspace_id: str, weak_tags: list[str]) -> dict | None:
    sets = db.query(PracticeSet).filter(PracticeSet.workspace_id == workspace_id).all()
    if not sets:
        return None
    if weak_tags:
        for pset in sets:
            m = meta_of(pset)
            if m.get("tag") in weak_tags or any(t in (m.get("tags") or []) for t in weak_tags):
                return {"id": pset.id, "title": pset.title, "reason": "weak-tag"}
    pset = sets[0]
    return {"id": pset.id, "title": pset.title, "reason": "default"}


def sla_hours(created_at: datetime | None) -> float:
    if not created_at:
        return 0.0
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - created_at
    return round(delta.total_seconds() / 3600.0, 2)


def prorate(amount_cents: int, days_used: int, days_in_period: int = 30) -> int:
    remain = max(0, days_in_period - days_used)
    return int(round(amount_cents * remain / days_in_period))


def apply_coupon(ws: Workspace | None, amount_cents: int, code: str | None) -> tuple[int, str | None]:
    if not code:
        return amount_cents, None
    coupons = branding_of(ws).get("coupons") or {}
    offer = coupons.get(code)
    if not offer:
        return amount_cents, None
    pct = int(offer.get("percent") or 0)
    cut = int(round(amount_cents * pct / 100.0))
    return max(0, amount_cents - cut), code


def run_miss_automation(db: Session, workspace_id: str) -> list[str]:
    created: list[str] = []
    rules = (
        db.query(AutomationRule)
        .filter(AutomationRule.workspace_id == workspace_id, AutomationRule.enabled == 1)
        .all()
    )
    miss_rules = [r for r in rules if "miss" in (r.trigger or "").lower() or r.action == "backlog"]
    if not miss_rules:
        return created
    attempts = db.query(Attempt).filter(Attempt.workspace_id == workspace_id).all()
    by_student: dict[str, list[Attempt]] = {}
    for a in attempts:
        by_student.setdefault(a.student_id, []).append(a)
    for student_id, rows in by_student.items():
        missed = [a for a in rows if a.practice_set_id and a.score == 0]
        if len(missed) < 2:
            continue
        exists = (
            db.query(BacklogItem)
            .filter(
                BacklogItem.workspace_id == workspace_id,
                BacklogItem.student_id == student_id,
                BacklogItem.kind == "automation",
            )
            .first()
        )
        if exists:
            continue
        item = BacklogItem(
            workspace_id=workspace_id,
            student_id=student_id,
            title="Missed two practices",
            kind="automation",
            status="open",
            payload={"trigger": "miss_2_practices"},
        )
        db.add(item)
        db.flush()
        created.append(item.id)
    return created


def reminder_delivery(db: Session, workspace_id: str, invoice_id: str, amount_cents: int) -> None:
    db.add(
        NotificationDelivery(
            workspace_id=workspace_id,
            channel="email",
            to_role="parent",
            body=f"Invoice {invoice_id} due {amount_cents}",
            status="mock",
        )
    )


def auto_invoice(
    db: Session,
    workspace_id: str,
    student_id: str,
    plan: Plan,
    *,
    coupon: str | None,
    days_used: int,
    ws: Workspace | None,
) -> Invoice:
    amount = prorate(plan.amount_cents, days_used)
    amount, applied = apply_coupon(ws, amount, coupon)
    row = Invoice(
        workspace_id=workspace_id,
        student_id=student_id,
        plan_id=plan.id,
        amount_cents=amount,
        status="open",
        meta={"auto": True, "coupon": applied, "proration_days_used": days_used},
    )
    db.add(row)
    db.flush()
    reminder_delivery(db, workspace_id, row.id, amount)
    return row
