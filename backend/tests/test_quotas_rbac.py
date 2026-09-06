from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_quota_warn_at_eighty(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    sub = client.get("/api/v1/billing/subscription", headers=auth(owner))
    assert sub.status_code == 200
    wa = next(m for m in sub.json()["meters"] if m["meter_key"] == "whatsapp")
    assert wa["percent"] >= 80
    assert wa["warn"] is True
    console = client.get("/api/v1/owner/console", headers=auth(owner))
    assert console.status_code == 200
    assert "F2" in console.json()["always_on"]
    assert "D4" in console.json()["always_on"]


def test_quota_block_skips_whatsapp_record_still_writes(client):
    teacher = login(client, "+9102t", WS_LANG, "teacher")
    owner = login(client, "+9102o", WS_LANG, "owner")
    before = client.get("/api/v1/usage", headers=auth(owner)).json()
    wa_before = next(m for m in before["meters"] if m["meter_key"] == "whatsapp")
    assert wa_before["block"] is True
    session_id = client.get("/api/v1/sessions", headers=auth(teacher)).json()[0]["id"]
    student_id = client.get("/api/v1/students", headers=auth(teacher)).json()[0]["id"]
    rec = client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=auth(teacher),
        json={"notes": "still recorded", "attendance": [{"student_id": student_id, "status": "present"}]},
    )
    assert rec.status_code == 200, rec.text
    assert rec.json()["timeline_event_ids"]
    assert rec.json()["notify"]["skipped"]
    assert not rec.json()["notify"]["sent"]
    tl = client.get(f"/api/v1/students/{student_id}/timeline", headers=auth(teacher)).json()
    assert any(e["event_type"] == "session_recorded" for e in tl)


def test_assistant_roster_not_owner_or_record(client):
    assistant = login(client, "+9101a", WS_EXAM, "assistant")
    assert client.get("/api/v1/students", headers=auth(assistant)).status_code == 200
    assert client.get("/api/v1/owner/console", headers=auth(assistant)).status_code == 403
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    session_id = client.get("/api/v1/sessions", headers=auth(teacher)).json()[0]["id"]
    assert client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=auth(assistant),
        json={"notes": "nope"},
    ).status_code == 403
