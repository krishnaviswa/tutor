from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_parent_home_linked_child_only(client):
    parent = login(client, "+9101p", WS_EXAM, "parent")
    home = client.get("/api/v1/parent/home", headers=auth(parent))
    assert home.status_code == 200
    children = home.json()["children"]
    assert len(children) == 1
    child_id = children[0]["student_id"]
    assert "timeline" in home.json()["hub"]
    tl = client.get(f"/api/v1/students/{child_id}/timeline", headers=auth(parent))
    assert tl.status_code == 200
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    other = client.get("/api/v1/students", headers=auth(lang_teacher)).json()[0]["id"]
    assert client.get(f"/api/v1/students/{other}/timeline", headers=auth(parent)).status_code in (403, 404)


def test_parent_hub_reads_linked_child_rows(client):
    parent = login(client, "+9101p", WS_EXAM, "parent")
    h = auth(parent)
    home = client.get("/api/v1/parent/home", headers=h).json()
    child_id = home["children"][0]["student_id"]
    invoices = client.get("/api/v1/invoices/mine", headers=h).json()
    assert invoices
    assert all(i["student_id"] == child_id for i in invoices)
    threads = client.get("/api/v1/threads", headers=h).json()
    assert threads
    assert all(t.get("student_id") == child_id for t in threads)
    reports = client.get("/api/v1/reports", headers=h).json()
    assert len(reports) == 1
    assert reports[0]["student_id"] == child_id
    lang_parent = login(client, "+9102p", WS_LANG, "parent")
    other_ids = {r["student_id"] for r in client.get("/api/v1/reports", headers=auth(lang_parent)).json()}
    assert child_id not in other_ids
    prefs = client.get("/api/v1/notifications/prefs", headers=h).json()
    assert prefs["student"]["whatsapp"] is False
    other_inv = {i["id"] for i in client.get("/api/v1/invoices/mine", headers=auth(lang_parent)).json()}
    assert {i["id"] for i in invoices}.isdisjoint(other_inv)


def test_catalog_paths_only_no_sim_login(client):
    assert client.post("/api/v1/sim/login", json={}).status_code == 404
