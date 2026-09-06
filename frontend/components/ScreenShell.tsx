"use client";

import { useEffect, useState } from "react";
import { api, setToken, token } from "@/lib/api";
import { EXAM_PREP_HIDE } from "@/lib/screens";

type Props = { id: string; title: string; role: string; route: string };

const STAFF_SCREENS = [
  ["wsetup", "/app/admin/wsetup"],
  ["roster", "/app/admin/roster"],
  ["cohort-builder", "/app/faculty/cohort-builder"],
  ["schedule", "/app/faculty/schedule"],
  ["record", "/app/faculty/record"],
  ["owner", "/app/admin"],
];

export function ScreenShell({ id, title, role, route }: Props) {
  const [out, setOut] = useState<string>("");
  const [phone, setPhone] = useState("+9101t");
  const [workspace, setWorkspace] = useState("aaaaaaaa-0001-4000-8000-000000000001");
  const [kind, setKind] = useState("exam-prep");
  const [sessionId, setSessionId] = useState("");
  const [payload, setPayload] = useState("{}");

  useEffect(() => {
    if (!token()) return;
    api("/api/v1/workspaces/current")
      .then((w) => {
        const row = w as { kind?: string };
        if (row.kind) setKind(row.kind);
      })
      .catch(() => undefined);
  }, []);

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      const data = await fn();
      setOut(`${label}\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      setOut(`${label}\n${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function otp(roleName: string, phoneValue: string) {
    const start = (await api("/api/v1/auth/otp/start", {
      method: "POST",
      body: JSON.stringify({ phone: phoneValue, workspace_id: workspace }),
    })) as { challenge_id: string };
    const ver = (await api("/api/v1/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({
        phone: phoneValue,
        code: "000000",
        workspace_id: workspace,
        role: roleName,
        challenge_id: start.challenge_id,
      }),
    })) as { token: string };
    setToken(ver.token);
    return ver;
  }

  const hideStaff = kind === "exam-prep" && EXAM_PREP_HIDE.has("staff-login");

  return (
    <main className={`frame frame-${role}`}>
      <header>
        <p className="eyebrow">{id} · {role} · shell</p>
        <h1>{title}</h1>
        <p className="lede">Demo HTML stays UI gold. This route is the catalog shell against `/api/v1`.</p>
      </header>
      <nav>
        <a href="/app/student/router">router</a>
        <a href="/app/student/student-login">student-login</a>
        {hideStaff ? null : <a href="/app/faculty/staff-login">staff-login</a>}
        {STAFF_SCREENS.map(([sid, href]) => (
          <a key={sid} href={href}>
            {sid}
          </a>
        ))}
      </nav>
      <section>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Workspace
          <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
        </label>
        {id === "student-login" || id === "router" ? (
          <button type="button" onClick={() => run("otp student", () => otp("student", phone || "+9101s"))}>
            OTP 000000 as student
          </button>
        ) : null}
        {id === "staff-login" || id === "router" ? (
          <button type="button" onClick={() => run("otp teacher", () => otp("teacher", phone || "+9101t"))}>
            OTP 000000 as teacher
          </button>
        ) : null}
        {id === "router" ? (
          <button type="button" onClick={() => run("me", () => api(" /api/v1/auth/me".trim()))}>
            GET /auth/me
          </button>
        ) : null}
        {id === "wsetup" ? (
          <button type="button" onClick={() => run("workspace", () => api("/api/v1/workspaces/current"))}>
            Current workspace
          </button>
        ) : null}
        {id === "branding" ? (
          <button
            type="button"
            onClick={() =>
              run("branding", () =>
                api("/api/v1/workspaces/current/branding", {
                  method: "PATCH",
                  body: JSON.stringify({ tagline: "TutorOS" }),
                })
              )
            }
          >
            PATCH branding
          </button>
        ) : null}
        {id === "roster" ? (
          <button type="button" onClick={() => run("students", () => api("/api/v1/students"))}>
            List students
          </button>
        ) : null}
        {id === "cohort-builder" ? (
          <button type="button" onClick={() => run("cohorts", () => api("/api/v1/cohorts"))}>
            List cohorts
          </button>
        ) : null}
        {id === "parent-link" || id === "parent-home" ? (
          <button type="button" onClick={() => run("parent home", () => api("/api/v1/parent/home"))}>
            Parent home
          </button>
        ) : null}
        {id === "schedule" || id === "session-pre" || id === "record" || id === "join" || id === "live-teacher" || id === "live-student" || id === "session-video" ? (
          <>
            <button
              type="button"
              onClick={() =>
                run("sessions", async () => {
                  const rows = (await api("/api/v1/sessions")) as { id: string }[];
                  if (rows[0]) setSessionId(rows[0].id);
                  return rows;
                })
              }
            >
              List sessions
            </button>
            <button
              type="button"
              onClick={() => run("video-link", () => api(`/api/v1/sessions/${sessionId}/video-link`, { method: "POST" }))}
            >
              Attach mock video link
            </button>
            <button type="button" onClick={() => run("live", () => api(`/api/v1/sessions/${sessionId}/live`))}>
              Live
            </button>
            <button type="button" onClick={() => run("video", () => api(`/api/v1/sessions/${sessionId}/video`))}>
              Recording (transcript empty)
            </button>
          </>
        ) : null}
        {id === "library" || id === "lesson" ? (
          <button type="button" onClick={() => run("content", () => api("/api/v1/content"))}>
            Library
          </button>
        ) : null}
        {id === "assign-issue" || id === "assign-grade" ? (
          <button type="button" onClick={() => run("assignments", () => api("/api/v1/assignments"))}>
            Assignments
          </button>
        ) : null}
        {id === "qbank" ? (
          <button type="button" onClick={() => run("questions", () => api("/api/v1/questions"))}>
            Question bank
          </button>
        ) : null}
        {["practice-build", "practice-play", "practice-result"].includes(id) ? (
          <button type="button" onClick={() => run("practice-sets", () => api("/api/v1/practice-sets"))}>
            Practice sets
          </button>
        ) : null}
        {["test-setup", "test-runner", "analysis"].includes(id) ? (
          <button type="button" onClick={() => run("tests", () => api("/api/v1/tests"))}>
            Tests
          </button>
        ) : null}
        {id === "doubt-student" ? (
          <button type="button" onClick={() => run("doubts", () => api("/api/v1/doubts"))}>
            My doubts
          </button>
        ) : null}
        {id === "doubt-teacher" ? (
          <button type="button" onClick={() => run("queue", () => api("/api/v1/doubts/queue"))}>
            Doubts queue
          </button>
        ) : null}
        {id === "messages" ? (
          <button type="button" onClick={() => run("threads", () => api("/api/v1/threads"))}>
            Threads
          </button>
        ) : null}
        {id === "announce" ? (
          <button type="button" onClick={() => run("announcements", () => api("/api/v1/announcements"))}>
            Announcements
          </button>
        ) : null}
        {id === "timeline" ? (
          <button type="button" onClick={() => run("me", () => api("/api/v1/auth/me"))}>
            Sign-in then open a student timeline from roster
          </button>
        ) : null}
        {id === "notif-prefs" ? (
          <button type="button" onClick={() => run("prefs", () => api("/api/v1/notifications/prefs"))}>
            Notification prefs
          </button>
        ) : null}
        {id === "student-dash" ? (
          <button type="button" onClick={() => run("dash", () => api("/api/v1/me/dashboard"))}>
            Student dashboard
          </button>
        ) : null}
        {id === "teacher-dash" ? (
          <button type="button" onClick={() => run("dash", () => api("/api/v1/teacher/dashboard"))}>
            Teacher dashboard
          </button>
        ) : null}
        {id === "owner" || id === "subscription" ? (
          <button type="button" onClick={() => run("owner", () => api("/api/v1/owner/console"))}>
            Owner console
          </button>
        ) : null}
        {id === "reports" ? (
          <button type="button" onClick={() => run("export", () => api("/api/v1/reports/export", { method: "POST" }))}>
            Export reports
          </button>
        ) : null}
        {id === "mentor" ? (
          <button type="button" onClick={() => run("backlog", () => api("/api/v1/backlog"))}>
            Backlog
          </button>
        ) : null}
        {id === "billing" ? (
          <button type="button" onClick={() => run("plans", () => api("/api/v1/plans"))}>
            Plans
          </button>
        ) : null}
        {id === "payments" ? (
          <button type="button" onClick={() => run("invoices", () => api("/api/v1/invoices/mine"))}>
            My invoices
          </button>
        ) : null}
        {id === "payouts" ? (
          <button type="button" onClick={() => run("payouts", () => api("/api/v1/payouts"))}>
            Payouts
          </button>
        ) : null}
        {id === "audit" ? (
          <button type="button" onClick={() => run("audit", () => api("/api/v1/audit"))}>
            Audit
          </button>
        ) : null}
        {id === "onboard-kind" || id === "template-gallery" ? (
          <button type="button" onClick={() => run("templates", () => api("/api/v1/templates"))}>
            Templates
          </button>
        ) : null}
        {id === "automation" ? (
          <button type="button" onClick={() => run("rules", () => api("/api/v1/automation-rules"))}>
            Automation
          </button>
        ) : null}
        {id === "integrations" ? (
          <button type="button" onClick={() => run("integrations", () => api("/api/v1/integrations"))}>
            Integrations (mock)
          </button>
        ) : null}
        <label>
          Optional JSON
          <textarea value={payload} onChange={(e) => setPayload(e.target.value)} />
        </label>
      </section>
      <pre>{out || `Catalog route ${route}`}</pre>
    </main>
  );
}
