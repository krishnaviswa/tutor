from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.deps import current_principal, ports_dep, require_roles
from app.db import get_db
from app.models.tables import (
    Attempt,
    AuditLog,
    AutomationRule,
    BacklogItem,
    FeatureFlag,
    Invoice,
    NotificationPref,
    Plan,
    Payout,
    ScheduledSession,
    Student,
    Workspace,
)
from app.ports.mocks import MockPorts
from app.services.auth import Principal
from app.services.quota import ALWAYS_ON
from app.services.scope import linked_student_ids, student_for_principal
from app.services.templates import TEMPLATES, modules_for_template

router = APIRouter()

DEFAULT_PREFS = {
    "teacher": {"whatsapp": True, "email": True, "push": True},
    "parent": {"whatsapp": True, "email": True, "push": True},
    "admin": {"whatsapp": True, "email": True, "push": True},
    "student": {"whatsapp": False, "email": False, "push": True},
}

PORT_NAMES = (
    "calendar_video",
    "sms",
    "email",
    "storage",
    "payments_student",
    "payments_platform",
    "push",
    "whatsapp",
)


class PrefsIn(BaseModel):
    prefs: dict


class InvoiceIn(BaseModel):
    student_id: str
    amount_cents: int
    plan_id: str | None = None


class CheckoutIn(BaseModel):
    invoice_id: str


class BookIn(BaseModel):
    session_id: str | None = None


class RulePatch(BaseModel):
    enabled: int | None = None
    name: str | None = None
    trigger: str | None = None
    action: str | None = None


class TemplateIn(BaseModel):
    kind: str


@router.get("/notifications/prefs")
def get_prefs(principal: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    row = (
        db.query(NotificationPref)
        .filter(
            NotificationPref.workspace_id == principal.workspace_id,
            NotificationPref.user_id == principal.user_id,
        )
        .first()
    )
    prefs = {**DEFAULT_PREFS, **(row.prefs if row else {})}
    if "student" not in prefs:
        prefs["student"] = {"whatsapp": False, "email": False, "push": True}
    prefs["student"]["whatsapp"] = bool(prefs["student"].get("whatsapp", False))
    return prefs


@router.put("/notifications/prefs")
def put_prefs(
    body: PrefsIn,
    principal: Principal = Depends(current_principal),
    db: Session = Depends(get_db),
):
    merged = {**DEFAULT_PREFS, **(body.prefs or {})}
    if principal.role != "owner":
        merged.setdefault("student", {})["whatsapp"] = False if principal.role == "student" else merged.get(
            "student", {}
        ).get("whatsapp", False)
    row = (
        db.query(NotificationPref)
        .filter(
            NotificationPref.workspace_id == principal.workspace_id,
            NotificationPref.user_id == principal.user_id,
        )
        .first()
    )
    if row:
        row.prefs = merged
    else:
        db.add(NotificationPref(workspace_id=principal.workspace_id, user_id=principal.user_id, prefs=merged))
    db.flush()
    return merged


@router.get("/me/dashboard")
def student_dash(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("student")),
):
    st = student_for_principal(db, principal)
    attempts = (
        db.query(Attempt)
        .filter(Attempt.workspace_id == principal.workspace_id, Attempt.student_id == st.id)
        .all()
    )
    sessions = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == principal.workspace_id).count()
    return {
        "student_id": st.id,
        "upcoming_sessions": sessions,
        "attempts": len(attempts),
        "last_score": attempts[-1].score if attempts else None,
    }


@router.get("/teacher/dashboard")
def teacher_dash(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("teacher")),
):
    sessions = db.query(ScheduledSession).filter(ScheduledSession.workspace_id == principal.workspace_id).count()
    students = db.query(Student).filter(Student.workspace_id == principal.workspace_id).count()
    attempts = db.query(Attempt).filter(Attempt.workspace_id == principal.workspace_id).count()
    return {"sessions": sessions, "students": students, "attempts": attempts}


@router.get("/reports")
def reports(principal: Principal = Depends(require_roles("owner", "teacher", "parent"))):
    return []


@router.post("/reports/export")
def reports_export(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    students = db.query(Student).filter(Student.workspace_id == principal.workspace_id).all()
    attempts = db.query(Attempt).filter(Attempt.workspace_id == principal.workspace_id).all()
    return {
        "workspace_id": principal.workspace_id,
        "format": "json",
        "students": [{"id": s.id, "display_name": s.display_name} for s in students],
        "attempts": [{"id": a.id, "student_id": a.student_id, "score": a.score} for a in attempts],
    }


@router.get("/backlog")
def list_backlog(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    rows = db.query(BacklogItem).filter(BacklogItem.workspace_id == principal.workspace_id).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "status": r.status,
            "student_id": r.student_id,
            "kind": r.kind,
            "booked_session_id": r.booked_session_id,
        }
        for r in rows
    ]


@router.post("/backlog/{item_id}/book")
def book_backlog(
    item_id: str,
    body: BookIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "teacher")),
):
    item = (
        db.query(BacklogItem)
        .filter(BacklogItem.id == item_id, BacklogItem.workspace_id == principal.workspace_id)
        .first()
    )
    if not item:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "backlog")
    session_id = body.session_id
    if session_id:
        s = (
            db.query(ScheduledSession)
            .filter(ScheduledSession.id == session_id, ScheduledSession.workspace_id == principal.workspace_id)
            .first()
        )
        if not s:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "session")
        item.booked_session_id = s.id
    item.status = "booked"
    db.flush()
    return {"id": item.id, "status": item.status, "booked_session_id": item.booked_session_id}


@router.get("/plans")
def list_plans(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    rows = db.query(Plan).filter(Plan.workspace_id == principal.workspace_id).all()
    return [{"id": r.id, "name": r.name, "amount_cents": r.amount_cents, "interval": r.interval} for r in rows]


@router.post("/invoices")
def create_invoice(
    body: InvoiceIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    st = db.query(Student).filter(Student.id == body.student_id, Student.workspace_id == principal.workspace_id).first()
    if not st:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "student")
    row = Invoice(
        workspace_id=principal.workspace_id,
        student_id=st.id,
        plan_id=body.plan_id,
        amount_cents=body.amount_cents,
    )
    db.add(row)
    db.flush()
    return {"id": row.id, "student_id": row.student_id, "amount_cents": row.amount_cents, "status": row.status}


@router.get("/invoices/mine")
def invoices_mine(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner", "parent", "student")),
):
    q = db.query(Invoice).filter(Invoice.workspace_id == principal.workspace_id)
    if principal.role == "student":
        st = student_for_principal(db, principal)
        q = q.filter(Invoice.student_id == st.id)
    elif principal.role == "parent":
        allowed = linked_student_ids(db, principal)
        q = q.filter(Invoice.student_id.in_(allowed or [""]))
    rows = q.all()
    return [
        {"id": r.id, "student_id": r.student_id, "amount_cents": r.amount_cents, "status": r.status}
        for r in rows
    ]


@router.post("/payments/checkout")
def checkout(
    body: CheckoutIn,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("student", "parent")),
):
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == body.invoice_id, Invoice.workspace_id == principal.workspace_id)
        .first()
    )
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "invoice")
    if principal.role == "student":
        st = student_for_principal(db, principal)
        if inv.student_id != st.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "not your invoice")
    elif inv.student_id not in linked_student_ids(db, principal):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "not linked")
    result = ports.checkout_invoice(inv.id, inv.amount_cents)
    inv.status = "paid"
    db.flush()
    return {"invoice_id": inv.id, "status": inv.status, "mock": result}


@router.get("/payouts")
def list_payouts(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    rows = db.query(Payout).filter(Payout.workspace_id == principal.workspace_id).all()
    return [{"id": r.id, "amount_cents": r.amount_cents, "status": r.status} for r in rows]


@router.get("/audit")
def list_audit(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    rows = (
        db.query(AuditLog)
        .filter(AuditLog.workspace_id == principal.workspace_id)
        .order_by(AuditLog.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {"id": r.id, "action": r.action, "payload": r.payload, "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in rows
    ]


@router.post("/data-export")
def data_export(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    students = db.query(Student).filter(Student.workspace_id == principal.workspace_id).all()
    return {
        "workspace_id": principal.workspace_id,
        "students": [{"id": s.id, "display_name": s.display_name} for s in students],
    }


@router.get("/templates")
def list_templates(principal: Principal = Depends(require_roles("owner"))):
    return [{"id": k, "modules": modules_for_template(k)} for k in TEMPLATES]


@router.post("/workspaces/current/template")
def apply_template(
    body: TemplateIn,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    if body.kind not in TEMPLATES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "template")
    flags = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == principal.workspace_id).first()
    modules = modules_for_template(body.kind)
    if flags:
        flags.modules = modules
    else:
        db.add(FeatureFlag(workspace_id=principal.workspace_id, modules=modules))
    ws = db.get(Workspace, principal.workspace_id)
    if ws:
        ws.kind = body.kind if body.kind != "everything" else ws.kind
    db.flush()
    return {"kind": body.kind, "modules": modules, "always_on": list(ALWAYS_ON)}


@router.get("/automation-rules")
def list_rules(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    rows = db.query(AutomationRule).filter(AutomationRule.workspace_id == principal.workspace_id).all()
    return [
        {"id": r.id, "name": r.name, "trigger": r.trigger, "action": r.action, "enabled": bool(r.enabled)}
        for r in rows
    ]


@router.patch("/automation-rules/{rule_id}")
def patch_rule(
    rule_id: str,
    body: RulePatch,
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    row = (
        db.query(AutomationRule)
        .filter(AutomationRule.id == rule_id, AutomationRule.workspace_id == principal.workspace_id)
        .first()
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "rule")
    if body.enabled is not None:
        row.enabled = 1 if body.enabled else 0
    if body.name is not None:
        row.name = body.name
    if body.trigger is not None:
        row.trigger = body.trigger
    if body.action is not None:
        row.action = body.action
    db.flush()
    return {"id": row.id, "enabled": bool(row.enabled), "name": row.name}


@router.get("/integrations")
def list_integrations(
    db: Session = Depends(get_db),
    principal: Principal = Depends(require_roles("owner")),
):
    ws = db.get(Workspace, principal.workspace_id)
    connected = set(ws.integrations or []) if ws else set()
    return [{"name": n, "connected": n in connected, "provider": "mock"} for n in PORT_NAMES]


@router.post("/integrations/{name}/connect")
def connect_integration(
    name: str,
    db: Session = Depends(get_db),
    ports: MockPorts = Depends(ports_dep),
    principal: Principal = Depends(require_roles("owner")),
):
    if name not in PORT_NAMES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "integration")
    grant = ports.connect_integration(name)
    ws = db.get(Workspace, principal.workspace_id)
    if ws:
        names = list(ws.integrations or [])
        if name not in names:
            names.append(name)
        ws.integrations = names
    db.flush()
    return grant
