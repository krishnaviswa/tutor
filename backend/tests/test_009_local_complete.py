"""Local-only whiteboard, cohort chat, in-app notices, and billing trail. Ports stay mock."""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.db import session_factory
from app.models.tables import PlatformSubscription
from app.services.seed import WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login

COHORT = cid("0001", 21)
SESSION = cid("0001", 22)
STUDENT = cid("0001", 20)
STUDENT2 = cid("0001", 40)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def test_whiteboard_last_write_and_membership(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    outsider = auth(login(client, "+9101s3", WS_EXAM, "student"))
    assistant = auth(login(client, "+9101a", WS_EXAM, "assistant"))
    other = auth(login(client, "+9102t", WS_LANG, "teacher"))

    first = client.put(
        f"/api/v1/sessions/{SESSION}/board",
        headers=student,
        json={"strokes": [{"id": "a", "points": [[0, 0], [1, 1]]}], "updated_at": "2020-01-01T00:00:00+00:00"},
    )
    assert first.status_code == 200, first.text
    again = client.put(
        f"/api/v1/sessions/{SESSION}/board",
        headers=student,
        json={"strokes": [{"id": "b"}], "updated_at": "2020-01-02T00:00:00+00:00"},
    )
    assert again.status_code == 200
    board = client.get(f"/api/v1/sessions/{SESSION}/board", headers=student).json()
    assert board["strokes"] == [{"id": "b"}]
    assert board["updated_at"] == "2020-01-02T00:00:00+00:00"
    assert client.get(f"/api/v1/sessions/{SESSION}/board", headers=parent).status_code == 403
    assert client.put(
        f"/api/v1/sessions/{SESSION}/board", headers=parent, json={"strokes": []}
    ).status_code == 403
    assert client.get(f"/api/v1/sessions/{SESSION}/board", headers=outsider).status_code == 404
    assert client.get(f"/api/v1/sessions/{SESSION}/board", headers=assistant).status_code == 200
    assert client.put(
        f"/api/v1/sessions/{SESSION}/board", headers=assistant, json={"strokes": [{"id": "no"}]}
    ).status_code == 403
    assert client.get(f"/api/v1/sessions/{SESSION}/board", headers=other).status_code == 404


def test_cohort_room_persists_and_hides_outsiders(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    outsider = auth(login(client, "+9101s3", WS_EXAM, "student"))
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    assistant = auth(login(client, "+9101a", WS_EXAM, "assistant"))
    other = auth(login(client, "+9102s", WS_LANG, "student"))
    path = f"/api/v1/cohorts/{COHORT}/messages"

    posted = client.post(path, headers=student, json={"body": "hello room", "attachment": "notes.pdf"})
    assert posted.status_code == 200, posted.text
    assert posted.json()["cohort_id"] == COHORT
    assert posted.json()["student_id"] is None
    listed = client.get(path, headers=student).json()
    assert any(m["body"] == "hello room" and m["attachment"] == "notes.pdf" and m["created_at"] for m in listed)
    assert client.post(path, headers=assistant, json={"body": "staff note"}).status_code == 200
    refreshed = client.get(path, headers=student).json()
    assert {m["body"] for m in refreshed} >= {"hello room", "staff note"}
    assert client.get(path, headers=outsider).status_code == 404
    assert client.get(f"/api/v1/cohorts/{cid('0001', 67)}/messages", headers=student).status_code == 404
    assert client.post(path, headers=parent, json={"body": "no"}).status_code == 403
    assert client.get(path, headers=other).status_code == 404
    threads = client.get("/api/v1/threads", headers=parent).json()
    assert threads
    assert all(t.get("student_id") for t in threads)


def test_start_and_cancel_in_app_even_when_whatsapp_fails(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    outsider = auth(login(client, "+9101s3", WS_EXAM, "student"))
    before = len(client.app.state.ports.whatsapp)

    started = client.post(f"/api/v1/sessions/{SESSION}/start", headers=teacher)
    assert started.status_code == 200, started.text
    assert started.json()["idempotent"] is False
    assert started.json()["timeline_event_ids"]
    again = client.post(f"/api/v1/sessions/{SESSION}/start", headers=teacher)
    assert again.status_code == 200
    assert again.json()["idempotent"] is True
    assert again.json()["timeline_event_ids"] == []
    assert len(client.app.state.ports.whatsapp) == before
    assert client.post(f"/api/v1/sessions/{SESSION}/start", headers=student).status_code == 403

    tl = client.get(
        f"/api/v1/students/{STUDENT}/timeline",
        headers=teacher,
        params={"event_type": "session.started"},
    ).json()
    assert len(tl) == 1
    assert "started" in tl[0]["body"].lower()

    student_box = client.get("/api/v1/notifications/inbox", headers=student).json()
    parent_box = client.get("/api/v1/notifications/inbox", headers=parent).json()
    teacher_box = client.get("/api/v1/notifications/inbox", headers=teacher).json()
    assert student_box and student_box[0]["created_at"]
    assert any(n["body"].startswith("Class started:") and n["student_id"] == STUDENT for n in student_box)
    assert any(n["to_role"] == "parent" and n["student_id"] == STUDENT for n in parent_box)
    assert all(n["student_id"] == STUDENT for n in parent_box)
    assert any(n["to_role"] == "teacher" for n in teacher_box)
    outsider_box = client.get("/api/v1/notifications/inbox", headers=outsider).json()
    assert all(n["student_id"] != STUDENT for n in outsider_box)

    created = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"title": "Storm class", "cohort_id": COHORT, "starts_at": _iso(datetime(2020, 6, 1, tzinfo=timezone.utc))},
    )
    assert created.status_code == 200, created.text
    sid = created.json()["id"]

    def boom(*_a, **_k):
        raise RuntimeError("whatsapp down")

    client.app.state.ports.send_whatsapp = boom
    cancelled = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=teacher,
        json={"status": "cancelled", "cancel_reason": "storm"},
    )
    assert cancelled.status_code == 200, cancelled.text
    cancelled_tl = client.get(
        f"/api/v1/students/{STUDENT}/timeline",
        headers=teacher,
        params={"event_type": "session.cancelled"},
    ).json()
    assert any(sid and "cancelled" in e["body"].lower() for e in cancelled_tl)
    box = client.get("/api/v1/notifications/inbox", headers=student).json()
    assert any("cancelled" in n["body"].lower() and n["channel"] == "in_app" for n in box)
    assert client.app.state.ports.live_calls == 0


def test_platform_subscription_and_revenue_rollup(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    first = client.get("/api/v1/billing/subscription", headers=owner)
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["meters"]
    assert body["tier"] == "starter"
    assert body["status"] == "trial"
    assert body["prices"] == {"starter": 0, "cohort": 4900, "institute": 14900}
    end = datetime.fromisoformat(body["period_end"])
    assert timedelta(days=13) < end - datetime.now(timezone.utc) < timedelta(days=15)
    student_before = client.get("/api/v1/reports/revenue", headers=owner).json()["student_cents"]
    assert student_before >= 500

    up = client.post("/api/v1/billing/subscription/tier", headers=owner, json={"tier": "cohort"})
    assert up.status_code == 200, up.text
    assert up.json()["tier"] == "cohort"
    assert up.json()["status"] == "active"
    assert up.json()["invoices"][0]["amount_cents"] == 4900
    inst = client.post("/api/v1/billing/subscription/tier", headers=owner, json={"tier": "institute"})
    assert inst.json()["amount_cents"] == 14900
    down = client.post("/api/v1/billing/subscription/tier", headers=owner, json={"tier": "starter"})
    assert down.json()["tier"] == "starter"
    assert any(inv["amount_cents"] == 0 and inv["action"] == "downgrade" for inv in down.json()["invoices"])

    paused = client.post("/api/v1/billing/subscription/pause", headers=owner)
    assert paused.json()["status"] == "paused"
    assert client.get("/api/v1/sessions", headers=teacher).status_code == 200
    resumed = client.post("/api/v1/billing/subscription/resume", headers=owner)
    assert resumed.json()["status"] == "active"
    cancelled = client.post("/api/v1/billing/subscription/cancel", headers=owner)
    assert cancelled.json()["status"] == "cancel_at_period_end"
    assert client.get("/api/v1/sessions", headers=teacher).status_code == 200

    revenue = client.get("/api/v1/reports/revenue", headers=owner).json()
    assert revenue["platform_cents"] == 4900 + 14900
    assert revenue["student_cents"] == student_before
    assert set(revenue) == {"platform_cents", "student_cents"}
    console = client.get("/api/v1/owner/console", headers=owner).json()
    assert console["revenue"] == revenue
    assert client.get("/api/v1/reports/revenue", headers=teacher).status_code == 403
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    assert client.get("/api/v1/reports/revenue", headers=parent).status_code == 403
    assert isinstance(client.get("/api/v1/reports", headers=parent).json(), list)

    audit = client.get("/api/v1/audit", headers=owner).json()
    assert any(row["action"] == "billing.tier_change" for row in audit)
    assert any(row["action"] == "billing.cancel" for row in audit)

    lang = auth(login(client, "+9102o", WS_LANG, "owner"))
    other = client.get("/api/v1/billing/subscription", headers=lang).json()
    assert other["invoices"] == []
    assert other["tier"] == "starter"
    exam_ids = {inv["id"] for inv in down.json()["invoices"]}
    assert exam_ids.isdisjoint({inv["id"] for inv in other["invoices"]})


def test_lapsed_subscription_throttles_sends_not_core(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    client.get("/api/v1/billing/subscription", headers=owner)
    client.post("/api/v1/billing/subscription/cancel", headers=owner)
    db = session_factory()()
    sub = db.query(PlatformSubscription).filter(PlatformSubscription.workspace_id == WS_EXAM).one()
    sub.period_end = datetime.now(timezone.utc) - timedelta(days=1)
    sub.status = "cancel_at_period_end"
    db.commit()
    db.close()

    assert login(client, "+9101t", WS_EXAM, "teacher")
    assert client.get("/api/v1/sessions", headers=teacher).status_code == 200
    session_id = client.get("/api/v1/sessions", headers=teacher).json()[0]["id"]
    recorded = client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=teacher,
        json={"notes": "class still delivered", "attendance": [{"student_id": STUDENT, "status": "present"}]},
    )
    assert recorded.status_code == 200, recorded.text
    assert recorded.json()["timeline_event_ids"]
    assert recorded.json()["notify"]["skipped"]
    assert not recorded.json()["notify"]["sent"]
    assert any(row["reason"] == "quota_block" for row in recorded.json()["notify"]["skipped"])
    tl = client.get(f"/api/v1/students/{STUDENT}/timeline", headers=teacher).json()
    assert any(e["event_type"] == "session_recorded" for e in tl)
    seen = client.get("/api/v1/billing/subscription", headers=owner).json()
    assert seen["status"] == "canceled"


def test_invoice_trail_receipt_refund_and_idempotent_pay(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    created = client.post(
        "/api/v1/invoices",
        headers=owner,
        json={"student_id": STUDENT, "amount_cents": 800},
    )
    assert created.status_code == 200, created.text
    assert created.json()["status"] == "open"
    invoice_id = created.json()["id"]
    before = len(client.app.state.ports.payments)
    headers = {**student, "Idempotency-Key": "pay-once"}
    first = client.post("/api/v1/payments/checkout", headers=headers, json={"invoice_id": invoice_id})
    second = client.post("/api/v1/payments/checkout", headers=headers, json={"invoice_id": invoice_id})
    assert first.status_code == 200, first.text
    assert first.json()["status"] == "paid"
    assert second.json()["idempotent"] is True
    assert second.json()["receipt"] == first.json()["receipt"]
    assert len(client.app.state.ports.payments) == before + 1

    detail = client.get(f"/api/v1/invoices/{invoice_id}", headers=parent).json()
    types = [e["event_type"] for e in detail["events"]]
    assert types.count("created") == 1
    assert types.count("payment_attempted") == 1
    assert types.count("paid") == 1
    again = client.get(f"/api/v1/invoices/{invoice_id}", headers=student).json()
    assert again["receipt"] == detail["receipt"]
    assert again["receipt_id"]
    assert detail["receipt"].startswith("Receipt ")
    tl = client.get(f"/api/v1/students/{STUDENT}/timeline", headers=teacher).json()
    assert {e["event_type"] for e in tl} >= {"invoice.created", "invoice.payment_attempted", "invoice.paid"}

    assert client.post(
        f"/api/v1/invoices/{invoice_id}/refund",
        headers=teacher,
        json={"amount_cents": 100, "reason": "no"},
    ).status_code == 403
    assert client.post(
        f"/api/v1/invoices/{invoice_id}/refund",
        headers=owner,
        json={"amount_cents": 100, "reason": " "},
    ).status_code == 400
    partial = client.post(
        f"/api/v1/invoices/{invoice_id}/refund",
        headers=owner,
        json={"amount_cents": 100, "reason": "goodwill"},
    )
    assert partial.status_code == 200, partial.text
    assert partial.json()["status"] == "paid"
    assert partial.json()["refunded_cents"] == 100
    assert partial.json()["receipt"] == detail["receipt"]
    full = client.post(
        f"/api/v1/invoices/{invoice_id}/refund",
        headers=owner,
        json={"amount_cents": 700, "reason": "withdrawn"},
    )
    assert full.json()["status"] == "refunded"
    assert full.json()["refunded_cents"] == 800
    events = client.get(f"/api/v1/invoices/{invoice_id}", headers=owner).json()["events"]
    assert sum(1 for e in events if e["event_type"] == "refunded") == 2
    tl = client.get(
        f"/api/v1/students/{STUDENT}/timeline",
        headers=teacher,
        params={"event_type": "invoice.refunded"},
    ).json()
    assert len(tl) == 2
    audit = client.get("/api/v1/audit", headers=owner).json()
    assert any(row["action"] == "billing.refund" for row in audit)
    lang = auth(login(client, "+9102o", WS_LANG, "owner"))
    assert client.get(f"/api/v1/invoices/{invoice_id}", headers=lang).status_code == 404


def test_renewal_is_once_per_day_and_skips_canceled_enrollment(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    cohort = client.post("/api/v1/cohorts", headers=owner, json={"name": "Renewals"}).json()
    first = client.post("/api/v1/students", headers=owner, json={"display_name": "Renew A"}).json()
    second = client.post("/api/v1/students", headers=owner, json={"display_name": "Renew B"}).json()
    patched = client.patch(
        f"/api/v1/cohorts/{cohort['id']}",
        headers=owner,
        json={"student_ids": [first["id"], second["id"]]},
    )
    assert patched.status_code == 200, patched.text
    plan_id = client.get("/api/v1/plans", headers=owner).json()[0]["id"]
    for student_id in (first["id"], second["id"]):
        linked = client.post(
            f"/api/v1/cohorts/{cohort['id']}/enrollments/{student_id}/plan",
            headers=owner,
            json={"plan_id": plan_id},
        )
        assert linked.status_code == 200, linked.text
    cancelled = client.post(
        f"/api/v1/cohorts/{cohort['id']}/enrollments/{second['id']}/cancel",
        headers=owner,
    )
    assert cancelled.json()["status"] == "canceled"
    run = client.post("/api/v1/billing/renewals", headers=owner)
    assert run.status_code == 200, run.text
    assert len(run.json()["created"]) == 1
    invoice = client.get(f"/api/v1/invoices/{run.json()['created'][0]}", headers=owner).json()
    assert invoice["student_id"] == first["id"]
    assert invoice["status"] == "open"
    assert invoice["kind"] == "static"
    again = client.post("/api/v1/billing/renewals", headers=owner).json()
    assert again["created"] == []


def test_payouts_follow_completed_sessions(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    rows = client.get("/api/v1/payouts", headers=owner).json()
    assert rows
    assert rows[0]["teacher_name"]
    assert rows[0]["status"] == "pending"
    assert all(row["amount_cents"] == 0 for row in rows)
    assert all("flat-plan" in row["explanation"] and "contribute 0" in row["explanation"] for row in rows)
    assert all(row["sessions"] for row in rows)
    payout_id = rows[0]["id"]
    approved = client.post(
        f"/api/v1/payouts/{payout_id}/advance",
        headers=owner,
        json={"status": "approved"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"
    paid = client.post(
        f"/api/v1/payouts/{payout_id}/advance",
        headers=owner,
        json={"status": "paid"},
    )
    assert paid.json()["status"] == "paid"
    assert client.post(
        f"/api/v1/payouts/{payout_id}/advance",
        headers=owner,
        json={"status": "approved"},
    ).status_code == 400
    assert client.post(
        f"/api/v1/payouts/{payout_id}/advance",
        headers=teacher,
        json={"status": "paid"},
    ).status_code == 403
    audit = client.get("/api/v1/audit", headers=owner).json()
    assert any(row["action"] == "payout.advance" for row in audit)
    lang = client.get("/api/v1/payouts", headers=auth(login(client, "+9102o", WS_LANG, "owner"))).json()
    assert {row["id"] for row in lang}.isdisjoint({row["id"] for row in rows})


def test_hourly_invoice_reviews_and_freezes(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    seed = next(c for c in client.get("/api/v1/cohorts", headers=owner).json() if c["id"] == COHORT)
    assert seed["billing_mode"] == "static"
    assert seed["hourly_rate_cents"] == 0
    assert "topic_rate" not in seed

    cohort = client.post("/api/v1/cohorts", headers=owner, json={"name": "Hourly room"}).json()
    missing = client.patch(
        f"/api/v1/cohorts/{cohort['id']}",
        headers=owner,
        json={"billing_mode": "hourly"},
    )
    assert missing.status_code == 400
    ready = client.patch(
        f"/api/v1/cohorts/{cohort['id']}",
        headers=owner,
        json={"billing_mode": "hourly", "hourly_rate_cents": 4000, "student_ids": [STUDENT, STUDENT2]},
    )
    assert ready.status_code == 200, ready.text
    assert ready.json()["billing_mode"] == "hourly"
    assert ready.json()["hourly_rate_cents"] == 4000
    assert set(ready.json()["student_ids"]) == {STUDENT, STUDENT2}

    past = datetime(2020, 3, 1, 10, 0, tzinfo=timezone.utc)
    held = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"title": "Held", "cohort_id": cohort["id"], "starts_at": _iso(past)},
    )
    assert held.status_code == 200, held.text
    held_id = held.json()["id"]
    marked = client.patch(
        f"/api/v1/sessions/{held_id}/record",
        headers=teacher,
        json={"attendance": [{"student_id": STUDENT, "status": "absent"}, {"student_id": STUDENT2, "status": "absent"}]},
    )
    assert marked.status_code == 200, marked.text
    dropped = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"title": "Dropped", "cohort_id": cohort["id"], "starts_at": _iso(datetime(2020, 4, 1, tzinfo=timezone.utc))},
    ).json()["id"]
    client.patch(f"/api/v1/sessions/{dropped}", headers=teacher, json={"status": "cancelled", "cancel_reason": "storm"})
    later = datetime.now(timezone.utc) + timedelta(days=30)
    upcoming = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"title": "Later", "cohort_id": cohort["id"], "starts_at": _iso(later)},
    ).json()["id"]

    made = client.post(
        "/api/v1/invoices/hourly",
        headers=owner,
        json={
            "cohort_id": cohort["id"],
            "period_start": "2020-01-01T00:00:00+00:00",
            "period_end": _iso(later + timedelta(days=1)),
        },
    )
    assert made.status_code == 200, made.text
    invoices = made.json()
    assert len(invoices) == 2
    assert {row["student_id"] for row in invoices} == {STUDENT, STUDENT2}
    row = next(item for item in invoices if item["student_id"] == STUDENT)
    assert row["status"] == "pending_review"
    assert row["kind"] == "hourly"
    assert row["hours"] == 1.5
    assert row["amount_cents"] == 6000
    assert row["frozen"] is False
    assert [s["id"] for s in row["sessions"]] == [held_id]
    assert dropped not in {s["id"] for s in row["sessions"]}
    assert upcoming not in {s["id"] for s in row["sessions"]}
    blocked = client.post("/api/v1/payments/checkout", headers=student, json={"invoice_id": row["id"]})
    assert blocked.status_code == 409

    approved = client.post(f"/api/v1/invoices/{row['id']}/approve", headers=owner)
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "open"
    assert approved.json()["frozen"] is True
    client.patch(
        f"/api/v1/sessions/{held_id}",
        headers=teacher,
        json={"ends_at": _iso(past + timedelta(hours=5))},
    )
    viewed = client.get(f"/api/v1/invoices/{row['id']}", headers=parent).json()
    assert viewed["hours"] == 1.5
    assert viewed["amount_cents"] == 6000
    assert viewed["sessions"][0]["minutes"] == 90
    mine = client.get("/api/v1/invoices/mine", headers=parent).json()
    assert any(item["id"] == row["id"] and item["hours"] == 1.5 for item in mine)
    paid = client.post("/api/v1/payments/checkout", headers=student, json={"invoice_id": row["id"]})
    assert paid.status_code == 200, paid.text
    assert paid.json()["status"] == "paid"
    lang = auth(login(client, "+9102o", WS_LANG, "owner"))
    assert client.post(
        "/api/v1/invoices/hourly",
        headers=lang,
        json={
            "cohort_id": cohort["id"],
            "period_start": "2020-01-01T00:00:00+00:00",
            "period_end": _iso(datetime.now(timezone.utc) + timedelta(days=40)),
        },
    ).status_code == 404


def test_catalog_stays_closed_and_ports_stay_mock(client):
    screens = json.loads((Path(__file__).resolve().parents[2] / "catalog" / "screens.json").read_text(encoding="utf-8"))
    ids = [row["id"] for row in screens]
    assert "profile" in ids
    assert len(ids) == 50
    assert len(set(ids)) == 50
    assert client.app.state.ports.live_calls == 0
