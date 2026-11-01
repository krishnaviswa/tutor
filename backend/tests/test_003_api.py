from app.db import session_factory
from app.models.tables import Attendance, FeatureFlag, Submission
from app.services.quota import ALWAYS_ON
from app.services.seed import WS_EXAM, WS_LANG
from app.services.templates import modules_for_template
from tests.helpers import auth, login


def _modules(ws_id: str) -> set[str]:
    db = session_factory()()
    try:
        row = db.query(FeatureFlag).filter(FeatureFlag.workspace_id == ws_id).one()
        return set(row.modules or [])
    finally:
        db.close()


def test_branding_and_whatsapp_pause(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    branded = client.patch(
        "/api/v1/workspaces/current/branding",
        headers=h,
        json={"name": "Chindu Science Academy", "tagline": "On the record", "accent": "#2E7D4F", "logo": "C"},
    )
    assert branded.status_code == 200, branded.text
    body = branded.json()
    assert body["name"] == "Chindu Science Academy"
    assert body["branding"]["tagline"] == "On the record"
    assert body["branding"]["accent"] == "#2E7D4F"
    assert body["branding"]["logo"] == "C"
    assert "name" not in body["branding"]
    again = client.get("/api/v1/workspaces/current", headers=h)
    assert again.status_code == 200
    assert again.json()["name"] == "Chindu Science Academy"
    blank = client.patch("/api/v1/workspaces/current/branding", headers=h, json={"name": "   "})
    assert blank.status_code == 400
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
    st_id = client.get("/api/v1/me/dashboard", headers=auth(student)).json()["student_id"]
    joined = [a for a in exam_att if a.session_id == session_id and a.student_id == st_id]
    assert joined and all(a.status == "present" for a in joined)
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


def test_workspace_patch_persists_kind_and_slug(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    patched = client.patch(
        "/api/v1/workspaces/current",
        headers=h,
        json={"name": "North Studio", "slug": "north-studio", "kind": "music"},
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body["name"] == "North Studio"
    assert body["slug"] == "north-studio"
    assert body["kind"] == "music"
    again = client.get("/api/v1/workspaces/current", headers=h)
    assert again.status_code == 200
    assert again.json()["name"] == "North Studio"
    assert again.json()["slug"] == "north-studio"
    assert again.json()["kind"] == "music"
    music = set(modules_for_template("music"))
    exam = set(modules_for_template("exam-prep"))
    assert music != exam
    assert set(ALWAYS_ON) <= music
    assert _modules(WS_EXAM) == music
    renamed = client.patch("/api/v1/workspaces/current", headers=h, json={"name": "North Studio West"})
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["kind"] == "music"
    assert _modules(WS_EXAM) == music
    conflict = client.patch("/api/v1/workspaces/current", headers=h, json={"slug": "language-1on1"})
    assert conflict.status_code == 409
    assert conflict.json()["detail"] == "That workspace address is already in use."
    blank = client.patch("/api/v1/workspaces/current", headers=h, json={"name": "   "})
    assert blank.status_code == 400
    assert blank.json()["detail"] == "Enter a workspace name."
    bad_slug = client.patch("/api/v1/workspaces/current", headers=h, json={"slug": "North Studio"})
    assert bad_slug.status_code == 400
    kept = client.get("/api/v1/workspaces/current", headers=h).json()
    assert kept["name"] == "North Studio West"
    assert kept["slug"] == "north-studio"
    assert kept["kind"] == "music"


def test_template_apply_returns_distinct_module_sets(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    exam = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "exam-prep"})
    one = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "one-on-one"})
    assert exam.status_code == 200, exam.text
    assert one.status_code == 200, one.text
    exam_modules = set(exam.json()["modules"])
    one_modules = set(one.json()["modules"])
    assert exam_modules != one_modules
    always = set(exam.json()["always_on"])
    assert always == set(ALWAYS_ON)
    assert always <= exam_modules
    assert always <= one_modules
    assert "A1" in exam_modules
    assert "F2" in always
    assert "C1" in exam_modules and "C1" not in one_modules
    assert "F1" in one_modules and "F1" not in exam_modules
    current = client.get("/api/v1/workspaces/current", headers=h)
    assert current.json()["kind"] == "one-on-one"
    everything = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "everything"})
    assert everything.status_code == 200, everything.text
    everything_modules = set(everything.json()["modules"])
    assert "C6" in everything_modules
    assert "C6" not in exam_modules
    assert always <= everything_modules
    assert client.get("/api/v1/workspaces/current", headers=h).json()["kind"] == "everything"


def test_templates_keep_always_on_and_integrations_mock(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    h = auth(owner)
    applied = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "exam-prep"})
    assert applied.status_code == 200
    assert "A1" in applied.json()["modules"]
    assert "F2" in applied.json()["always_on"]
    # Exam-prep leaves integrations off. The full gallery includes them, so the mock port can connect.
    opened = client.post("/api/v1/workspaces/current/template", headers=h, json={"kind": "everything"})
    assert opened.status_code == 200, opened.text
    connected = client.post("/api/v1/integrations/calendar_video/connect", headers=h)
    assert connected.status_code == 200
    assert connected.json()["provider"] == "mock"
    listed = client.get("/api/v1/integrations", headers=h).json()
    assert any(i["name"] == "calendar_video" and i["connected"] for i in listed)
