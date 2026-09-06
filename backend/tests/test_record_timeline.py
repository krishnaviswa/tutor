from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_record_fans_out_timeline_in_workspace_a_only(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    sessions = client.get("/api/v1/sessions", headers=auth(teacher)).json()
    session_id = sessions[0]["id"]
    students = client.get("/api/v1/students", headers=auth(teacher)).json()
    student_id = students[0]["id"]
    rec = client.patch(
        f"/api/v1/sessions/{session_id}/record",
        headers=auth(teacher),
        json={"notes": "Covered Unit 1", "attendance": [{"student_id": student_id, "status": "present"}]},
    )
    assert rec.status_code == 200, rec.text
    assert rec.json()["timeline_event_ids"]
    tl = client.get(f"/api/v1/students/{student_id}/timeline", headers=auth(teacher))
    assert tl.status_code == 200
    assert any("Unit 1" in e["body"] or e["event_type"] == "session_recorded" for e in tl.json())

    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    lang_students = client.get("/api/v1/students", headers=auth(lang_teacher)).json()
    other = lang_students[0]["id"]
    other_tl = client.get(f"/api/v1/students/{other}/timeline", headers=auth(lang_teacher)).json()
    assert not any(e["event_type"] == "session_recorded" for e in other_tl)


def test_exam_prep_teacher_skips_staff_login_screen(client):
    """Faculty starts at teaching APIs; no extra login route."""
    token = login(client, "+9101t", WS_EXAM, "teacher")
    me = client.get(" /api/v1/auth/me".strip(), headers=auth(token))
    assert me.status_code == 200
    assert me.json()["role"] == "teacher"
    assert client.get("/api/v1/cohorts", headers=auth(token)).status_code == 200
    assert client.get("/api/v1/sessions", headers=auth(token)).status_code == 200


def test_student_own_timeline_only(client):
    student = login(client, "+9101s", WS_EXAM, "student")
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    sid = client.get("/api/v1/students", headers=auth(teacher)).json()[0]["id"]
    assert client.get(f"/api/v1/students/{sid}/timeline", headers=auth(student)).status_code == 200
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    other = client.get("/api/v1/students", headers=auth(lang_teacher)).json()[0]["id"]
    assert client.get(f"/api/v1/students/{other}/timeline", headers=auth(student)).status_code in (403, 404)
