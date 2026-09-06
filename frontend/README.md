# TutorOS frontend

Next.js 15 App Router. **One route per existing catalog screen id** (`catalog/screens.json`). Demo HTML remains UI gold until a screen is `wired`.

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
