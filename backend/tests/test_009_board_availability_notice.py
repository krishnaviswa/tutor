"""009 paint board, 15-minute availability, and doubt clarified. Mock ports only."""

from app.services.seed import PEOPLE_EXAM, WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login

SESSION = cid("0001", 56)
STUDENT = cid("0001", 20)
TEACHER = PEOPLE_EXAM["teacher"]


def test_paint_board_colors_text_and_file_without_library(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    bad = client.put(
        f"/api/v1/sessions/{SESSION}/board",
        headers=teacher,
        json={"strokes": [{"id": "s1", "color": "pink"}]},
    )
    assert bad.status_code == 400

    placed = client.put(
        f"/api/v1/sessions/{SESSION}/board",
        headers=teacher,
        json={
            "strokes": [{"id": "ink", "color": "blue", "x1": 1, "y1": 1, "x2": 4, "y2": 4}],
            "texts": [{"id": "t1", "text": "label", "color": "black", "size": 18, "face": "sans"}],
            "placements": [{"id": "p1", "name": "page.pdf", "file_name": "page.pdf", "kind": "pdf"}],
            "erases": [{"id": "e1", "x": 2, "y": 2}],
        },
    )
    assert placed.status_code == 200, placed.text
    board = client.get(f"/api/v1/sessions/{SESSION}/board", headers=student).json()
    assert board["placements"][0]["id"] == "p1"
    assert board["texts"][0]["color"] == "black"
    assert any(s["color"] == "blue" for s in board["strokes"])

    erased = client.put(
        f"/api/v1/sessions/{SESSION}/board",
        headers=student,
        json={"strokes": [], "erases": [{"id": "e2", "x": 3, "y": 3}]},
    )
    assert erased.status_code == 200, erased.text
    after = erased.json()
    assert after["strokes"] == []
    assert any(p["id"] == "p1" for p in after["placements"])


def test_intra_hour_windows_and_student_read(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    other = auth(login(client, "+9102s", WS_LANG, "student"))
    body = {
        "windows": [
            {"weekday": "Tue", "start": "10:00", "end": "10:30"},
            {"weekday": "Tue", "start": "10:45", "end": "11:15"},
        ],
        "blocks": [],
    }
    saved = client.put(f"/api/v1/staff/{TEACHER}/availability", headers=teacher, json=body)
    assert saved.status_code == 200, saved.text
    windows = saved.json()["windows"]
    assert {"weekday": "Tue", "start": "10:00", "end": "10:30", "note": ""} in windows
    assert {"weekday": "Tue", "start": "10:45", "end": "11:15", "note": ""} in windows

    off = client.put(
        f"/api/v1/staff/{TEACHER}/availability",
        headers=teacher,
        json={"windows": [{"weekday": "Tue", "start": "10:07", "end": "10:30"}]},
    )
    assert off.status_code == 400
    overlap = client.put(
        f"/api/v1/staff/{TEACHER}/availability",
        headers=teacher,
        json={
            "windows": [
                {"weekday": "Tue", "start": "10:00", "end": "10:30"},
                {"weekday": "Tue", "start": "10:15", "end": "10:45"},
            ]
        },
    )
    assert overlap.status_code == 400
    adjacent = client.put(
        f"/api/v1/staff/{TEACHER}/availability",
        headers=teacher,
        json={
            "windows": [
                {"weekday": "Tue", "start": "10:00", "end": "10:30"},
                {"weekday": "Tue", "start": "10:30", "end": "11:00"},
            ]
        },
    )
    assert adjacent.status_code == 200, adjacent.text

    client.put(f"/api/v1/staff/{TEACHER}/availability", headers=teacher, json=body)
    seen = client.get(f"/api/v1/availability?teacher_id={TEACHER}", headers=student)
    assert seen.status_code == 200, seen.text
    assert len(seen.json()["windows"]) == 2
    assert client.get(f"/api/v1/availability?teacher_id={TEACHER}", headers=other).status_code == 403
    dash = client.get("/api/v1/me/dashboard", headers=student).json()
    mine = next(row for row in dash["teacher_windows"] if row["teacher_id"] == TEACHER)
    assert any(g["start"] == "10:30" and g["end"] == "10:45" for g in mine["gaps"])


def test_doubt_clarified_accept_or_ignore(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    opened = client.post("/api/v1/doubts", headers=student, json={"body": "How does this work?"})
    assert opened.status_code == 200, opened.text
    doubt_id = opened.json()["id"]
    resolved = client.patch(
        f"/api/v1/doubts/{doubt_id}",
        headers=teacher,
        json={"status": "answered", "answer": "Like this."},
    )
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()["clarified"] is True
    again = client.patch(
        f"/api/v1/doubts/{doubt_id}",
        headers=teacher,
        json={"status": "answered", "answer": "Like this."},
    )
    assert again.status_code == 200
    timeline = client.get(
        f"/api/v1/students/{STUDENT}/timeline",
        headers=teacher,
        params={"event_type": "doubt.answered"},
    ).json()
    assert len([e for e in timeline if "clarified" in e["body"].lower()]) == 1
    inbox = client.get("/api/v1/notifications/inbox", headers=student).json()
    assert any("clarified" in (n.get("body") or "").lower() for n in inbox)
    assert all(w["to_role"] != "student" for w in client.app.state.ports.whatsapp)
    accepted = client.post(
        f"/api/v1/doubts/{doubt_id}/notice",
        headers=student,
        json={"action": "accept"},
    )
    assert accepted.status_code == 200 and accepted.json()["complete"] is True

    second = client.post("/api/v1/doubts", headers=student, json={"body": "Another question"})
    client.patch(
        f"/api/v1/doubts/{second.json()['id']}",
        headers=teacher,
        json={"status": "answered", "answer": "Yes."},
    )
    ignored = client.post(
        f"/api/v1/doubts/{second.json()['id']}/notice",
        headers=student,
        json={"action": "ignore"},
    )
    assert ignored.status_code == 200 and ignored.json()["complete"] is True
    listed = client.get("/api/v1/doubts", headers=student).json()
    row = next(d for d in listed if d["id"] == doubt_id)
    assert row["clarified"] is True
