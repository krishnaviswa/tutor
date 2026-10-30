from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import DATA_DIR, get_settings
from app.models.tables import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker | None = None


def _sqlite_connect(engine: Engine) -> None:
    @event.listens_for(engine, "connect")
    def _fk(dbapi_conn, _rec):  # noqa: ANN001
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        settings = get_settings()
        url = settings.database_url
        if url.startswith("sqlite"):
            DATA_DIR.mkdir(parents=True, exist_ok=True)
            connect_args = {"check_same_thread": False}
            kwargs: dict = {"connect_args": connect_args}
            if ":memory:" in url or url.rstrip("/").endswith("sqlite://"):
                kwargs["poolclass"] = StaticPool
            _engine = create_engine(url, **kwargs)
            _sqlite_connect(_engine)
        else:
            _engine = create_engine(url)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def reset_engine() -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None
    get_settings.cache_clear()


def _column_type(dialect: str, logical: str) -> str:
    if logical == "json":
        return "JSON" if dialect == "postgresql" else "TEXT"
    if logical == "datetime":
        return "TIMESTAMP" if dialect == "postgresql" else "DATETIME"
    if logical == "int":
        return "INTEGER"
    return "VARCHAR(36)" if logical == "id" else "VARCHAR(32)"


# Additive columns for databases created before these fields existed.
# create_all does not ALTER. pytest sqlite memory gets them from the models.
_ADDED_COLUMNS: dict[str, list[tuple[str, str, str]]] = {
    "scheduled_sessions": [
        ("board", "json", ""),
        ("started_at", "datetime", ""),
    ],
    "messages": [("cohort_id", "id", "")],
    "notification_deliveries": [("student_id", "id", "")],
    "cohorts": [
        ("billing_mode", "str", "DEFAULT 'static'"),
        ("hourly_rate_cents", "int", "DEFAULT 0"),
    ],
    "enrollments": [
        ("plan_id", "id", ""),
        ("status", "str", "DEFAULT 'active'"),
    ],
    "invoices": [
        ("refunded_cents", "int", "DEFAULT 0"),
        ("kind", "str", "DEFAULT 'static'"),
    ],
    "payouts": [("teacher_user_id", "id", "")],
}


def ensure_added_columns(engine: Engine) -> None:
    """ADD COLUMN only. Never drops or rewrites existing columns."""
    insp = inspect(engine)
    dialect = engine.dialect.name
    with engine.begin() as conn:
        for table, cols in _ADDED_COLUMNS.items():
            if not insp.has_table(table):
                continue
            present = {c["name"] for c in insp.get_columns(table)}
            for name, logical, default_sql in cols:
                if name in present:
                    continue
                coltype = _column_type(dialect, logical)
                suffix = f" {default_sql}" if default_sql else ""
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {coltype}{suffix}"))


def init_db() -> None:
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    ensure_added_columns(engine)


def session_factory() -> sessionmaker:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    db = session_factory()()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def sqlite_file_url(path: Path) -> str:
    return f"sqlite:///{path.as_posix()}"
