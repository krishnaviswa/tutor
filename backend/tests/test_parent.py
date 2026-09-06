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


def test_parent_hub_reads_empty_until_child_rows(client):
    parent = login(client, "+9101p", WS_EXAM, "parent")
    h = auth(parent)
    assert client.get("/api/v1/reports", headers=h).json() == []
    assert client.get("/api/v1/invoices/mine", headers=h).json() == []
    assert client.get("/api/v1/threads", headers=h).json() == []
    attempt = client.get("/api/v1/attempts/none", headers=h)
    assert attempt.status_code == 404
    prefs = client.get("/api/v1/notifications/prefs", headers=h).json()
    assert prefs["student"]["whatsapp"] is False


def test_catalog_paths_only_no_sim_login(client):
    assert client.post("/api/v1/sim/login", json={}).status_code == 404
