from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class MockPorts:
    """Vendor edges. Never live. Tests assert live_calls == 0."""

    live_calls: int = 0
    sms: list[dict] = field(default_factory=list)
    email: list[dict] = field(default_factory=list)
    whatsapp: list[dict] = field(default_factory=list)
    push: list[dict] = field(default_factory=list)
    video: list[dict] = field(default_factory=list)
    payments: list[dict] = field(default_factory=list)
    storage: list[dict] = field(default_factory=list)

    def send_sms(self, to: str, body: str) -> None:
        self.sms.append({"to": to, "body": body, "provider": "mock"})

    def send_email(self, to: str, subject: str, body: str) -> None:
        self.email.append({"to": to, "subject": subject, "body": body, "provider": "mock"})

    def send_whatsapp(self, to_role: str, body: str) -> bool:
        self.whatsapp.append({"to_role": to_role, "body": body, "provider": "mock"})
        return True

    def send_push(self, to: str, body: str) -> None:
        self.push.append({"to": to, "body": body, "provider": "mock"})

    def create_video_link(self, session_id: str) -> str:
        self.video.append({"session_id": session_id, "provider": "mock"})
        return f"mock://meet/{session_id}"

    def local_put(self, path: str) -> str:
        self.storage.append({"path": path, "provider": "local"})
        return path

    def checkout_invoice(self, invoice_id: str, amount_cents: int) -> dict:
        self.payments.append(
            {"invoice_id": invoice_id, "amount_cents": amount_cents, "provider": "mock"}
        )
        return {"status": "mock_ok", "invoice_id": invoice_id, "provider": "mock"}

    def connect_integration(self, name: str) -> dict:
        return {"name": name, "connected": True, "provider": "mock"}
