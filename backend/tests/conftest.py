import os

os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SMS_PROVIDER"] = "mock"
os.environ["EMAIL_PROVIDER"] = "mock"
os.environ["WHATSAPP_PROVIDER"] = "mock"

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.db import reset_engine
from app.factory import create_app


@pytest.fixture
def client():
    reset_engine()
    get_settings.cache_clear()
    application = create_app(seed=True)
    with TestClient(application) as c:
        yield c
    assert application.state.ports.live_calls == 0
