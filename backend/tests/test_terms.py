"""GET /api/v1/terms reads the markdown file on every request. No Postgres."""

import os
import time

from fastapi import HTTPException

from app.services.seed import WS_EXAM
from app.services.terms import locate_terms_file, read_terms
from tests.helpers import auth, login

ROLES = (
    ("+9101o", "owner"),
    ("+9101t", "teacher"),
    ("+9101a", "assistant"),
    ("+9101s", "student"),
    ("+9101p", "parent"),
)


def test_locate_terms_file_ignores_process_cwd(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    found = locate_terms_file()
    assert found.parts[-3:] == ("docs", "legal", "terms-and-conditions.md")
    assert found.is_file()
    assert "replaces this file" in found.read_text(encoding="utf-8")


def test_read_terms_sees_a_rewrite(tmp_path):
    path = tmp_path / "terms-and-conditions.md"
    path.write_text("# Terms\n\nFirst body.\n", encoding="utf-8")
    assert "First body." in read_terms(path)["markdown"]
    path.write_text("# Terms\n\nSecond body.\n", encoding="utf-8")
    assert read_terms(path)["markdown"] == "# Terms\n\nSecond body.\n"


def test_read_terms_missing_is_404(tmp_path):
    try:
        read_terms(tmp_path / "absent.md")
    except HTTPException as exc:
        assert exc.status_code == 404
        assert exc.detail == "Terms file is not on disk."
    else:
        raise AssertionError("missing terms file should 404")


def test_terms_requires_sign_in(client):
    assert client.get("/api/v1/terms").status_code == 401


def test_signed_in_roles_read_repo_terms(client):
    for phone, role in ROLES:
        headers = auth(login(client, phone, WS_EXAM, role))
        res = client.get("/api/v1/terms", headers=headers)
        assert res.status_code == 200, (role, res.text)
        body = res.json()
        assert "replaces this file" in body["markdown"]
        assert body["mtime"]


def test_get_terms_returns_a_file_edit_on_the_same_app(client, monkeypatch, tmp_path):
    path = tmp_path / "terms-and-conditions.md"
    path.write_text("# Terms\n\nFirst draft line.\n", encoding="utf-8")
    monkeypatch.setattr("app.services.terms.locate_terms_file", lambda: path)

    headers = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    first = client.get("/api/v1/terms", headers=headers)
    assert first.status_code == 200, first.text
    assert "First draft line." in first.json()["markdown"]
    first_mtime = first.json()["mtime"]

    path.write_text("# Terms\n\nReplaced while the server is up.\n", encoding="utf-8")
    later = time.time() + 5
    os.utime(path, (later, later))

    second = client.get("/api/v1/terms", headers=headers)
    assert second.status_code == 200, second.text
    assert "Replaced while the server is up." in second.json()["markdown"]
    assert "First draft line." not in second.json()["markdown"]
    assert second.json()["mtime"] != first_mtime


def test_missing_terms_route_is_404(client, monkeypatch, tmp_path):
    monkeypatch.setattr("app.services.terms.locate_terms_file", lambda: tmp_path / "absent.md")
    headers = auth(login(client, "+9101o", WS_EXAM, "owner"))
    res = client.get("/api/v1/terms", headers=headers)
    assert res.status_code == 404
    assert res.json()["detail"] == "Terms file is not on disk."
