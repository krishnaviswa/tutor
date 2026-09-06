from app.db import session_factory
from app.models.tables import Attendance, Submission
from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_branding_and_whatsapp_pause(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    branded = client.patch("/api/v1/workspaces/current/branding", headers=h, json={"accent": "#2E7D4F"})
    assert branded.status_code == 200
    assert branded.json()["branding"]["accent"] == "#2E7D4F"
    paused = client.post("/api/v1/billing/whatsapp-pause", headers=h, json={"paused": True})
    assert paused.status_code == 200
    assert paused.json()["whatsapp_paused"] is True


def test_join_writes_attendance_in_a_only(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    lang_student = login(client, "+9102s", WS_LANG, "student")
    session_id = client.get("/api/v1/sessions", headers=auth(teacher)).json()[0]["id"]
    link = client.post(f"/api/v1/sessions/{session_id}/video-link", headers=auth(teacher))
    assert link.status_code == 200, link.text
    token = link.json()["join_token"]
    public = client.get(f"/api/v1/join/{token}")
    assert public.status_code == 200
    assert public.json()["workspace_id"] == WS_EXAM
    entered = client.post(f"/api/v1/join/{token}/enter", headers=auth(student))
    assert entered.status_code == 200, entered.text
    stolen = client.post(f"/api/v1/join/{token}/enter", headers=auth(lang_student))
    assert stolen.status_code == 403
    db = session_factory()()
    exam_att = db.query(Attendance).filter(Attendance.workspace_id == WS_EXAM).all()
    lang_att = db.query(Attendance).filter(Attendance.workspace_id == WS_LANG).all()
    assert exam_att
    assert all(a.status == "present" for a in exam_att)
    assert not any(a.session_id == session_id for a in lang_att)
    db.close()


def test_live_rbac_and_empty_transcript(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    session_id = client.get("/api/v1/sessions", headers=auth(teacher)).json()[0]["id"]
    client.post(f"/api/v1/sessions/{session_id}/video-link", headers=auth(teacher))
    live_t = client.get(f"/api/v1/sessions/{session_id}/live", headers=auth(teacher))
    live_s = client.get(f"/api/v1/sessions/{session_id}/live", headers=auth(student))
    assert live_t.status_code == 200
    assert live_s.status_code == 200
    assert live_t.json()["provider"] == "mock"
    eng = client.post(
        f"/api/v1/sessions/{session_id}/engagement",
        headers=auth(student),
        json={"kind": "poll", "payload": {}},
    )
    assert eng.status_code == 403
    video = client.get(f"/api/v1/sessions/{session_id}/video", headers=auth(teacher))
    assert video.status_code == 200
    assert video.json()["transcript"] == []


def test_content_isolated_and_topic_only(client):
    exam = login(client, "+9101t", WS_EXAM, "teacher")
    lang = login(client, "+9102t", WS_LANG, "teacher")
    created = client.post("/api/v1/content", headers=auth(exam), json={"title": "Notes", "body": "A"})
    assert created.status_code == 200
    cid = created.json()["id"]
    listed = client.get("/api/v1/content", headers=auth(lang)).json()
    assert cid not in {c["id"] for c in listed}
    stolen = client.get(f"/api/v1/content/{cid}", headers=auth(lang))
    assert stolen.status_code == 404


def test_practice_attempt_timelines_in_a_only(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    q = client.post(
        "/api/v1/questions",
        headers=auth(teacher),
        json={"stem": "2+2", "choices": ["3", "4"], "answer": "4"},
    )
    assert q.status_code == 200, q.text
    qid = q.json()["id"]
    ps = client.post(
        "/api/v1/practice-sets",
        headers=auth(teacher),
        json={"title": "Warmup", "question_ids": [qid]},
    )
    sid = ps.json()["id"]
    play = client.get(f"/api/v1/practice-sets/{sid}/play", headers=auth(student))
    assert play.status_code == 200
    assert "answer" not in play.json()["questions"][0]
    att = client.post(
        f"/api/v1/practice-sets/{sid}/attempt",
        headers=auth(student),
        json={"answers": {qid: "4"}},
    )
    assert att.status_code == 200, att.text
    attempt_id = att.json()["id"]
    got = client.get(f"/api/v1/attempts/{attempt_id}", headers=auth(student))
    assert got.status_code == 200
    exam_students = client.get("/api/v1/students", headers=auth(teacher)).json()
    tl = client.get(f"/api/v1/students/{exam_students[0]['id']}/timeline", headers=auth(teacher)).json()
    assert any(e["event_type"] == "practice_attempted" for e in tl)
    lang_students = client.get("/api/v1/students", headers=auth(lang_teacher)).json()
    other_tl = client.get(
        f"/api/v1/students/{lang_students[0]['id']}/timeline", headers=auth(lang_teacher)
    ).json()
    stolen = client.get(f"/api/v1/attempts/{attempt_id}", headers=auth(lang_teacher))
    assert stolen.status_code == 404
    assert not any(attempt_id == e.get("id") for e in other_tl)


def test_assignment_grade_and_mock_checkout(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    owner = login(client, "+9101o", WS_EXAM, "owner")
    student = login(client, "+9101s", WS_EXAM, "student")
    parent = login(client, "+9101p", WS_EXAM, "parent")
    lang_parent = login(client, "+9102p", WS_LANG, "parent")
    asg = client.post("/api/v1/assignments", headers=auth(teacher), json={"title": "HW"}).json()
    st_id = client.get("/api/v1/me/dashboard", headers=auth(student)).json()["student_id"]
    db = session_factory()()
    db.add(Submission(workspace_id=WS_EXAM, assignment_id=asg["id"], student_id=st_id, body="done"))
    db.commit()
    sub = db.query(Submission).filter(Submission.assignment_id == asg["id"]).first()
    sub_id = sub.id
    db.close()
    graded = client.post(
        f"/api/v1/assignments/{asg['id']}/grade",
        headers=auth(teacher),
        json={"submission_id": sub_id, "grade": "A"},
    )
    assert graded.status_code == 200, graded.text
    inv = client.post(
        "/api/v1/invoices",
        headers=auth(owner),
        json={"student_id": st_id, "amount_cents": 500},
    )
    assert inv.status_code == 200, inv.text
    mine = client.get("/api/v1/invoices/mine", headers=auth(parent))
    assert mine.status_code == 200
    assert inv.json()["id"] in {i["id"] for i in mine.json()}
    other = client.get("/api/v1/invoices/mine", headers=auth(lang_parent))
    assert inv.json()["id"] not in {i["id"] for i in other.json()}
    pay = client.post(
        "/api/v1/payments/checkout",
        headers=auth(student),
        json={"invoice_id": inv.json()["id"]},
    )
    assert pay.status_code == 200
    assert pay.json()["status"] == "paid"
    assert pay.json()["mock"]["provider"] == "mock"


def test_templates_keep_always_on_and_integrations_mock(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    applied = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "exam-prep"})
    assert applied.status_code == 200
    assert "A1" in applied.json()["modules"]
    assert "F2" in applied.json()["always_on"]
    connected = client.post("/api/v1/integrations/calendar_video/connect", headers=h)
    assert connected.status_code == 200
    assert connected.json()["provider"] == "mock"
    listed = client.get("/api/v1/integrations", headers=h).json()
    assert any(i["name"] == "calendar_video" and i["connected"] for i in listed)
