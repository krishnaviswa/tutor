# TutorOS backend

FastAPI `/api/v1` against SQLAlchemy models written for PostgreSQL. **Local (not hosted):** Docker Compose Postgres is the store. **pytest:** in-memory SQLite. Vendor, AI, and production-auth ports stay mock.

002 spine routes stay. 003 adds remaining catalog paths (branding, join/live/video, content, assignments, practice, tests, doubts, threads, announcements, dashboards, billing/checkout mock, payouts, audit, templates, automation, integrations). No `/sim/*` paths.

```bash
# from repo root
docker compose up -d postgres
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

`DATABASE_URL` defaults to `postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros`. When hosted, set the host DSN. Do not point the running API at SQLite.

Auth stub: OTP code `000000`. Example exam-prep teacher:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/otp/start -H "Content-Type: application/json" -d "{\"phone\":\"+9101t\"}"
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\"phone\":\"+9101t\",\"code\":\"000000\",\"workspace_id\":\"aaaaaaaa-0001-4000-8000-000000000001\",\"role\":\"teacher\",\"challenge_id\":\"<from start>\"}"
```

Exam-prep faculty does not need a staff-login screen; teaching APIs work after this stub.

```bash
python -m pytest
```

Seeded workspaces: `exam-prep`, `language-1on1`, `music`. Biology is not required.

```bash
# from repo root
docker compose up -d postgres
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

`DATABASE_URL` defaults to `postgresql+psycopg://tutor:tutor@127.0.0.1:5432/tutoros`. When hosted, set the host DSN. Do not point the running API at SQLite.

Auth stub: OTP code `000000`. Example exam-prep teacher:

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/otp/start -H "Content-Type: application/json" -d "{\"phone\":\"+9101t\"}"
curl -s -X POST http://127.0.0.1:8000/api/v1/auth/otp/verify -H "Content-Type: application/json" -d "{\"phone\":\"+9101t\",\"code\":\"000000\",\"workspace_id\":\"aaaaaaaa-0001-4000-8000-000000000001\",\"role\":\"teacher\",\"challenge_id\":\"<from start>\"}"
```

Exam-prep faculty does not need a staff-login screen; teaching APIs work after this stub.

```bash
pytest
```

Seeded workspaces: `exam-prep`, `language-1on1`, `music`. Biology is not required.
