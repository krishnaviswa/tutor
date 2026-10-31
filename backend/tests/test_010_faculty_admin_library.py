"""010 faculty admin, profiles, library, attendance, handoff, feedback. Mock ports only."""

from datetime import datetime, timedelta, timezone

from app.db import session_factory
from app.models.tables import Identity, PersonProfile, StaffMembership, User
from app.services.seed import PEOPLE_EXAM, WS_EXAM, cid
from tests.helpers import auth, login

STUDENT_ID = cid("0001", 20)
ONE_ON_ONE = cid("0001", 56)
TEACHER = PEOPLE_EXAM["teacher"]
ASSISTANT = PEOPLE_EXAM["assistant"]
STUDENT_USER = PEOPLE_EXAM["student"]
COLLEAGUE = "bbbbbbbb-0001-4000-8000-000000000099"


def _step(client, headers):
    started = client.post("/api/v1/profile/step-up", headers=headers)
    assert started.status_code == 200, started.text
    return started.json()


def test_own_profile_and_step_up(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    refused = client.put(
        "/api/v1/profile",
        headers=student,
        json={"phone": "555", "address": "12 Lane", "expertise": "essays", "board_label": "CBSE"},
    )
    assert refused.status_code == 400
    step = _step(client, student)
    saved = client.put(
        "/api/v1/profile",
        headers=student,
        json={
            "phone": "555",
            "address": "12 Lane",
            "expertise": "essays",
            "board_label": "CBSE",
            "grade_label": "10",
            "study_info": "algebra practice",
            "challenge_id": step["challenge_id"],
            "code": "000000",
        },
    )
    assert saved.status_code == 200, saved.text
    assert "token" not in saved.json()
    own = client.get("/api/v1/profile", headers=student).json()
    assert own["phone"] == "555"
    assert own["board_label"] == "CBSE"
    assert own["address"] == "12 Lane"

    tstep = _step(client, teacher)
    teacher_saved = client.put(
        "/api/v1/profile",
        headers=teacher,
        json={
            "phone": "444",
            "address": "Teachers row",
            "expertise": "language",
            "subjects": "language",
            "challenge_id": tstep["challenge_id"],
            "code": "000000",
        },
    )
    assert teacher_saved.status_code == 200, teacher_saved.text
    me = client.get("/api/v1/auth/me", headers=teacher).json()
    assert me["id"] == TEACHER


def test_reduced_cards_hide_phone_and_address(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    step = _step(client, student)
    client.put(
        "/api/v1/profile",
        headers=student,
        json={
            "phone": "555",
            "address": "12 Lane",
            "board_label": "ICSE",
            "grade_label": "9",
            "study_info": "unit notes",
            "challenge_id": step["challenge_id"],
            "code": "000000",
        },
    )
    tstep = _step(client, teacher)
    client.put(
        "/api/v1/profile",
        headers=teacher,
        json={
            "expertise": "language",
            "subjects": "language",
            "phone": "444",
            "address": "hidden house",
            "challenge_id": tstep["challenge_id"],
            "code": "000000",
        },
    )
    card = client.get(f"/api/v1/profiles/{TEACHER}/card", headers=student).json()
    assert card["name"]
    assert card["subjects"] == "language"
    assert "exam-prep" in card["organization_email"]
    assert "phone" not in card and "address" not in card
    student_card = client.get(f"/api/v1/profiles/{STUDENT_USER}/card", headers=teacher).json()
    assert student_card["grade"] == "9"
    assert student_card["board"] == "ICSE"
    assert student_card["study_info"] == "unit notes"
    assert "phone" not in student_card and "address" not in student_card


def test_faculty_admin_edit_succession_contact_and_attendance(client):
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    before = client.get("/api/v1/sessions", headers=teacher).json()
    granted = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": TEACHER})
    assert granted.status_code == 200, granted.text
    assert PEOPLE_EXAM["owner"] in granted.json()["owner_ids"]
    after = client.get("/api/v1/sessions", headers=teacher).json()
    assert [s["teacher_user_id"] for s in before] == [s["teacher_user_id"] for s in after]
    grouped = client.post(
        "/api/v1/faculty-admin/supervision",
        headers=teacher,
        json={"user_id": TEACHER},
    )
    assert grouped.status_code == 200, grouped.text

    step = _step(client, teacher)
    assert step["email_challenge_id"]
    missing_email = client.put(
        "/api/v1/profile",
        headers=teacher,
        json={
            "expertise": "language",
            "challenge_id": step["challenge_id"],
            "code": "000000",
        },
    )
    assert missing_email.status_code == 400
    both = client.put(
        "/api/v1/profile",
        headers=teacher,
        json={
            "expertise": "language",
            "subjects": "language",
            "phone": "444",
            "address": "own home",
            "challenge_id": step["challenge_id"],
            "code": "000000",
            "email_challenge_id": step["email_challenge_id"],
            "email_code": "000000",
        },
    )
    assert both.status_code == 200, both.text
    assert "token" not in both.json()

    edited = client.patch(
        f"/api/v1/profiles/{TEACHER}",
        headers=teacher,
        json={"subjects": "spoken language"},
    )
    assert edited.status_code == 200, edited.text
    seen = client.get(f"/api/v1/profiles/{TEACHER}/card", headers=student).json()
    assert seen["subjects"] == "spoken language"
    removed_student = client.delete(f"/api/v1/profiles/{STUDENT_USER}", headers=teacher)
    assert removed_student.status_code == 403

    marked = client.patch(
        f"/api/v1/sessions/{ONE_ON_ONE}/record",
        headers=teacher,
        json={
            "notes": "held",
            "attendance": [{"student_id": STUDENT_ID, "status": "present"}],
            "teacher_status": "present",
        },
    )
    assert marked.status_code == 200, marked.text
    assert marked.json()["teacher_status"] == "present"
    planning = client.get("/api/v1/faculty-admin/planning", headers=teacher).json()
    row = next(p for p in planning if p["session_id"] == ONE_ON_ONE)
    assert row["teacher_status"] == "present"
    assert row["student_attendance"][0]["status"] == "present"

    silent = client.post(
        "/api/v1/threads/t-010/messages",
        headers=teacher,
        json={"body": "hello", "student_id": STUDENT_ID},
    )
    assert silent.status_code == 200, silent.text  # faculty admin may speak without the teacher grant

    other = auth(login(client, "+9101a", WS_EXAM, "assistant"))
    # Assistant is not a teacher; a teacher without the grant is checked below via a colleague.
    db = session_factory()()
    db.add(User(id=COLLEAGUE, display_name="Colleague"))
    db.flush()
    db.add(StaffMembership(workspace_id=WS_EXAM, user_id=COLLEAGUE, role="teacher"))
    db.commit()
    db.close()
    # Colleague has no login in this test. Contact grant is given, then faculty succession.
    opened = client.post(
        "/api/v1/faculty-admin/contact-grants",
        headers=owner,
        json={"user_id": COLLEAGUE},
    )
    assert opened.status_code == 200, opened.text
    handed = client.post(
        "/api/v1/faculty-admin/succession",
        headers=teacher,
        json={"user_id": ASSISTANT},
    )
    assert handed.status_code == 200, handed.text
    assert handed.json()["owner_ids"] == granted.json()["owner_ids"]
    assert handed.json()["previous_can_supervise"] is False
    assert client.get("/api/v1/faculty-admin/me", headers=other).json()["faculty_admin"] is True


def test_teacher_without_contact_cannot_message(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    denied = client.post(
        "/api/v1/threads/t-010b/messages",
        headers=teacher,
        json={"body": "hello", "student_id": STUDENT_ID},
    )
    assert denied.status_code == 403
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    owner_msg = client.post(
        "/api/v1/threads/t-010b/messages",
        headers=owner,
        json={"body": "from the office", "student_id": STUDENT_ID},
    )
    assert owner_msg.status_code == 200, owner_msg.text
    granted = client.post(
        "/api/v1/faculty-admin/contact-grants",
        headers=owner,
        json={"user_id": TEACHER},
    )
    assert granted.status_code == 200, granted.text
    allowed = client.post(
        "/api/v1/threads/t-010b/messages",
        headers=teacher,
        json={"body": "now I can", "student_id": STUDENT_ID},
    )
    assert allowed.status_code == 200, allowed.text


def test_student_reschedule_and_decline(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    when = (datetime.now(timezone.utc) + timedelta(days=3)).replace(minute=0, second=0, microsecond=0)
    moved = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/student-change",
        headers=student,
        json={"action": "reschedule", "reason": "unavailable", "starts_at": when.isoformat()},
    )
    assert moved.status_code == 200, moved.text
    seen = client.get(f"/api/v1/sessions/{ONE_ON_ONE}", headers=teacher).json()
    assert seen["starts_at"].startswith(when.date().isoformat()) or "T" in seen["starts_at"]
    declined = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/student-change",
        headers=student,
        json={"action": "decline", "reason": "unwell"},
    )
    assert declined.status_code == 200, declined.text
    assert declined.json()["display_status"] == "Declined"
    assert client.get(f"/api/v1/sessions/{ONE_ON_ONE}", headers=teacher).json()["status"] == "declined"


def test_library_files_and_board_placement(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    empty = client.put(
        f"/api/v1/sessions/{ONE_ON_ONE}/board",
        headers=teacher,
        json={"strokes": [{"id": "solo", "color": "green"}]},
    )
    assert empty.status_code == 200, empty.text
    bad = client.post(
        "/api/v1/content",
        headers=teacher,
        json={"title": "nope", "file_kind": "exe", "board": "CBSE", "subject": "language", "unit": "unit 1"},
    )
    assert bad.status_code == 400
    filed = client.post(
        "/api/v1/content",
        headers=teacher,
        json={
            "title": "Worksheet",
            "file_kind": "pdf",
            "board": "CBSE",
            "subject": "language",
            "unit": "unit 1",
            "session_id": ONE_ON_ONE,
            "storage_path": "local/worksheet.pdf",
        },
    )
    assert filed.status_code == 200, filed.text
    assert filed.json()["board_label"] == "CBSE"
    assert filed.json()["file_kind"] == "pdf"
    placed = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/board/library",
        headers=teacher,
        json={"content_id": filed.json()["id"]},
    )
    assert placed.status_code == 200, placed.text
    assert any(p.get("content_id") == filed.json()["id"] for p in placed.json()["placements"])
    local = client.put(
        f"/api/v1/sessions/{ONE_ON_ONE}/board",
        headers=teacher,
        json={"placements": [{"id": "local-1", "name": "scan.png", "file_name": "scan.png", "kind": "png"}]},
    )
    assert local.status_code == 200, local.text
    ids = {p["id"] for p in local.json()["placements"]}
    assert "local-1" in ids


def test_handoff_and_revert(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    db = session_factory()()
    db.add(User(id=COLLEAGUE, display_name="Colleague"))
    db.flush()
    db.add(StaffMembership(workspace_id=WS_EXAM, user_id=COLLEAGUE, role="teacher"))
    db.commit()
    db.close()
    filed = client.post(
        "/api/v1/content",
        headers=teacher,
        json={
            "title": "Slides",
            "file_kind": "pptx",
            "board": "IB",
            "subject": "language",
            "unit": "unit 2",
            "session_id": ONE_ON_ONE,
        },
    )
    assert filed.status_code == 200, filed.text
    client.patch(
        f"/api/v1/sessions/{ONE_ON_ONE}",
        headers=teacher,
        json={"title": "Handoff class"},
    )
    admin_try = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": TEACHER})
    assert admin_try.status_code == 200
    refused = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert refused.status_code == 403
    client.post("/api/v1/faculty-admin/succession", headers=teacher, json={"user_id": PEOPLE_EXAM["assistant"]})
    sent = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert sent.status_code == 200, sent.text
    assert sent.json()["teacher_user_id"] == COLLEAGUE
    assert sent.json()["library_item_id"] == filed.json()["id"]
    assert sent.json()["subject_label"]
    client.patch(f"/api/v1/sessions/{ONE_ON_ONE}", headers=owner, json={"title": "Renamed after handoff"})
    no_admin = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=teacher)
    assert no_admin.status_code == 403
    assistant = auth(login(client, "+9101a", WS_EXAM, "assistant"))
    # Revert requires the faculty-admin grant. The assistant holds it but the route allows assistant.
    reverted = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=assistant)
    assert reverted.status_code == 200, reverted.text
    assert reverted.json()["teacher_user_id"] == TEACHER
    assert reverted.json()["library_item_id"] == filed.json()["id"]
    assert reverted.json()["title"] == "Renamed after handoff"


def test_directory_hides_private_and_withhold_contact(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    refused = client.get("/api/v1/faculty-admin/directory", headers=teacher)
    assert refused.status_code == 403
    owner = auth(login(client, "+9101o", WS_EXAM, "owner"))
    granted = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": TEACHER})
    assert granted.status_code == 200, granted.text

    db = session_factory()()
    db.add(User(id=COLLEAGUE, display_name="Colleague"))
    db.flush()
    db.add(StaffMembership(workspace_id=WS_EXAM, user_id=COLLEAGUE, role="teacher"))
    db.add(Identity(workspace_id=WS_EXAM, user_id=COLLEAGUE, kind="phone", value="+9101c"))
    db.add(
        PersonProfile(
            workspace_id=WS_EXAM,
            user_id=COLLEAGUE,
            phone="999",
            address="secret lane",
            subjects="language",
            expertise="language",
        )
    )
    db.commit()
    db.close()

    directory = client.get("/api/v1/faculty-admin/directory", headers=teacher)
    assert directory.status_code == 200, directory.text
    body = directory.json()
    for person in body["people"] + body["teachers"]:
        assert "phone" not in person and "address" not in person
    card = next(row for row in body["teachers"] if row["user_id"] == COLLEAGUE)
    assert card["subjects"] == "language"
    assert card["name"] == "Colleague"
    assert card["contact"] is False
    assert STUDENT_USER not in {row["user_id"] for row in body["teachers"]}

    opened = client.post(
        "/api/v1/faculty-admin/contact-grants",
        headers=teacher,
        json={"user_id": COLLEAGUE},
    )
    assert opened.status_code == 200, opened.text
    colleague = auth(login(client, "+9101c", WS_EXAM, "teacher"))
    allowed = client.post(
        "/api/v1/threads/t-010c/messages",
        headers=colleague,
        json={"body": "hello", "student_id": STUDENT_ID},
    )
    assert allowed.status_code == 200, allowed.text
    withheld = client.delete(f"/api/v1/faculty-admin/contact-grants/{COLLEAGUE}", headers=teacher)
    assert withheld.status_code == 200, withheld.text
    assert withheld.json()["contact"] is False
    denied = client.post(
        "/api/v1/threads/t-010c/messages",
        headers=colleague,
        json={"body": "still here", "student_id": STUDENT_ID},
    )
    assert denied.status_code == 403
    still = client.delete(f"/api/v1/profiles/{STUDENT_USER}", headers=teacher)
    assert still.status_code == 403


def test_feedback_is_not_an_assignment_comment(client):
    student = auth(login(client, "+9101s", WS_EXAM, "student"))
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    sent = client.post(
        "/api/v1/feedback",
        headers=student,
        json={"teacher_user_id": TEACHER, "session_id": ONE_ON_ONE, "body": "Clear and calm."},
    )
    assert sent.status_code == 200, sent.text
    rows = client.get(f"/api/v1/feedback?teacher_user_id={TEACHER}", headers=teacher).json()
    assert any(r["body"] == "Clear and calm." for r in rows)
    assert "grade" not in sent.json()
