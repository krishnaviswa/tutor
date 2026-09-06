"""006 in-app v2: same catalog paths, mock ports sealed."""

from app.config import get_settings
from app.db import reset_engine
from app.factory import create_app
from app.services.seed import WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login


def test_auth_methods_and_assistant_module_404(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    me = client.get("/api/v1/auth/me", headers=auth(owner)).json()
    assert "otp" in me["auth_methods"]
    assert "magic" in me["auth_methods"]
    ws = client.get("/api/v1/workspaces/current", headers=auth(owner)).json()
    assert ws["auth_methods"] == me["auth_methods"]
    assistant = login(client, "+9101a", WS_EXAM, "assistant")
    denied = client.get("/api/v1/invoices/mine", headers=auth(assistant))
    assert denied.status_code == 404


def test_second_guardian_hides_fees(client):
    parent = login(client, "+9101p", WS_EXAM, "parent")
    home = client.get("/api/v1/parent/home", headers=auth(parent)).json()
    assert home["children"][0]["fee_due"]
    assert home["children"][0]["fee_visible"] is True
    other = login(client, "+9101g", WS_EXAM, "parent")
    hidden = client.get("/api/v1/parent/home", headers=auth(other)).json()
    assert len(hidden["children"]) == 1
    assert hidden["children"][0]["student_id"] == home["children"][0]["student_id"]
    assert hidden["children"][0]["fee_visible"] is False
    assert hidden["children"][0]["fee_due"] is None
    invoices = client.get("/api/v1/invoices/mine", headers=auth(other)).json()
    assert invoices == []


def test_cohort_invite_and_waitlist(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    rows = client.get("/api/v1/cohorts", headers=auth(teacher)).json()
    assert rows[0]["invite_token"]
    assert rows[0]["waitlist"]
    lang = login(client, "+9102t", WS_LANG, "teacher")
    other = client.get("/api/v1/cohorts", headers=auth(lang)).json()
    assert rows[0]["id"] not in {c["id"] for c in other}


def test_session_conflict_409(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    h = auth(teacher)
    sessions = client.get("/api/v1/sessions", headers=h).json()
    first = sessions[0]
    clash = client.post(
        "/api/v1/sessions",
        headers=h,
        json={
            "cohort_id": first["cohort_id"],
            "title": "Overlap",
            "starts_at": first["starts_at"],
        },
    )
    assert clash.status_code == 409


def test_live_chat_and_record_capture(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    h = auth(teacher)
    sid = client.get("/api/v1/sessions", headers=h).json()[0]["id"]
    posted = client.post(
        f"/api/v1/sessions/{sid}/engagement",
        headers=h,
        json={"kind": "chat", "payload": {"text": "hello"}},
    )
    assert posted.status_code == 200
    kinds = {e["kind"] for e in posted.json()["engagement"]}
    assert "chat" in kinds
    rec = client.get(f"/api/v1/sessions/{sid}/record", headers=h).json()
    assert rec["capture"]


def test_auto_assemble_and_negative_mark(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    h = auth(teacher)
    qs = client.get("/api/v1/questions", headers=h).json()
    assert qs[0]["difficulty"]
    assembled = client.post(
        "/api/v1/practice-sets",
        headers=h,
        json={"title": "Auto", "auto_assemble": {"difficulty": "core", "limit": 5}},
    )
    assert assembled.status_code == 200
    assert assembled.json()["question_ids"]
    test = client.post(
        "/api/v1/tests",
        headers=h,
        json={
            "title": "Neg",
            "question_ids": assembled.json()["question_ids"][:1],
            "negative_mark": True,
            "sections": [{"name": "A"}],
        },
    )
    assert test.json()["negative_mark"] is True
    run = client.get(f"/api/v1/tests/{test.json()['id']}/run", headers=auth(student)).json()
    assert "palette" in run
    submitted = client.post(
        f"/api/v1/tests/{test.json()['id']}/submit",
        headers=auth(student),
        json={"answers": {}},
    )
    assert submitted.status_code == 200
    assert submitted.json()["score"] <= submitted.json()["max_score"]
    closed = client.patch(
        "/api/v1/analysis/finding-1/action",
        headers=h,
        json={"action": "remediate", "student_id": cid("0001", 20)},
    )
    assert closed.status_code == 200
    empty = client.patch(
        "/api/v1/analysis/finding-1/action",
        headers=h,
        json={"action": "", "student_id": cid("0001", 20)},
    )
    assert empty.status_code == 400


def test_doubt_sla_and_timeline_filter(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    queue = client.get("/api/v1/doubts/queue", headers=auth(teacher)).json()
    assert "queue_position" in queue[0] or queue[0]["status"] != "open"
    assert "sla_hours" in queue[0]
    sid = cid("0001", 20)
    filtered = client.get(
        f"/api/v1/students/{sid}/timeline",
        headers=auth(teacher),
        params={"event_type": "doubt_opened"},
    )
    assert filtered.status_code == 200
    exported = client.get(
        f"/api/v1/students/{sid}/timeline",
        headers=auth(teacher),
        params={"export": 1},
    )
    assert exported.json()["export"] is True


def test_auto_invoice_coupon_and_automation(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    plans = client.get("/api/v1/plans", headers=h).json()
    student_id = cid("0001", 20)
    inv = client.post(
        "/api/v1/invoices",
        headers=h,
        json={
            "student_id": student_id,
            "amount_cents": 500,
            "plan_id": plans[0]["id"],
            "auto": True,
            "coupon": "SAVE10",
            "days_used": 10,
        },
    )
    assert inv.status_code == 200
    assert inv.json()["auto"] is True
    assert inv.json()["amount_cents"] < plans[0]["amount_cents"]
    payouts = client.get("/api/v1/payouts", headers=h).json()
    assert payouts[0]["teacher_name"]
    rules = client.get("/api/v1/automation-rules", headers=h).json()
    miss = next(r for r in rules if r.get("trigger") == "miss_2_practices")
    patched = client.patch(
        f"/api/v1/automation-rules/{miss['id']}",
        headers=h,
        json={"enabled": 1, "trigger": "miss_2_practices", "action": "backlog"},
    )
    assert patched.status_code == 200
    assert patched.json()["ran"]


def test_factory_still_rejects_live_provider(monkeypatch):
    reset_engine()
    get_settings.cache_clear()
    monkeypatch.setenv("WHATSAPP_PROVIDER", "meta_cloud")
    get_settings.cache_clear()
    try:
        create_app(seed=False)
        raise AssertionError("live provider must fail")
    except RuntimeError as exc:
        assert "must be mock" in str(exc)
    finally:
        monkeypatch.setenv("WHATSAPP_PROVIDER", "mock")
        get_settings.cache_clear()
        reset_engine()
