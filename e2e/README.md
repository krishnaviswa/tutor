# TutorOS Playwright

End-to-end UI tests for the Next.js app. They talk to the running FastAPI at `/api/v1`. Product dependencies stay in `frontend/`. This folder has its own `package.json`.

## What you need running

From the repo root, as in `README.md` §1:

```powershell
docker compose up -d postgres
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

In another shell:

```powershell
cd frontend
npm run dev
```

Frontend default: `http://127.0.0.1:3000`. API default: `http://127.0.0.1:8000`.

`playwright.config.ts` reuses those servers when the URLs already respond. If they are down, Playwright starts `uvicorn` and `npm run dev` itself. Postgres must already be up and seeded (`python -m app.seed_cli` runs on API startup via `seed_all` when the process boots fresh). Do not point the API at SQLite.

## Credentials

Copy `e2e/.env.example` to `e2e/.env`. The example values are the **published local demo seed** (OTP stub, demo password, exam-prep phones and usernames). They are already in `backend/app/services/seed.py` and `frontend/lib/mocks.ts`. They are not production secrets. Do not commit `e2e/.env`. Shell variables override the file.

There is no mailbox. OTP is the mock code in `E2E_OTP_CODE`. Magic link returns a token immediately (mock email port).

## Commands

From the repo root:

```powershell
npm run e2e:smoke
npm run e2e:flows
npm run e2e
npm run e2e:report
```

From this folder, after `npm install` and `npx playwright install chromium`:

```powershell
npx playwright test
npx playwright test --grep @smoke
npx playwright test --grep @flow
npx playwright show-report playwright-report
```

`@smoke` is login, one journey per role, and sign-out. `@flow` is enrollment, scheduling, attendance, payment, admin enquiry, and permission checks. Workers are 1 because every test shares one seeded database.

## Output

HTML report: `e2e/playwright-report/`. Traces, screenshots, video: `e2e/test-results/`. Both are gitignored.

## Intended behavior

Catalog ids and demo gold win when they disagree with the wired UI. A failing test is an app defect unless the locator was wrong. This suite does not patch `frontend/` or `backend/` to go green.

See `docs/e2e/test-plan.md` and `docs/e2e/application-flow-map.md`.
