from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_exam_cannot_read_language_roster(client):
    exam_teacher = login(client, "+9101t", WS_EXAM, "teacher")
    lang_teacher = login(client, "+9102t", WS_LANG, "teacher")
    exam_students = client.get("/api/v1/students", headers=auth(exam_teacher))
    lang_students = client.get("/api/v1/students", headers=auth(lang_teacher))
    assert exam_students.status_code == 200
    assert lang_students.status_code == 200
    exam_ids = {s["id"] for s in exam_students.json()}
    lang_ids = {s["id"] for s in lang_students.json()}
    assert exam_ids.isdisjoint(lang_ids)
    lang_id = next(iter(lang_ids))
    stolen = client.get(f"/api/v1/students/{lang_id}/timeline", headers=auth(exam_teacher))
    assert stolen.status_code in (403, 404)


def test_exam_teacher_cannot_hit_language_owner(client):
    exam_teacher = login(client, "+9101t", WS_EXAM, "teacher")
    assert client.get("/api/v1/owner/console", headers=auth(exam_teacher)).status_code == 403
    lang_owner = login(client, "+9102o", WS_LANG, "owner")
    usage = client.get("/api/v1/usage", headers=auth(lang_owner))
    assert usage.status_code == 200
    wa = next(m for m in usage.json()["meters"] if m["meter_key"] == "whatsapp")
    assert wa["used"] == 100
