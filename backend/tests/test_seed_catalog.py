"""Catalog pack is present, variant-rich, and tenant-disjoint."""

from app.services.seed import WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login


def test_catalog_pack_join_and_lists(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    parent = login(client, "+9101p", WS_EXAM, "parent")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    h = auth(teacher)
    students = client.get("/api/v1/students", headers=h).json()
    assert len(students) >= 3
    exam_ids = {s["id"] for s in students}
    lang_ids = {s["id"] for s in client.get("/api/v1/students", headers=auth(lang_teacher)).json()}
    assert exam_ids.isdisjoint(lang_ids)
    assert cid("0001", 66) in exam_ids

    preview = client.get("/api/v1/join/join-exam-prep")
    assert preview.status_code == 200
    assert preview.json()["workspace_id"] == WS_EXAM
    next_preview = client.get("/api/v1/join/join-exam-prep-next")
    assert next_preview.status_code == 200
    assert next_preview.json()["session_id"] == cid("0001", 53)

    student3 = login(client, "+9101s3", WS_EXAM, "student")
    denied = client.post("/api/v1/join/join-exam-prep/enter", headers=auth(student3))
    assert denied.status_code == 403

    sessions = client.get("/api/v1/sessions", headers=h).json()
    titles = {s["title"] for s in sessions}
    assert "Needs video link" in titles
    assert any(s["id"] == cid("0001", 53) for s in sessions)

    cohorts = client.get("/api/v1/cohorts", headers=h).json()
    assert any(c["id"] == cid("0001", 67) and c.get("student_ids") == [] for c in cohorts)

    asg = client.get("/api/v1/assignments", headers=h).json()
    assert any(a["id"] == cid("0001", 29) for a in asg)
    assert any(a["id"] == cid("0001", 74) for a in asg)
    lang_asg = {a["id"] for a in client.get("/api/v1/assignments", headers=auth(lang_teacher)).json()}
    assert cid("0001", 29) not in lang_asg

    threads = client.get("/api/v1/threads", headers=auth(parent)).json()
    assert any(t["id"] == "thread-exam-prep" for t in threads)
    assert all(t["id"] != "thread-exam-prep-s2" for t in threads)
    lang_threads = client.get("/api/v1/threads", headers=auth(login(client, "+9102p", WS_LANG, "parent"))).json()
    assert all(t["id"] != "thread-exam-prep" for t in lang_threads)

    mine = client.get("/api/v1/invoices/mine", headers=auth(student)).json()
    assert any(i["id"] == cid("0001", 36) for i in mine)
    parent_inv = client.get("/api/v1/invoices/mine", headers=auth(parent)).json()
    assert {i["student_id"] for i in parent_inv} == {cid("0001", 20)}
    assert cid("0001", 82) not in {i["id"] for i in parent_inv}

    video = client.get(f"/api/v1/sessions/{cid('0001', 22)}/video", headers=h)
    assert video.status_code == 200
    assert video.json()["transcript"] == []
    rec = client.get(f"/api/v1/sessions/{cid('0001', 22)}/record", headers=h).json()
    statuses = {a["student_id"]: a["status"] for a in rec["attendance"]}
    assert statuses[cid("0001", 20)] == "present"
    assert statuses[cid("0001", 40)] == "absent"

    pending = client.post(
        "/api/v1/parent-links/link-exam-prep-pending/accept",
        headers=auth(parent),
    )
    assert pending.status_code == 200
    home = client.get("/api/v1/parent/home", headers=auth(parent)).json()
    assert {c["student_id"] for c in home["children"]} >= {cid("0001", 20), cid("0001", 40)}
