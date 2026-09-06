from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import (
    assessments,
    assignments,
    auth,
    cohorts,
    comms,
    content,
    extras,
    join,
    owner,
    parent,
    practice,
    sessions,
    students,
    stubs,
    workspaces,
)
from app.config import DATA_DIR, get_settings
from app.db import init_db, session_factory
from app.middleware.idempotency import IdempotencyMiddleware
from app.middleware.request_id import RequestIdMiddleware
from app.ports.mocks import MockPorts
from app.services.seed import seed_all


def create_app(*, seed: bool = True) -> FastAPI:
    settings = get_settings()
    for key in (
        "sms_provider",
        "email_provider",
        "video_provider",
        "whatsapp_provider",
        "push_provider",
        "payments_student_provider",
        "payments_platform_provider",
    ):
        if getattr(settings, key) not in ("mock", "local"):
            raise RuntimeError(f"{key} must be mock in 002-sim-spine")
    if settings.storage_provider not in ("local", "mock"):
        raise RuntimeError("storage_provider must be local|mock")

    application = FastAPI(title="TutorOS sim-spine", version="002")
    application.add_middleware(IdempotencyMiddleware)
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.state.ports = MockPorts()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    init_db()
    if seed:
        db = session_factory()()
        try:
            seed_all(db)
        finally:
            db.close()

    api = "/api/v1"
    application.include_router(auth.router, prefix=api)
    application.include_router(workspaces.router, prefix=api)
    application.include_router(students.router, prefix=api)
    application.include_router(cohorts.router, prefix=api)
    application.include_router(parent.router, prefix=api)
    application.include_router(join.router, prefix=api)
    application.include_router(sessions.router, prefix=api)
    application.include_router(content.router, prefix=api)
    application.include_router(assignments.router, prefix=api)
    application.include_router(practice.router, prefix=api)
    application.include_router(assessments.router, prefix=api)
    application.include_router(comms.router, prefix=api)
    application.include_router(extras.router, prefix=api)
    application.include_router(owner.router, prefix=api)
    application.include_router(stubs.router, prefix=api)
    return application
