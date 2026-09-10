"""007 sessions & timetable: states, 1-on-1 booking, per-staff availability. Mock ports only."""

from datetime import datetime, timedelta, timezone

from app.services.seed import PEOPLE_EXAM, PEOPLE_LANG, WS_EXAM, WS_LANG, cid
from tests.helpers import auth, login

PAST_SESSION = cid("0001", 54)
CANCELLED_SESSION = cid("0001", 55)
ONE_ON_ONE_SESSION = cid("0001", 56)
STUDENT = cid("0001", 20)
TEACHER_UID = PEOPLE_EXAM["teacher"]


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


def test_display_status_is_time_driven(client):
    h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    rows = {s["id"]: s for s in client.get("/api/v1/sessions", headers=h).json()}
    assert rows[PAST_SESSION]["display_status"] == "Auto completed"
    assert rows[CANCELLED_SESSION]["display_status"] == "Cancelled"
    assert rows[ONE_ON_ONE_SESSION]["display_status"] == "Upcoming"
    assert rows[ONE_ON_ONE_SESSION]["student_id"] == STUDENT
    assert rows[ONE_ON_ONE_SESSION]["student_name"]


def test_filing_record_marks_staff_completed(client):
    h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    r = client.patch(
        f"/api/v1/sessions/{ONE_ON_ONE_SESSION}/record",
        headers=h,
        json={"notes": "done", "attendance": [{"student_id": STUDENT, "status": "present"}]},
    )
    assert r.status_code == 200, r.text
    row = client.get(f"/api/v1/sessions/{ONE_ON_ONE_SESSION}", headers=h).json()
    assert row["status"] == "completed"
    assert row["display_status"] == "Staff completed"


def test_owner_can_move_time_in_any_state(client):
    h = auth(login(client, "+9101o", WS_EXAM, "owner"))
    future = _iso(datetime.now(timezone.utc) + timedelta(days=5, hours=3))
    r = client.patch(f"/api/v1/sessions/{PAST_SESSION}", headers=h, json={"starts_at": future})
    assert r.status_code == 200, r.text
    assert r.json()["display_status"] == "Upcoming"


def test_cancel_keeps_row_and_writes_timeline(client):
    h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    seed_sessions = client.get("/api/v1/sessions", headers=h).json()
    target = next(s for s in seed_sessions if s["display_status"] == "Upcoming" and s["cohort_id"])
    r = client.patch(
        f"/api/v1/sessions/{target['id']}",
        headers=h,
        json={"status": "cancelled", "cancel_reason": "storm"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["display_status"] == "Cancelled"

    still_listed = client.get("/api/v1/sessions", headers=h).json()
    assert any(s["id"] == target["id"] for s in still_listed)
    only_cancelled = client.get("/api/v1/sessions?scope=cancelled", headers=h).json()
    assert target["id"] in {s["id"] for s in only_cancelled}

    tl = client.get(
        f"/api/v1/students/{STUDENT}/timeline",
        headers=h,
        params={"event_type": "session.cancelled"},
    ).json()
    assert any("cancelled" in e["body"].lower() for e in tl)


def test_scope_and_filter_params(client):
    h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    upcoming = client.get("/api/v1/sessions?scope=upcoming", headers=h).json()
    assert upcoming and all(s["display_status"] == "Upcoming" for s in upcoming)
    completed = client.get("/api/v1/sessions?scope=completed", headers=h).json()
    assert all(s["display_status"] in ("Auto completed", "Staff completed") for s in completed)
    by_student = client.get(f"/api/v1/sessions?student_id={STUDENT}", headers=h).json()
    assert by_student and all(s["student_id"] == STUDENT for s in by_student)
    by_teacher = client.get(f"/api/v1/sessions?teacher_id={TEACHER_UID}", headers=h).json()
    assert all(s["teacher_user_id"] == TEACHER_UID for s in by_teacher)


def test_one_on_one_booking_and_guards(client):
    h = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    when = _iso(datetime(2026, 10, 6, 8, 30, tzinfo=timezone.utc))  # Tue 14:00 IST, inside window
    ok = client.post(
        "/api/v1/sessions",
        headers=h,
        json={"student_id": STUDENT, "title": "1-on-1 new", "starts_at": when},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["student_id"] == STUDENT
    assert ok.json()["student_name"]

    both = client.post(
        "/api/v1/sessions",
        headers=h,
        json={"student_id": STUDENT, "cohort_id": cid("0001", 21), "title": "x", "starts_at": when},
    )
    assert both.status_code == 400
    neither = client.post("/api/v1/sessions", headers=h, json={"title": "x", "starts_at": when})
    assert neither.status_code == 400


def test_availability_put_get_and_403(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    body = {
        "windows": [{"weekday": "Mon", "start": "09:00", "end": "12:00"}],
        "blocks": [{"date": "2026-11-02", "available": False, "note": "off"}],
    }
    put = client.put(f"/api/v1/staff/{TEACHER_UID}/availability", headers=teacher, json=body)
    assert put.status_code == 200, put.text
    got = client.get(f"/api/v1/availability?teacher_id={TEACHER_UID}", headers=owner).json()
    assert got["windows"] == [{"weekday": "Mon", "start": "09:00", "end": "12:00", "note": ""}]
    assert got["blocks"][0]["date"] == "2026-11-02"

    other = auth(login(client, "+9101a", WS_EXAM, "assistant"))
    denied = client.put(f"/api/v1/staff/{TEACHER_UID}/availability", headers=other, json=body)
    assert denied.status_code == 403


def test_block_blocks_a_one_on_one_booking(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    client.put(
        f"/api/v1/staff/{TEACHER_UID}/availability",
        headers=teacher,
        json={
            "windows": [{"weekday": d, "start": "06:00", "end": "21:00"} for d in ("Mon", "Tue", "Wed", "Thu", "Fri")],
            "blocks": [{"date": "2026-10-07", "start": "00:00", "end": "23:59", "available": False}],
        },
    )
    blocked = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"student_id": STUDENT, "title": "on a day off", "starts_at": "2026-10-07T09:00:00+05:30"},
    )
    assert blocked.status_code == 400
    fine = client.post(
        "/api/v1/sessions",
        headers=teacher,
        json={"student_id": STUDENT, "title": "normal day", "starts_at": "2026-10-06T09:00:00+05:30"},
    )
    assert fine.status_code == 200, fine.text


def test_no_availability_rows_falls_back(client):
    # Clear the seeded LANG windows -> booking falls back to the workspace availability blob (006).
    lang_teacher = auth(login(client, "+9102t", WS_LANG, "teacher"))
    client.put(
        f"/api/v1/staff/{PEOPLE_LANG['teacher']}/availability",
        headers=lang_teacher,
        json={"windows": [], "blocks": []},
    )
    # Workspace blob (006) only opens today's weekday -> book a slot later today.
    soon = datetime.now(timezone.utc) + timedelta(hours=1)
    student_id = client.get("/api/v1/students", headers=lang_teacher).json()[0]["id"]
    r = client.post(
        "/api/v1/sessions",
        headers=lang_teacher,
        json={"student_id": student_id, "title": "fallback ok", "starts_at": _iso(soon)},
    )
    assert r.status_code == 200, r.text


def test_staff_list_and_isolation(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    staff = client.get("/api/v1/staff", headers=owner).json()
    assert {m["role"] for m in staff} >= {"owner", "teacher"}
    assert TEACHER_UID in {m["id"] for m in staff}

    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    assert client.get("/api/v1/staff", headers=student).status_code in (403, 404)

    lang = auth(login(client, "+9102t", WS_LANG, "teacher"))
    lang_sessions = {s["id"] for s in client.get("/api/v1/sessions", headers=lang).json()}
    assert PAST_SESSION not in lang_sessions
    assert CANCELLED_SESSION not in lang_sessions
