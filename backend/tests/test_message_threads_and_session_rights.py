"""Personal threads append. A teacher changes only their own class. Notices stay unique."""

from app.db import session_factory
from app.models.tables import Identity, StaffMembership, Student, User
from app.services.seed import PEOPLE_EXAM, WS_EXAM, cid
from tests.helpers import auth, login

STUDENT = cid("0001", 20)
STUDENT2 = cid("0001", 40)
SESSION = cid("0001", 22)
COHORT = cid("0001", 21)
TEACHER = PEOPLE_EXAM["teacher"]
COLLEAGUE = "bbbbbbbb-0001-4000-8000-000000000099"
NEW_USER = "bbbbbbbb-0001-4000-8000-000000000098"
NEW_STUDENT = "cccccccc-0001-4000-8000-000000000098"
WHEN = "2031-04-01T10:00:00+00:00"
LOCK = "Only the assigned teacher or the owner can change this class."


def _bodies(thread: dict) -> list[str]:
    return [row["body"] for row in thread.get("messages") or []]


def test_messages_append_and_keep_each_thread(client):
    db = session_factory()()
    db.add(User(id=NEW_USER, display_name="New Student"))
    db.flush()
    db.add(Student(id=NEW_STUDENT, workspace_id=WS_EXAM, user_id=NEW_USER, display_name="New Student"))
    db.commit()
    db.close()

    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    threads = client.get("/api/v1/threads", headers=teacher).json()
    first = next(row for row in threads if row["student_id"] == STUDENT)
    second = next(row for row in threads if row["student_id"] == STUDENT2)
    original = first["messages"][0]
    before_second = _bodies(second)

    one = client.post(
        f"/api/v1/threads/{first['id']}/messages",
        headers=teacher,
        json={"body": "alpha note", "student_id": STUDENT},
    )
    two = client.post(
        f"/api/v1/threads/{first['id']}/messages",
        headers=teacher,
        json={"body": "beta note", "student_id": STUDENT},
    )
    assert one.status_code == 200, one.text
    assert two.status_code == 200, two.text
    assert one.json()["thread_id"] == first["id"]
    assert two.json()["thread_id"] == first["id"]
    assert one.json()["id"] != two.json()["id"]

    fresh = client.post(
        f"/api/v1/threads/{first['id']}/messages",
        headers=teacher,
        json={"body": "new student note", "student_id": NEW_STUDENT},
    )
    assert fresh.status_code == 200, fresh.text
    assert fresh.json()["thread_id"] not in {first["id"], second["id"]}

    cross = client.post(
        f"/api/v1/threads/{first['id']}/messages",
        headers=teacher,
        json={"body": "for the other student", "student_id": STUDENT2},
    )
    assert cross.status_code == 200, cross.text
    assert cross.json()["thread_id"] == second["id"]

    again = client.get("/api/v1/threads", headers=teacher).json()
    first_now = next(row for row in again if row["id"] == first["id"])
    second_now = next(row for row in again if row["id"] == second["id"])
    new_now = next(row for row in again if row["id"] == fresh.json()["thread_id"])
    kept = next(row for row in first_now["messages"] if row["id"] == original["id"])
    assert kept["body"] == original["body"]
    bodies = _bodies(first_now)
    assert bodies.count("alpha note") == 1
    assert bodies.count("beta note") == 1
    assert "for the other student" not in bodies
    assert "new student note" not in bodies
    assert before_second[0] in _bodies(second_now)
    assert "for the other student" in _bodies(second_now)
    assert "alpha note" not in _bodies(second_now)
    assert _bodies(new_now) == ["new student note"]


def test_session_change_rights(client):
    db = session_factory()()
    db.add(User(id=COLLEAGUE, display_name="Other Teacher"))
    db.flush()
    db.add(Identity(workspace_id=WS_EXAM, user_id=COLLEAGUE, kind="phone", value="+9101c"))
    db.add(StaffMembership(workspace_id=WS_EXAM, user_id=COLLEAGUE, role="teacher"))
    db.commit()
    db.close()

    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    other = auth(login(client, "+9101c", WS_EXAM, "teacher"))
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    assert client.get("/api/v1/faculty-admin/me", headers=teacher).json()["faculty_admin"] is True

    denied = client.patch(
        f"/api/v1/sessions/{SESSION}",
        headers=other,
        json={"status": "cancelled", "cancel_reason": "not mine"},
    )
    assert denied.status_code == 403
    assert denied.json()["detail"] == LOCK

    moved = client.patch(
        f"/api/v1/sessions/{SESSION}",
        headers=other,
        json={"starts_at": "2033-05-01T10:00:00+00:00"},
    )
    assert moved.status_code == 403
    assert moved.json()["detail"] == LOCK

    stolen = client.post(
        "/api/v1/sessions",
        headers=other,
        json={"title": "Not mine", "cohort_id": COHORT, "starts_at": WHEN, "teacher_user_id": TEACHER},
    )
    assert stolen.status_code == 403
    assert stolen.json()["detail"] == LOCK

    made = client.post(
        "/api/v1/sessions",
        headers=owner,
        json={
            "title": "Colleague class",
            "cohort_id": COHORT,
            "starts_at": WHEN,
            "teacher_user_id": COLLEAGUE,
        },
    )
    assert made.status_code == 200, made.text
    assert made.json()["teacher_user_id"] == COLLEAGUE
    sid = made.json()["id"]

    admin_denied = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=teacher,
        json={"status": "cancelled"},
    )
    assert admin_denied.status_code == 403
    assert admin_denied.json()["detail"] == LOCK

    granted = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": COLLEAGUE})
    assert granted.status_code == 200, granted.text
    still = client.patch(
        f"/api/v1/sessions/{SESSION}",
        headers=other,
        json={"status": "cancelled"},
    )
    assert still.status_code == 403
    assert still.json()["detail"] == LOCK

    allowed = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=owner,
        json={"status": "cancelled", "cancel_reason": "owner"},
    )
    assert allowed.status_code == 200, allowed.text
    assert allowed.json()["status"] == "cancelled"


def test_class_notices_are_unique(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    started = client.post(f"/api/v1/sessions/{SESSION}/start", headers=teacher)
    assert started.status_code == 200, started.text
    teacher_box = client.get("/api/v1/notifications/inbox", headers=teacher).json()
    student_box = client.get("/api/v1/notifications/inbox", headers=student).json()
    teacher_lines = [row for row in teacher_box if str(row["body"]).startswith("Class started:")]
    student_lines = [row for row in student_box if str(row["body"]).startswith("Class started:")]
    assert len(teacher_lines) == 1
    assert len(student_lines) == 1
    assert len({row.get("event_id") or row["id"] for row in teacher_lines}) == 1

    title = "Notice once"
    created = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"title": title, "cohort_id": COHORT, "starts_at": "2031-06-01T10:00:00+00:00"},
    )
    assert created.status_code == 200, created.text
    sid = created.json()["id"]
    first = client.patch(f"/api/v1/sessions/{sid}", headers=teacher, json={"status": "cancelled"})
    second = client.patch(f"/api/v1/sessions/{sid}", headers=teacher, json={"status": "cancelled"})
    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    box = client.get("/api/v1/notifications/inbox", headers=teacher).json()
    cancelled = [row for row in box if row["body"] == f"Session cancelled: {title}"]
    assert len(cancelled) == 1
    assert len(box) == len({row.get("event_id") or row["id"] for row in box})
