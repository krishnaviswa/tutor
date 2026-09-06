from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_teacher_reports_return_workspace_slice(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    rows = client.get("/api/v1/reports", headers=auth(teacher)).json()
    assert rows
    ids = {r["student_id"] for r in rows}
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    lang_ids = {s["id"] for s in client.get("/api/v1/students", headers=auth(lang_teacher)).json()}
    assert ids.isdisjoint(lang_ids)


def test_record_skips_foreign_student_attendance(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    h = auth(teacher)
    session_id = client.get("/api/v1/sessions", headers=h).json()[0]["id"]
    exam_sid = client.get("/api/v1/students", headers=h).json()[0]["id"]
    lang_sid = client.get("/api/v1/students", headers=auth(lang_teacher)).json()[0]["id"]
    rec = client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=h,
        json={
            "notes": "mixed attendance",
            "attendance": [
                {"student_id": exam_sid, "status": "present"},
                {"student_id": lang_sid, "status": "present"},
            ],
        },
    )
    assert rec.status_code == 200, rec.text
    att = client.get(f"/api/v1/sessions/{session_id}/record", headers=h).json()["attendance"]
    att_ids = {a["student_id"] for a in att}
    assert exam_sid in att_ids
    assert lang_sid not in att_ids


def test_analysis_action_rejects_other_workspace_student(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    other = client.get("/api/v1/students", headers=auth(lang_teacher)).json()[0]["id"]
    r = client.patch(
        "/api/v1/analysis/finding-1/action",
        headers=auth(teacher),
        json={"student_id": other, "action": "backlog", "note": "nope"},
    )
    assert r.status_code == 404


def test_record_fires_seeded_automation_timeline(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    h = auth(teacher)
    session_id = client.get("/api/v1/sessions", headers=h).json()[0]["id"]
    student_id = client.get("/api/v1/students", headers=h).json()[0]["id"]
    rec = client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=h,
        json={"notes": "auto", "attendance": [{"student_id": student_id, "status": "present"}]},
    )
    assert rec.status_code == 200, rec.text
    tl = client.get(f"/api/v1/students/{student_id}/timeline", headers=h).json()
    assert any(e["event_type"] == "session_recorded" for e in tl)
    assert any(e["event_type"] == "automation" for e in tl)


def test_owner_patch_quotas_and_usage(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    usage = client.get("/api/v1/usage", headers=h)
    assert usage.status_code == 200
    patched = client.patch("/api/v1/billing/quotas", headers=h, json={"meter_key": "whatsapp", "cap": 120})
    assert patched.status_code == 200, patched.text
    wa = next(m for m in patched.json()["meters"] if m["meter_key"] == "whatsapp")
    assert wa["cap"] == 120


def test_parent_link_create_session_patch_import_and_cohort_guard(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    h = auth(teacher)
    student_id = client.get("/api/v1/students", headers=h).json()[0]["id"]
    minted = client.post("/api/v1/parent-links", headers=h, json={"student_id": student_id})
    assert minted.status_code == 200, minted.text
    assert minted.json()["token"]

    session = client.get("/api/v1/sessions", headers=h).json()[0]
    patched = client.patch(
        f"/api/v1/sessions/{session['id']}",
        headers=h,
        json={"title": "Moved slot", "starts_at": "2026-09-08T18:30:00+05:30"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["title"] == "Moved slot"

    imported = client.post(
        "/api/v1/students/import",
        headers=h,
        json={"rows": [{"display_name": "Imported One", "phone": "+91019990001"}]},
    )
    assert imported.status_code == 200, imported.text
    assert imported.json()["created"]

    lang_cohort = client.get("/api/v1/cohorts", headers=auth(lang_teacher)).json()[0]["id"]
    bad = client.post(
        "/api/v1/sessions",
        headers=h,
        json={"cohort_id": lang_cohort, "title": "steal", "starts_at": "2026-09-09T18:30:00+05:30"},
    )
    assert bad.status_code == 400


def test_student_dashboard_exposes_last_attempt(client):
    student = login(client, "+9101s", WS_EXAM, "student")
    dash = client.get("/api/v1/me/dashboard", headers=auth(student))
    assert dash.status_code == 200
    body = dash.json()
    assert "last_attempt_id" in body
    if body["last_attempt_id"]:
        att = client.get(f"/api/v1/attempts/{body['last_attempt_id']}", headers=auth(student))
        assert att.status_code == 200
