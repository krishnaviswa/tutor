"""Hour packs: burn rules, parent balance, and a booking that refuses an empty pack."""

from datetime import datetime, timedelta, timezone

from app.db import session_factory
from app.models.tables import ScheduledSession
from app.services.seed import PEOPLE_EXAM, WS_EXAM, WS_LANG, WS_MUSIC, cid
from tests.helpers import auth, login

STUDENT = cid("0001", 20)
TEACHER = PEOPLE_EXAM["teacher"]
ONE_ON_ONE = cid("0001", 56)


def _pack(client, headers, student_id=STUDENT):
    res = client.get(f"/api/v1/students/{student_id}/lesson-pack", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def _insert(starts: datetime, ends: datetime | None = None) -> str:
    db = session_factory()()
    row = ScheduledSession(
        workspace_id=WS_EXAM,
        student_id=STUDENT,
        teacher_user_id=TEACHER,
        title="Pack check",
        starts_at=starts,
        ends_at=ends,
        status="scheduled",
    )
    db.add(row)
    db.commit()
    sid = row.id
    db.close()
    return sid


def _mark(client, headers, session_id: str, attendance: str, **extra):
    body = {"attendance": [{"student_id": STUDENT, "status": attendance}], **extra}
    res = client.patch(f"/api/v1/sessions/{session_id}/record", headers=headers, json=body)
    assert res.status_code == 200, res.text
    return res


def test_burn_on_attended_and_no_show(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    before = _pack(client, owner)["balance_minutes"]
    assert before == 480
    attended = _insert(datetime.now(timezone.utc) - timedelta(days=2))
    _mark(client, teacher, attended, "attended", teacher_status="present")
    assert _pack(client, owner)["balance_minutes"] == before - 60
    no_show = _insert(datetime.now(timezone.utc) - timedelta(days=3))
    _mark(client, teacher, no_show, "no_show")
    assert _pack(client, owner)["balance_minutes"] == before - 120
    shorter = _insert(
        datetime.now(timezone.utc) - timedelta(days=4),
        ends=datetime.now(timezone.utc) - timedelta(days=4) + timedelta(minutes=30),
    )
    _mark(client, teacher, shorter, "attended", teacher_status="present")
    assert _pack(client, owner)["balance_minutes"] == before - 150
    legacy = _insert(datetime.now(timezone.utc) - timedelta(days=5))
    _mark(client, teacher, legacy, "present")
    assert _pack(client, owner)["balance_minutes"] == before - 210
    payouts = client.get("/api/v1/payouts", headers=owner).json()
    row = next(item for item in payouts if item["teacher_user_id"] == TEACHER)
    delivered_ids = {item["session_id"] for item in row["delivered"]}
    assert attended in delivered_ids
    assert shorter in delivered_ids
    assert no_show not in delivered_ids
    assert row["hours"] >= 1


def test_reschedule_outside_the_window_does_not_burn(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    before = _pack(client, owner)["balance_minutes"]
    sid = _insert(datetime.now(timezone.utc) + timedelta(days=3))
    moved = client.patch(
        f"/api/v1/sessions/{sid}",
        headers=owner,
        json={"starts_at": (datetime.now(timezone.utc) + timedelta(days=4)).isoformat()},
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["hour"] == "stays"
    assert _pack(client, owner)["balance_minutes"] == before
    family = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/student-change",
        headers=student,
        json={
            "action": "reschedule",
            "reason": "unavailable",
            "starts_at": "2026-11-10T16:15:00+00:00",
        },
    )
    assert family.status_code == 200, family.text
    assert family.json()["hour"] == "stays"
    assert _pack(client, owner)["balance_minutes"] == before


def test_reschedule_inside_the_window_burns(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    before = _pack(client, owner)["balance_minutes"]
    sid = _insert(datetime.now(timezone.utc) + timedelta(hours=2))
    moved = client.post(
        f"/api/v1/sessions/{sid}/student-change",
        headers=student,
        json={
            "action": "reschedule",
            "reason": "unavailable",
            "starts_at": "2026-11-10T18:00:00+00:00",
        },
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["hour"] == "used"
    assert _pack(client, owner)["balance_minutes"] == before - 60
    waived = _insert(datetime.now(timezone.utc) + timedelta(hours=3))
    kept = client.patch(
        f"/api/v1/sessions/{waived}",
        headers=owner,
        json={
            "starts_at": (datetime.now(timezone.utc) + timedelta(days=6)).isoformat(),
            "waive": True,
        },
    )
    assert kept.status_code == 200, kept.text
    assert kept.json()["hour"] == "stays"
    assert _pack(client, owner)["balance_minutes"] == before - 60


def test_teacher_cancel_does_not_burn(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    before = _pack(client, owner)["balance_minutes"]
    marked = _insert(datetime.now(timezone.utc) + timedelta(hours=5))
    _mark(client, teacher, marked, "teacher_cancel")
    assert _pack(client, owner)["balance_minutes"] == before
    outside = _insert(datetime.now(timezone.utc) + timedelta(days=3))
    _mark(client, teacher, outside, "student_cancel")
    assert _pack(client, owner)["balance_minutes"] == before
    inside = _insert(datetime.now(timezone.utc) + timedelta(hours=4))
    _mark(client, teacher, inside, "student_cancel")
    assert _pack(client, owner)["balance_minutes"] == before - 60
    waived = _insert(datetime.now(timezone.utc) + timedelta(hours=1))
    kept = client.patch(
        f"/api/v1/sessions/{waived}/record",
        headers=owner,
        json={"attendance": [{"student_id": STUDENT, "status": "student_cancel"}], "waive": True},
    )
    assert kept.status_code == 200, kept.text
    assert _pack(client, owner)["balance_minutes"] == before - 60
    cancelled = _insert(datetime.now(timezone.utc) + timedelta(days=2))
    gone = client.patch(
        f"/api/v1/sessions/{cancelled}",
        headers=teacher,
        json={"status": "cancelled", "cancel_reason": "teacher unwell"},
    )
    assert gone.status_code == 200, gone.text
    assert _pack(client, owner)["balance_minutes"] == before - 60


def test_parent_payload_includes_balance(client):
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    child = client.get("/api/v1/parent/home", headers=parent).json()["children"][0]
    assert child["lesson_pack"]["balance_minutes"] == 480
    assert child["lesson_pack"]["purchased_minutes"] == 480
    assert child["latest_class_note"]["text"]
    assert child["fees"]["visible"] is True
    assert child["fees"]["due"]["amount_cents"] == child["fee_due"]["amount_cents"]
    assignment = child["latest_assignment"]
    assert assignment["id"]
    assert isinstance(assignment["submitted"], bool)
    for tag, phone, workspace in (
        ("0002", "+9102o", WS_LANG),
        ("0003", "+9103o", WS_MUSIC),
    ):
        headers = auth(login(client, phone, workspace, "owner"))
        pack = _pack(client, headers, cid(tag, 20))
        assert pack["purchased_minutes"] == 480
        assert pack["balance_minutes"] == 480


def test_booking_refuses_balance_under_60_minutes(client):
    parent = auth(login(client, "+9101p", WS_EXAM, "parent"))
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    opened = client.get("/api/v1/parent/open-hours", headers=parent)
    assert opened.status_code == 200, opened.text
    starts = opened.json()["starts"]
    assert starts
    assert opened.json()["teacher_user_id"] == TEACHER
    blocked = "2026-11-04T16:00:00"
    now = datetime.now(timezone.utc)
    if now < datetime(2026, 11, 4, 16, tzinfo=timezone.utc) < now + timedelta(days=7):
        assert not any(item.startswith(blocked) for item in starts)
    booked = client.post("/api/v1/parent/bookings", headers=parent, json={"start": starts[0]})
    assert booked.status_code == 200, booked.text
    assert booked.json()["student_id"] == STUDENT
    assert _pack(client, owner)["balance_minutes"] == 480
    for offset in range(8):
        sid = _insert(datetime.now(timezone.utc) - timedelta(days=10 + offset))
        _mark(client, teacher, sid, "no_show")
    assert _pack(client, owner)["balance_minutes"] == 0
    refused = client.post("/api/v1/parent/bookings", headers=parent, json={"start": starts[0]})
    assert refused.status_code == 400
    assert refused.json()["detail"] == "balance under 60 minutes"


def test_owner_enquiry_creates_a_student_and_a_pack(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    refused = client.post(
        "/api/v1/owner/enquiries",
        headers=teacher,
        json={"name": "New family", "phone": "+91019991", "hours": 4},
    )
    assert refused.status_code == 403
    created = client.post(
        "/api/v1/owner/enquiries",
        headers=owner,
        json={"name": "New family", "phone": "+91019991", "hours": 4},
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["purchased_minutes"] == 240
    assert body["balance_minutes"] == 240
    assert "board" not in body
    pack = _pack(client, owner, body["student_id"])
    assert pack["balance_minutes"] == 240
    assert pack["purchased_minutes"] == 240
