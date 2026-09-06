"""Catalog pack is present and tenant-disjoint."""

from app.services.seed import WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login


def test_catalog_pack_join_and_lists(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    student = login(client, "+9101s", WS_EXAM, "student")
    parent = login(client, "+9101p", WS_EXAM, "parent")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    h = auth(teacher)
    students = client.get("/api/v1/students", headers=h).json()
    assert len(students) >= 2
    exam_ids = {s["id"] for s in students}
    lang_ids = {s["id"] for s in client.get("/api/v1/students", headers=auth(lang_teacher)).json()}
    assert exam_ids.isdisjoint(lang_ids)

    token = "join-exam-prep"
    preview = client.get(f"/api/v1/join/{token}")
    assert preview.status_code == 200
    assert preview.json()["workspace_id"] == WS_EXAM

    asg = client.get("/api/v1/assignments", headers=h).json()
    assert any(a["id"] == cid("0001", 29) for a in asg)
    lang_asg = {a["id"] for a in client.get("/api/v1/assignments", headers=auth(lang_teacher)).json()}
    assert cid("0001", 29) not in lang_asg

    threads = client.get("/api/v1/threads", headers=auth(parent)).json()
    assert any(t["id"] == "thread-exam-prep" for t in threads)
    lang_threads = client.get("/api/v1/threads", headers=auth(login(client, "+9102p", WS_LANG, "parent"))).json()
    assert all(t["id"] != "thread-exam-prep" for t in lang_threads)

    mine = client.get("/api/v1/invoices/mine", headers=auth(student)).json()
    assert any(i["id"] == cid("0001", 36) for i in mine)
    video = client.get(f"/api/v1/sessions/{cid('0001', 22)}/video", headers=h)
    assert video.status_code == 200
    assert video.json()["transcript"] == []
