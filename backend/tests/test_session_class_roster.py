"""A cohort session starts with nobody in class until the teacher saves the list."""

from app.services.seed import WS_EXAM
from tests.helpers import auth, login


def test_new_cohort_session_omits_students_until_saved(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    cohorts = client.get("/api/v1/cohorts", headers=teacher).json()
    cohort = next(row for row in cohorts if len(row.get("student_ids") or []) >= 2)
    enrolled = list(cohort["student_ids"])
    created = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={
            "cohort_id": cohort["id"],
            "title": "Math Algebra",
            "starts_at": "2028-01-10T08:15:00+00:00",
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["mode"] == "cohort"
    assert body["student_ids"] == []
    assert set(body["student_ids"]) != set(enrolled)

    sid = body["id"]
    fresh = client.get(f"/api/v1/sessions/{sid}", headers=teacher)
    assert fresh.status_code == 200, fresh.text
    assert fresh.json()["student_ids"] == []
    roll = client.get(f"/api/v1/sessions/{sid}/record", headers=teacher)
    assert roll.status_code == 200, roll.text
    assert roll.json()["session"]["student_ids"] == []
    assert roll.json()["attendance"] == []

    two = enrolled[:2]
    saved = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=teacher,
        json={"student_ids": two},
    )
    assert saved.status_code == 200, saved.text
    assert saved.json()["student_ids"] == two
    again = client.get(f"/api/v1/sessions/{sid}", headers=teacher).json()
    assert again["student_ids"] == two

    kept = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=teacher,
        json={"student_ids": [two[0]]},
    )
    assert kept.status_code == 200, kept.text
    assert client.get(f"/api/v1/sessions/{sid}", headers=teacher).json()["student_ids"] == [two[0]]


def test_one_on_one_roster_is_only_the_chosen_student(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    students = client.get("/api/v1/students", headers=teacher).json()
    assert len(students) >= 2
    chosen = students[0]["id"]
    others = {row["id"] for row in students if row["id"] != chosen}
    created = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={
            "student_id": chosen,
            "title": "Math Algebra 1-on-1",
            "starts_at": "2028-01-11T16:15:00+00:00",
        },
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["mode"] == "1-on-1"
    assert body["student_ids"] == [chosen]
    assert others.isdisjoint(body["student_ids"])
    loaded = client.get(f"/api/v1/sessions/{body['id']}", headers=teacher).json()
    assert loaded["mode"] == "1-on-1"
    assert loaded["student_ids"] == [chosen]
