"""Library uploads keep the original file bytes on the content item."""

import base64

from app.services.library import MAX_FILE_BYTES, exceeds_file_cap
from app.services.seed import WS_EXAM, WS_LANG
from tests.helpers import auth, login


def test_upload_cap_accepts_boundary_and_rejects_one_extra_byte():
    assert MAX_FILE_BYTES == 50 * 1024 * 1024
    assert exceeds_file_cap(MAX_FILE_BYTES) is False
    assert exceeds_file_cap(MAX_FILE_BYTES + 1) is True


TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)
TINY_TEXT = b"voltage is conservative\n"


def test_upload_png_and_text_round_trip(client):
    teacher = auth(login(client, "+9101t", WS_EXAM, "teacher"))
    other = auth(login(client, "+9102t", WS_LANG, "teacher"))

    posted = client.post(
        "/api/v1/content",
        headers=teacher,
        json={
            "title": "dot.png",
            "filename": "dot.png",
            "mime": "image/png",
            "data_base64": base64.b64encode(TINY_PNG).decode("ascii"),
            "board": "CBSE",
            "subject": "Physics",
            "unit": "Unit 1 · Foundations",
        },
    )
    assert posted.status_code == 200, posted.text
    created = posted.json()
    assert created["workspace_id"] == WS_EXAM
    assert created["filename"] == "dot.png"
    assert created["mime"] == "image/png"
    assert created["file_kind"] == "png"
    assert created["has_file"] is True
    assert created["size_bytes"] == len(TINY_PNG)
    assert "data_base64" not in created

    fetched = client.get(f"/api/v1/content/{created['id']}", headers=teacher)
    assert fetched.status_code == 200, fetched.text
    detail = fetched.json()
    assert base64.b64decode(detail["data_base64"]) == TINY_PNG
    assert detail["filename"] == "dot.png"
    assert detail["mime"] == "image/png"
    assert detail["workspace_id"] == WS_EXAM

    listed = client.get("/api/v1/content", headers=teacher).json()
    match = next(row for row in listed if row["id"] == created["id"])
    assert match["filename"] == "dot.png"
    assert match["has_file"] is True
    assert "data_base64" not in match

    hidden = client.get(f"/api/v1/content/{created['id']}", headers=other)
    assert hidden.status_code == 404

    text_post = client.post(
        "/api/v1/content",
        headers=teacher,
        json={
            "title": "",
            "body": "summary",
            "filename": "notes.txt",
            "mime": "text/plain",
            "data_base64": base64.b64encode(TINY_TEXT).decode("ascii"),
            "board": "CBSE",
            "subject": "Physics",
            "unit": "Unit 1",
        },
    )
    assert text_post.status_code == 200, text_post.text
    assert text_post.json()["title"] == "notes.txt"
    text_detail = client.get(f"/api/v1/content/{text_post.json()['id']}", headers=teacher)
    assert text_detail.status_code == 200, text_detail.text
    assert base64.b64decode(text_detail.json()["data_base64"]) == TINY_TEXT
    assert text_detail.json()["mime"] == "text/plain"
    assert text_detail.json()["filename"] == "notes.txt"

    rejected = client.post(
        "/api/v1/content",
        headers=teacher,
        json={
            "title": "nope",
            "filename": "virus.exe",
            "mime": "application/octet-stream",
            "data_base64": base64.b64encode(b"MZ").decode("ascii"),
        },
    )
    assert rejected.status_code == 400
