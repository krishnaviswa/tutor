"""Username sign-in, owner faculty access, and PowerPoint slide text."""

import base64
import io
import zipfile

from app.services.seed import WS_EXAM
from app.services.slides import slides_from_pptx
from tests.helpers import auth, login


def test_password_signs_in_meera(client):
    bad = client.post(
        "/api/v1/auth/password",
        json={"username": "meera", "password": "nope", "workspace_id": WS_EXAM},
    )
    assert bad.status_code == 401
    ok = client.post(
        "/api/v1/auth/password",
        json={"username": "meera", "password": "TutorDemo1", "workspace_id": WS_EXAM},
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["role"] == "teacher"


def test_owner_can_turn_off_a_teacher_library(client):
    owner = login(client, "+9101o", WS_EXAM, "owner")
    teacher = login(client, "+9101t", WS_EXAM, "teacher")
    listing = client.get("/api/v1/owner/faculty-access", headers=auth(owner))
    assert listing.status_code == 200
    meera = next(row for row in listing.json()["teachers"] if "Meera" in row["name"])
    assert "B5" in meera["modules"]
    saved = client.put(
        f"/api/v1/owner/faculty-access/{meera['user_id']}",
        headers=auth(owner),
        json={"modules": ["B1", "A5"]},
    )
    assert saved.status_code == 200
    blocked = client.get("/api/v1/content", headers=auth(teacher))
    assert blocked.status_code == 404
    still = client.get("/api/v1/sessions", headers=auth(teacher))
    assert still.status_code == 200


def test_pptx_slide_text_is_read():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as package:
        package.writestr(
            "ppt/slides/slide1.xml",
            """<?xml version="1.0"?>
            <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                   xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
              <p:spTree><a:t>Neuron diagram</a:t></p:spTree>
            </p:sld>""",
        )
    pages = slides_from_pptx(buf.getvalue())
    assert pages[0]["texts"] == ["Neuron diagram"]
    assert slides_from_pptx(b"not a zip") == []
    assert base64.b64encode(buf.getvalue())
