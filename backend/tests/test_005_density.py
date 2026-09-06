"""005 dashboard density: named facts on existing /api/v1 paths."""

from app.services.seed import WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login


def test_student_dashboard_named_next_actions(client):
    student = login(client, "+9101s", WS_EXAM, "student")
    body = client.get("/api/v1/me/dashboard", headers=auth(student)).json()
    assert body["student_id"]
    assert body["next_session"]
    assert body["next_session"]["title"]
    assert body["next_session"]["starts_at"]
    assert body["next_session"]["join_opens_at"]
    due = body["due_practice"]
    assert due["total"] >= 2
    assert due["unanswered"] >= 1
    assert due["title"]
    assert body["this_week"]["title"]
    assert body["this_week"]["kind"] == "test"
    assert body["doubt"]["status"] == "answered"
    assert body["doubt"]["has_clip"] is True
    assert body["weak_tags"]
    assert body["last_attempt_id"]


def test_teacher_dashboard_chase_and_bars_isolated(client):
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    body = client.get("/api/v1/teacher/dashboard", headers=auth(teacher)).json()
    assert body["cohort"]["name"]
    assert body["cohort"]["size"] >= 2
    assert body["attendance_pct"] > 0
    assert body["attendance_week"]
    assert body["practice_by_set"]
    assert body["doubt_backlog"] >= 1
    names = {r["display_name"] for r in body["at_risk"]}
    assert any("student 2" in n for n in names)

    lang = login(client, "+9102t", WS_LANG, "teacher")
    other = client.get("/api/v1/teacher/dashboard", headers=auth(lang)).json()
    other_names = {r["display_name"] for r in other["at_risk"]}
    assert names.isdisjoint(other_names)
    exam_student2 = cid("0001", 40)
    assert exam_student2 not in {r["student_id"] for r in other["at_risk"]}


def test_owner_console_scorecard_keeps_usage(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    body = client.get("/api/v1/owner/console", headers=auth(owner)).json()
    assert "F2" in body["always_on"]
    assert body["usage"]
    sc = body["scorecard"]
    assert sc["sessions_plan"] >= sc["sessions_done"]
    assert sc["active_students"] >= 2
    assert sc["revenue_cents"] > 0
    assert body["teachers"]
    assert body["cohort_pnl"]
    lang = login(client, "+9102o", WS_LANG, "owner")
    other = client.get("/api/v1/owner/console", headers=auth(lang)).json()
    assert other["workspace"]["slug"] != body["workspace"]["slug"]


def test_parent_home_linked_child_density_hides_student2(client):
    parent = login(client, "+9101p", WS_EXAM, "parent")
    home = client.get("/api/v1/parent/home", headers=auth(parent)).json()
    children = home["children"]
    assert len(children) == 1
    child = children[0]
    assert child["student_id"] == cid("0001", 20)
    assert child["attendance"]["total"] >= 1
    assert child["latest_practice"]["title"]
    assert child["latest_test"]["title"]
    assert child["fee_due"]["amount_cents"]
    assert child["fee_due"]["due_on"]
    assert cid("0001", 40) not in {c["student_id"] for c in children}


def test_invoices_and_reports_and_content_density(client):
    student = login(client, "+9101s", WS_EXAM, "student")
    parent = login(client, "+9101p", WS_EXAM, "parent")
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    mine = client.get("/api/v1/invoices/mine", headers=auth(student)).json()
    states = {i["state"] for i in mine}
    assert "paid" in states
    assert "overdue" in states or "pending" in states
    paid = next(i for i in mine if i["status"] == "paid")
    assert paid["receipt_id"]
    assert paid["due_on"]
    assert paid["label"]
    open_ids = {i["id"] for i in mine}
    assert cid("0001", 82) not in open_ids

    reports = client.get("/api/v1/reports", headers=auth(parent)).json()
    assert len(reports) == 1
    row = reports[0]
    assert row["student_id"] == cid("0001", 20)
    assert "practice_pct" in row
    assert row["attendance"]["total"] >= 1
    assert row["teacher_note"]
    teacher_rows = client.get("/api/v1/reports", headers=auth(teacher)).json()
    assert {r["student_id"] for r in teacher_rows} >= {cid("0001", 20), cid("0001", 40)}

    items = client.get("/api/v1/content", headers=auth(student)).json()
    assert any(i.get("kind") for i in items)
    one = items[0]
    detail = client.get(f"/api/v1/content/{one['id']}", headers=auth(student)).json()
    assert "notes" in detail
    assert "next_practice" in detail
    assert detail["kind"]
