"""Sign-in writes must be committed before the reply goes out.

FastAPI 0.118+ runs get_db's commit after the response is sent, so a client that calls the
next endpoint at once (verify right after start, or any call with the new token) can miss
the row. The routes commit themselves; this test swaps get_db for one that never commits,
so any commit seen here came from the route.
"""

import pytest

from app.db import get_db, session_factory

WS = "aaaaaaaa-0001-4000-8000-000000000001"
PHONE = "+9101s"
EMAIL = "student@exam-prep.sim"


@pytest.fixture
def commits(client):
    seen: list[str] = []

    def no_commit_db():
        db = session_factory()()
        real = db.commit

        def spy():
            seen.append("commit")
            real()

        db.commit = spy  # type: ignore[method-assign]
        try:
            yield db
        finally:
            db.close()

    client.app.dependency_overrides[get_db] = no_commit_db
    yield seen
    client.app.dependency_overrides.pop(get_db, None)


def test_otp_start_commits_before_reply(client, commits):
    r = client.post("/api/v1/auth/otp/start", json={"phone": PHONE, "workspace_id": WS})
    assert r.status_code == 200
    assert commits, "otp/start must commit the challenge itself"


def test_otp_verify_commits_before_reply(client, commits):
    ch = client.post("/api/v1/auth/otp/start", json={"phone": PHONE, "workspace_id": WS}).json()["challenge_id"]
    before = len(commits)
    r = client.post(
        "/api/v1/auth/otp/verify",
        json={"phone": PHONE, "code": "000000", "workspace_id": WS, "role": "student", "challenge_id": ch},
    )
    assert r.status_code == 200
    assert len(commits) > before, "otp/verify must commit the session row itself"


def test_magic_link_commits_before_reply(client, commits):
    r = client.post("/api/v1/auth/magic-link", json={"email": EMAIL, "workspace_id": WS, "role": "student"})
    assert r.status_code == 200
    assert commits, "magic-link must commit the session row itself"
