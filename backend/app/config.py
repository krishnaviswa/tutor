from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_ROOT / "data"
DEFAULT_SQLITE = DATA_DIR / "sim.db"
DEFAULT_POSTGRES = "postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = DEFAULT_POSTGRES
    jwt_secret: str = "dev-only-sim-secret"
    jwt_alg: str = "HS256"
    otp_code: str = "000000"
    sms_provider: str = "mock"
    email_provider: str = "mock"
    video_provider: str = "mock"
    storage_provider: str = "local"
    payments_student_provider: str = "mock"
    payments_platform_provider: str = "mock"
    push_provider: str = "mock"
    whatsapp_provider: str = "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
