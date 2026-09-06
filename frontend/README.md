# TutorOS frontend

Next.js 15 App Router. **One route per existing catalog screen id** (`catalog/screens.json`). Screens are `wired` against FastAPI `/api/v1`. Product home (`/`) redirects to `/app/student/router`. Operator jump list: `/operator` (not a catalog id). Demo HTML remains visual gold.

```bash
cd frontend
npm install
npm run dev
```

API default: `http://127.0.0.1:8000` (`NEXT_PUBLIC_API_BASE`). Auth stub OTP is `000000`. Exam-prep navigation omits `staff-login`.

```bash
npm run check-routes
```

Do not add a 48th screen. Biology / NEET is not a product route.
