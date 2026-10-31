"""010 rows 12 and 13. Session handoff and faculty-admin revert.

These cases do not use the theme toggle, the doubt notice, or campus images.
"""

from app.db import session_factory
from app.models.tables import ContentItem, FacultyAdminGrant, Identity, ScheduledSession, SessionRecord, StaffMembership, User, Workspace
from app.services.handoff import SessionHandoff
from app.services.seed import PEOPLE_EXAM, PEOPLE_LANG, WS_EXAM, cid
from tests.helpers import auth, login

ONE_ON_ONE = cid("0001", 56)
TEACHER = PEOPLE_EXAM["teacher"]
OWNER = PEOPLE_EXAM["owner"]
ASSISTANT = PEOPLE_EXAM["assistant"]
COLLEAGUE = "bbbbbbbb-0001-4000-8000-000000000099"
OTHER_ORG_TEACHER = PEOPLE_LANG["teacher"]


def _headers(client, phone: str, role: str, workspace_id: str = WS_EXAM):
    return auth(login(client, phone, workspace_id, role))


def _colleague(db) -> None:
    db.add(User(id=COLLEAGUE, display_name="Colleague"))
    db.flush()
    db.add(Identity(workspace_id=WS_EXAM, user_id=COLLEAGUE, kind="phone", value="+9101c"))
    db.add(StaffMembership(workspace_id=WS_EXAM, user_id=COLLEAGUE, role="teacher"))
    db.commit()


def _attach(db, *, subject: str, title: str, body: str) -> str:
    item = ContentItem(
        workspace_id=WS_EXAM,
        title=title,
        body=body,
        created_by=TEACHER,
        meta={"session_id": ONE_ON_ONE, "subject_label": subject},
    )
    db.add(item)
    db.flush()
    session = db.get(ScheduledSession, ONE_ON_ONE)
    session.subject_label = subject
    session.library_item_id = item.id
    db.commit()
    return item.id


def test_teacher_hands_session_subject_and_content_to_colleague(client):
    teacher = _headers(client, "+9101t", "teacher")
    db = session_factory()()
    _colleague(db)
    content_id = _attach(db, subject="language", title="Handoff notes", body="original body")
    db.close()

    owner = _headers(client, "+9101o", "owner")
    granted = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": TEACHER})
    assert granted.status_code == 200, granted.text
    refused = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert refused.status_code == 403
    assert "substitute" in refused.json()["detail"]
    still = client.get(f"/api/v1/sessions/{ONE_ON_ONE}", headers=teacher).json()
    assert still["teacher_user_id"] == TEACHER

    db = session_factory()()
    db.query(FacultyAdminGrant).filter(
        FacultyAdminGrant.workspace_id == WS_EXAM,
        FacultyAdminGrant.user_id == TEACHER,
    ).delete()
    db.commit()
    db.close()

    assistant = _headers(client, "+9101a", "assistant")
    client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": ASSISTANT})
    admin_pick = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=assistant,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert admin_pick.status_code == 403
    assert "substitute" in admin_pick.json()["detail"]

    outsider = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": OTHER_ORG_TEACHER},
    )
    assert outsider.status_code == 404

    sent = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert sent.status_code == 200, sent.text
    assert sent.json()["teacher_user_id"] == COLLEAGUE
    assert sent.json()["subject_label"] == "language"
    assert sent.json()["library_item_id"] == content_id
    assert sent.json()["workspace_id"] == WS_EXAM

    colleague = _headers(client, "+9101c", "teacher")
    received = client.get(f"/api/v1/sessions/{ONE_ON_ONE}", headers=colleague).json()
    assert received["teacher_user_id"] == COLLEAGUE
    assert received["subject_label"] == "language"
    assert received["library_item_id"] == content_id
    content = client.get(f"/api/v1/content/{content_id}", headers=colleague)
    assert content.status_code == 200, content.text
    assert content.json()["title"] == "Handoff notes"

    db = session_factory()()
    ledger = (
        db.query(SessionHandoff)
        .filter(SessionHandoff.session_id == ONE_ON_ONE, SessionHandoff.active == 1)
        .one()
    )
    assert ledger.workspace_id == WS_EXAM
    assert content_id in (ledger.content_ids or [])
    assert db.get(Workspace, WS_EXAM).student_whatsapp == 0
    db.close()


def test_faculty_admin_reverts_handoff_and_leaves_other_edits(client):
    teacher = _headers(client, "+9101t", "teacher")
    owner = _headers(client, "+9101o", "owner")
    assistant = _headers(client, "+9101a", "assistant")
    db = session_factory()()
    _colleague(db)
    content_id = _attach(db, subject="language", title="Handoff notes", body="original body")
    session = db.get(ScheduledSession, ONE_ON_ONE)
    original_start = session.starts_at.isoformat()
    db.add(
        SessionRecord(
            workspace_id=WS_EXAM,
            session_id=ONE_ON_ONE,
            notes="before handoff",
        )
    )
    db.commit()
    db.close()

    sent = client.post(
        f"/api/v1/sessions/{ONE_ON_ONE}/handoff",
        headers=teacher,
        json={"teacher_user_id": COLLEAGUE},
    )
    assert sent.status_code == 200, sent.text

    renamed = client.patch(
        f"/api/v1/sessions/{ONE_ON_ONE}",
        headers=owner,
        json={"title": "Renamed after handoff"},
    )
    assert renamed.status_code == 200, renamed.text

    db = session_factory()()
    session = db.get(ScheduledSession, ONE_ON_ONE)
    replacement = ContentItem(
        workspace_id=WS_EXAM,
        title="Substitute file",
        body="later",
        created_by=COLLEAGUE,
        meta={"session_id": ONE_ON_ONE},
    )
    db.add(replacement)
    db.flush()
    replacement_id = replacement.id
    session.subject_label = "replaced subject"
    session.library_item_id = replacement_id
    session.board = {"strokes": [{"id": "after"}], "texts": [], "placements": [], "erases": []}
    original = db.get(ContentItem, content_id)
    original.body = "edited after handoff"
    record = (
        db.query(SessionRecord)
        .filter(SessionRecord.workspace_id == WS_EXAM, SessionRecord.session_id == ONE_ON_ONE)
        .one()
    )
    record.notes = "note written after handoff"
    db.commit()
    kept_start = session.starts_at.isoformat()
    db.close()

    no_grant = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=teacher)
    assert no_grant.status_code == 403
    owner_no = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=owner)
    assert owner_no.status_code == 403
    assistant_no = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=assistant)
    assert assistant_no.status_code == 403

    granted = client.post("/api/v1/faculty-admin/grants", headers=owner, json={"user_id": ASSISTANT})
    assert granted.status_code == 200, granted.text
    reverted = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=assistant)
    assert reverted.status_code == 200, reverted.text
    body = reverted.json()
    assert body["teacher_user_id"] == TEACHER
    assert body["subject_label"] == "language"
    assert body["library_item_id"] == content_id
    assert body["title"] == "Renamed after handoff"
    assert body["starts_at"] == kept_start
    assert body["prior_teacher_user_id"] is None

    db = session_factory()()
    original = db.get(ContentItem, content_id)
    assert original.body == "edited after handoff"
    assert db.get(ContentItem, replacement_id) is not None
    session = db.get(ScheduledSession, ONE_ON_ONE)
    assert session.board["strokes"][0]["id"] == "after"
    assert session.starts_at.isoformat() == original_start
    record = (
        db.query(SessionRecord)
        .filter(SessionRecord.workspace_id == WS_EXAM, SessionRecord.session_id == ONE_ON_ONE)
        .one()
    )
    assert record.notes == "note written after handoff"
    assert db.get(Workspace, WS_EXAM).student_whatsapp == 0
    db.close()

    again = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/handoff/revert", headers=assistant)
    assert again.status_code == 400
    undo = client.post(f"/api/v1/sessions/{ONE_ON_ONE}/undo", headers=assistant)
    assert undo.status_code == 404
    still = client.get(f"/api/v1/sessions/{ONE_ON_ONE}", headers=teacher).json()
    assert still["title"] == "Renamed after handoff"
    assert still["teacher_user_id"] == TEACHER
