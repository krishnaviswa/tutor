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

`npm test` (and the root `npm run e2e*` scripts) run only the original suite, project `chromium`. A bare `npx playwright test` now runs every project.

## Chain suite

Chains are user workflows, listed with ids in `chain-map.json` (S = one role, X = across roles). The map also records the files each chain touches and any known product gap.

```powershell
npm run test:chains                       # setup + every built chain
npm run test:layout                       # setup + layout check on every page route
npx playwright test --project=chains --grep @X02
npx playwright test --project=chains --grep "@role:parent"
npm run impact -- origin/main             # chains touched by a diff
```

- `tests/setup/` signs each role in once through the real sign-in screens and saves `.auth/<role>.json` (gitignored).
- `tests/chains/` one spec per chain. Cross-role specs open a separate browser per role.
- `tests/layout/` opens every page route at 375, 768, 1280 px and reports overlap, clipping, horizontal scroll, and off-screen controls. `LAYOUT_STRICT=1` makes findings fail.
- `E2E_ROUTE_GUARD=1` fails the run if a page route was never opened (`/operator` is excluded).
- `test-results/summary.md` is the per-chain summary. In GitHub Actions it is also the job summary.
- `E2E_BROWSER_CHANNEL=chrome` runs on the installed Chrome when Playwright's own Chromium for this version is not downloaded. CI does not set it.

CI: `.github/workflows/e2e-chains.yml`, manual (`workflow_dispatch`) only. It builds a throwaway Postgres + API + production web build on the runner. See `docs/e2e/test-plan.md` → “Chain suite”.

## Output

HTML report: `e2e/playwright-report/`. Traces, screenshots, video: `e2e/test-results/`. Both are gitignored.

## Intended behavior

Catalog ids and demo gold win when they disagree with the wired UI. A failing test is an app defect unless the locator was wrong. This suite does not patch `frontend/` or `backend/` to go green.

See `docs/e2e/test-plan.md` and `docs/e2e/application-flow-map.md`.
