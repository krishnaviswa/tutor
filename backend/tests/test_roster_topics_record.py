"""D-010 class roll, D-011 joined time, D-014 topics route."""

from datetime import datetime

from app.services.seed import WS_EXAM, cid
from tests.helpers import auth, login

SEEDED_SESSION = cid("0001", 22)
SEEDED_STUDENT = cid("0001", 20)
SEEDED_STUDENT_2 = cid("0001", 40)


def test_seeded_class_roll_includes_enrolled_students(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    roll = client.get(f"/api/v1/sessions/{SEEDED_SESSION}/record", headers=teacher)
    assert roll.status_code == 200, roll.text
    ids = roll.json()["session"]["student_ids"]
    assert SEEDED_STUDENT in ids
    assert SEEDED_STUDENT_2 in ids


def test_new_cohort_session_still_starts_empty(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    cohorts = client.get("/api/v1/cohorts", headers=teacher).json()
    cohort = next(row for row in cohorts if len(row.get("student_ids") or []) >= 2)
    created = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={
            "cohort_id": cohort["id"],
            "title": "Empty until the list is saved",
            "starts_at": "2028-03-02T08:15:00+00:00",
        },
    )
    assert created.status_code == 200, created.text
    assert created.json()["student_ids"] == []


def test_roster_joined_at_is_a_timestamp(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    rows = client.get("/api/v1/students", headers=teacher)
    assert rows.status_code == 200, rows.text
    aarav = next(row for row in rows.json() if row["display_name"] == "Aarav Sharma")
    assert aarav["joined_at"]
    datetime.fromisoformat(aarav["joined_at"])

    created = client.post(
        "/api/v1/students",
        headers=teacher,
        json={"display_name": "Joined Later"},
    )
    assert created.status_code == 200, created.text
    assert created.json()["joined_at"]
    again = client.get("/api/v1/students", headers=teacher).json()
    saved = next(row for row in again if row["id"] == created.json()["id"])
    assert saved["joined_at"]


def test_topics_route_lists_workspace_topics(client):
    missing = client.get("/api/v1/topics")
    assert missing.status_code == 401
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    listed = client.get("/api/v1/topics", headers=teacher)
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert isinstance(body, list)
    assert "Unit 1: Kinematics & Vectors" in {row["name"] for row in body}
    assert all(set(row) == {"id", "name", "taxonomy_id"} for row in body)
