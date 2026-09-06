"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE, api, setToken, token } from "@/lib/api";
import { CATALOG_SCREENS, EXAM_PREP_HIDE } from "@/lib/screens";
import {
  ALL_OTP_ROLES,
  MOCK_TENANTS,
  OTP_CODE,
  ROLE_LOGIN,
  type TenantKey,
} from "@/lib/mocks";

type Props = { id: string; title: string; role: string; route: string };

export function ScreenShell({ id, title, role, route }: Props) {
  const [tenantKey, setTenantKey] = useState<TenantKey>("exam-prep");
  const tenant = MOCK_TENANTS[tenantKey];
  const login = ROLE_LOGIN[role] ?? ROLE_LOGIN.student;
  const [out, setOut] = useState<string>("");
  const [phone, setPhone] = useState(tenant.phones[login.phone]);
  const [workspace, setWorkspace] = useState(tenant.workspaceId);
  const [kind, setKind] = useState(tenant.kind);
  const [sessionId, setSessionId] = useState(tenant.sessionId);
  const [studentId, setStudentId] = useState(tenant.studentId);
  const [joinToken, setJoinToken] = useState("");
  const [videoUrl, setVideoUrl] = useState("mock://meet/" + tenant.sessionId);
  const [payload, setPayload] = useState("{}");
  const [signed, setSigned] = useState("not signed in");

  useEffect(() => {
    setPhone(tenant.phones[login.phone]);
    setWorkspace(tenant.workspaceId);
    setKind(tenant.kind);
    setSessionId(tenant.sessionId);
    setStudentId(tenant.studentId);
    setJoinToken("");
    setVideoUrl("mock://meet/" + tenant.sessionId);
  }, [tenant, login.phone]);

  useEffect(() => {
    if (!token()) {
      setSigned("not signed in");
      return;
    }
    setSigned("token in this browser");
    api("/api/v1/auth/me")
      .then((me) => {
        const row = me as { role?: string; workspace_id?: string };
        setSigned(`${row.role ?? "?"} · ${row.workspace_id ?? ""}`);
      })
      .catch(() => setSigned("token present but /auth/me failed — sign in again"));
    api("/api/v1/workspaces/current")
      .then((w) => {
        const row = w as { kind?: string };
        if (row.kind) setKind(row.kind);
      })
      .catch(() => undefined);
  }, []);

  const hideStaff = kind === "exam-prep" && EXAM_PREP_HIDE.has("staff-login");
  const nav = useMemo(
    () => CATALOG_SCREENS.filter((s) => !(hideStaff && s.id === "staff-login")),
    [hideStaff],
  );

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
        code: OTP_CODE,
        workspace_id: workspace,
        role: roleName,
        challenge_id: start.challenge_id,
      }),
    })) as { token: string; role?: string };
    setToken(ver.token);
    setSigned(`${roleName} · ${workspace}`);
    return ver;
  }

  return (
    <main className={`frame frame-${role}`}>
      <header>
        <p className="eyebrow">{id} · {role} · shell</p>
        <h1>{title}</h1>
        <p className="lede">
          Demo HTML stays UI gold. This route is the catalog shell against <code>{API_BASE}</code>.
          Sign in here — you do not need to go back to router or staff-login.
          Exam-prep faculty uses teacher OTP on this page.
        </p>
        <dl className="mocks">
          <div><dt>This screen</dt><dd>{route}</dd></div>
          <div><dt>API</dt><dd>{API_BASE}</dd></div>
          <div><dt>OTP</dt><dd>{OTP_CODE}</dd></div>
          <div><dt>Signed in</dt><dd>{signed}</dd></div>
          <div><dt>Workspace</dt><dd>{workspace}</dd></div>
          <div><dt>Session</dt><dd>{sessionId}</dd></div>
          <div><dt>Student</dt><dd>{studentId}</dd></div>
          <div><dt>Cohort</dt><dd>{tenant.cohortId}</dd></div>
          <div><dt>This-role phone</dt><dd>{tenant.phones[login.phone]}</dd></div>
          <div><dt>This-role email</dt><dd>{tenant.emails[login.phone]}</dd></div>
          <div><dt>Join token</dt><dd>{joinToken || "(attach mock video link first)"}</dd></div>
          <div><dt>Mock video URL</dt><dd>{videoUrl}</dd></div>
        </dl>
      </header>
      <nav className="catalog-nav" aria-label="All catalog screens">
        {nav.map((s) => (
          <a key={s.id} href={s.route} aria-current={s.id === id ? "page" : undefined}>
            {s.id}
          </a>
        ))}
      </nav>
      <section className="login-strip">
        <h2>Mock login</h2>
        <label>
          Tenant
          <select
            value={tenantKey}
            onChange={(e) => setTenantKey(e.target.value as TenantKey)}
          >
            {Object.values(MOCK_TENANTS).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label} ({t.kind})
              </option>
            ))}
          </select>
        </label>
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Workspace id
          <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
        </label>
        <p className="phones">
          owner {tenant.phones.owner} · teacher {tenant.phones.teacher} · assistant {tenant.phones.assistant} ·
          student {tenant.phones.student} · parent {tenant.phones.parent}
        </p>
        <button
          type="button"
          onClick={() =>
            run(`otp ${login.apiRole} (this screen)`, () =>
              otp(login.apiRole, phone || tenant.phones[login.phone]),
            )
          }
        >
          OTP {OTP_CODE} as {login.apiRole} for this screen
        </button>
        <div className="otp-row">
          {ALL_OTP_ROLES.map((r) => (
            <button
              key={r.apiRole}
              type="button"
              onClick={() =>
                run(`otp ${r.label}`, () => {
                  setPhone(tenant.phones[r.phone]);
                  return otp(r.apiRole, tenant.phones[r.phone]);
                })
              }
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => run("me", () => api("/api/v1/auth/me"))}>
          GET /auth/me
        </button>
        <button
          type="button"
          onClick={() =>
            run(`magic-link ${login.apiRole}`, () =>
              api("/api/v1/auth/magic-link", {
                method: "POST",
                body: JSON.stringify({
                  email: tenant.emails[login.phone],
                  workspace_id: workspace,
                  role: login.apiRole,
                }),
              }).then((row) => {
                const ver = row as { token: string };
                if (ver.token) setToken(ver.token);
                setSigned(`${login.apiRole} · ${workspace} (magic)`);
                return row;
              }),
            )
          }
        >
          Magic link as {login.apiRole} ({tenant.emails[login.phone]})
        </button>
      </section>
      <section>
        <h2>This screen vs API</h2>
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
                }),
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
              onClick={() =>
                run("video-link", async () => {
                  const row = (await api(`/api/v1/sessions/${sessionId}/video-link`, {
                    method: "POST",
                  })) as { join_token?: string; video_url?: string };
                  if (row.join_token) setJoinToken(row.join_token);
                  if (row.video_url) setVideoUrl(row.video_url);
                  return row;
                })
              }
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
        {id === "join" || id === "live-student" ? (
          <>
            <button
              type="button"
              onClick={() => run("join preview", () => api(`/api/v1/join/${joinToken}`))}
            >
              GET join by token
            </button>
            <button
              type="button"
              onClick={() =>
                run("enter join", () => api(`/api/v1/join/${joinToken}/enter`, { method: "POST" }))
              }
            >
              Enter waiting room (student OTP first)
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
          <button
            type="button"
            onClick={() => run("timeline", () => api(`/api/v1/students/${studentId}/timeline`))}
          >
            Student timeline
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
