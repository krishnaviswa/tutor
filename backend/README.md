# TutorOS backend (002-sim-spine)

FastAPI `/api/v1` simulation: SQLAlchemy models for PostgreSQL, default **SQLite file** `data/sim.db`. All vendor ports mock.

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

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
