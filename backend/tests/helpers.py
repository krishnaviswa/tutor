from fastapi.testclient import TestClient


def login(client: TestClient, phone: str, workspace_id: str, role: str) -> str:
    start = client.post("/api/v1/auth/otp/start", json={"phone": phone, "workspace_id": workspace_id})
    assert start.status_code == 200
    body = {
        "phone": phone,
        "code": "000000",
        "workspace_id": workspace_id,
        "role": role,
        "challenge_id": start.json()["challenge_id"],
    }
    ver = client.post("/api/v1/auth/otp/verify", json=body)
    assert ver.status_code == 200, ver.text
    return ver.json()["token"]


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
