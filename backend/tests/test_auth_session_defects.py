"""Auth, teaching-hub, and notice-module defects. In-memory SQLite."""

from app.db import session_factory
from app.models.tables import Identity, StaffMembership, User
from app.services.auth import DEMO_PASSWORD, SESSION_COOKIE
from app.services.internal_v2 import meta_of, put_meta
from app.services.seed import PEOPLE_EXAM, WS_EXAM, repair_existing_seed
from tests.helpers import auth, login


def _otp(client, phone: str, role: str, *, cookie: bool = False):
    start = client.post("/api/v1/auth/otp/start", json={"phone": phone, "workspace_id": WS_EXAM})
    assert start.status_code == 200
    headers = {"X-TutorOS-Cookie": "1"} if cookie else {}
    ver = client.post(
        "/api/v1/auth/otp/verify",
        headers=headers,
        json={
            "phone": phone,
            "code": "000000",
            "workspace_id": WS_EXAM,
            "role": role,
            "challenge_id": start.json()["challenge_id"],
        },
    )
    assert ver.status_code == 200, ver.text
    return ver


def test_owner_password_repairs_empty_hash_and_missing_username(client):
    db = session_factory()()
    user = db.get(User, PEOPLE_EXAM["owner"])
    assert user is not None
    user.password_hash = ""
    db.query(Identity).filter(Identity.kind == "username", Identity.user_id == user.id).delete()
    db.commit()
    db.close()

    missing = client.post(
        "/api/v1/auth/password",
        json={"username": "vikram", "password": DEMO_PASSWORD, "workspace_id": WS_EXAM},
    )
    assert missing.status_code == 401

    db = session_factory()()
    repair_existing_seed(db)
    db.close()

    ok = client.post(
        "/api/v1/auth/password",
        json={"username": "vikram", "password": DEMO_PASSWORD, "workspace_id": WS_EXAM},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["role"] == "owner"
    bad = client.post(
        "/api/v1/auth/password",
        json={"username": "vikram", "password": "not-the-demo-password", "workspace_id": WS_EXAM},
    )
    assert bad.status_code == 401
    assert bad.json()["detail"] == "unknown username or password"


def test_assistant_and_owner_can_open_the_teaching_hub(client):
    assistant = login(client, "+9101a", WS_EXAM, "assistant")
    owner = login(client, "+9101o", WS_EXAM, "owner")
    for token in (assistant, owner):
        body = client.get("/api/v1/teacher/dashboard", headers=auth(token))
        assert body.status_code == 200, body.text
        assert "attendance_pct" in body.json()
    assert client.get("/api/v1/owner/console", headers=auth(assistant)).status_code == 403


def test_teaching_hub_off_stays_module_off(client):
    db = session_factory()()
    row = (
        db.query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == WS_EXAM,
            StaffMembership.user_id == PEOPLE_EXAM["assistant"],
            StaffMembership.role == "assistant",
        )
        .first()
    )
    assert row is not None
    put_meta(row, modules=["A5", "B1"])
    db.commit()
    db.close()
    assistant = login(client, "+9101a", WS_EXAM, "assistant")
    denied = client.get("/api/v1/teacher/dashboard", headers=auth(assistant))
    assert denied.status_code == 404
    assert denied.json()["detail"] == "module off"
    me = client.get("/api/v1/auth/me", headers=auth(assistant)).json()
    assert "E2" not in (me["permissions"] or [])


def test_inbox_ignores_the_teaching_module_list(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    listing = client.get("/api/v1/owner/faculty-access", headers=auth(owner))
    assert listing.status_code == 200
    row = next(person for person in listing.json()["teachers"] if person["name"] == "Sudhakshina")
    saved = client.put(
        f"/api/v1/owner/faculty-access/{row['user_id']}",
        headers=auth(owner),
        json={"modules": ["A5", "B1", "B2", "B5", "C1", "D1", "E2"]},
    )
    assert saved.status_code == 200
    assert "D5" not in saved.json()["modules"]
    box = client.get("/api/v1/notifications/inbox", headers=auth(teacher))
    assert box.status_code == 200, box.text
    me = client.get("/api/v1/auth/me", headers=auth(teacher)).json()
    assert "D5" in me["workspace_modules"]


def test_browser_cookie_is_http_only_and_logout_clears_it(client):
    plain = _otp(client, "+9101s", "student", cookie=False)
    assert SESSION_COOKIE not in plain.headers.get("set-cookie", "").lower()

    ver = _otp(client, "+9101s", "student", cookie=True)
    issued = ver.headers.get("set-cookie", "")
    assert SESSION_COOKIE in issued
    assert "httponly" in issued.lower()
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "student"
    gone = client.post("/api/v1/auth/logout")
    assert gone.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_assistant_record_stays_forbidden(client):
    assistant = login(client, "+9101a", WS_EXAM, "assistant")
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    session_id = client.get("/api/v1/sessions", headers=auth(teacher)).json()[0]["id"]
    denied = client.get(f"/api/v1/sessions/{session_id}/record", headers=auth(assistant))
    assert denied.status_code == 403
    modules = meta_of(
        session_factory()()
        .query(StaffMembership)
        .filter(
            StaffMembership.workspace_id == WS_EXAM,
            StaffMembership.user_id == PEOPLE_EXAM["assistant"],
        )
        .one()
    ).get("modules")
    assert "E2" in modules
