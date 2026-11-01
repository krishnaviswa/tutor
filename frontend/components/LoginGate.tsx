"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ClipboardEvent,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { DEMO_PERSONAS, MOCK_TENANT_LIST, MOCK_TENANTS, OTP_CODE, type DemoPersonaRole } from "@/lib/mocks";
import { clearToken, getToken, setToken } from "@/lib/session";

const exam = MOCK_TENANTS["exam-prep"];

export type LoginGateProps = {
  children: ReactNode;
  /** Seed teacher phone. Exam-prep faculty uses teacher OTP, not staff-login. */
  phone?: string;
  workspaceId?: string;
  /** API role sent to /auth/otp/verify. Default teacher. */
  role?: DemoPersonaRole;
  /** Who may pass with an existing JWT. Defaults to ACCEPT[role]. Dual-role catalog ids. */
  accept?: string[];
};

const ACCEPT: Record<DemoPersonaRole, string[]> = {
  teacher: ["teacher", "owner", "assistant"],
  owner: ["owner", "assistant"],
  assistant: ["assistant", "owner"],
  student: ["student"],
  parent: ["parent"],
};

export function LoginGate({
  children,
  phone = exam.phones.teacher,
  workspaceId = exam.workspaceId,
  role = "teacher",
  accept,
}: LoginGateProps) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [phoneValue, setPhoneValue] = useState(phone);
  const [ws, setWs] = useState(workspaceId);
  const [selectedRole, setSelectedRole] = useState<DemoPersonaRole>(role);
  const [customWs, setCustomWs] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => OTP_CODE.split(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState(role === "owner" ? "vikram" : role === "assistant" ? "rohan" : role === "student" ? "aarav" : role === "parent" ? "rajesh" : "sudhakshina");
  const [password, setPassword] = useState("TutorDemo1");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  const allowedRoles = accept ?? ACCEPT[role];
  const allowedKey = allowedRoles.join(",");

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!getToken()) {
        if (!cancelled) {
          setAuthed(false);
          setReady(true);
        }
        return;
      }
      try {
        const me = (await api("/api/v1/auth/me")) as { role?: string };
        const allowed = allowedKey.split(",");
        const ok = Boolean(me.role && allowed.includes(me.role));
        if (!ok) clearToken();
        if (!cancelled) setAuthed(ok);
      } catch {
        clearToken();
        if (!cancelled) setAuthed(false);
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [role, allowedKey]);

  useEffect(() => {
    setPhoneValue(phone);
  }, [phone]);

  useEffect(() => {
    setWs(workspaceId);
  }, [workspaceId]);

  useEffect(() => {
    setSelectedRole(role);
  }, [role]);

  if (!ready) {
    return <div className="login-gate" aria-busy="true" />;
  }
  if (authed) return <>{children}</>;

  const activeTenant = MOCK_TENANT_LIST.find((t) => t.workspaceId === ws);
  const isCustomWorkspace = customWs || !activeTenant;
  const activePersona = DEMO_PERSONAS.find((p) => {
    const tenantForMatch = activeTenant ?? exam;
    return tenantForMatch.phones[p.phoneKey] === phoneValue && p.role === selectedRole;
  });

  function handlePersonaSelect(personaId: string) {
    if (personaId === "__custom__") return;
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    const targetTenant = activeTenant ?? exam;
    setSelectedRole(persona.role);
    setPhoneValue(targetTenant.phones[persona.phoneKey]);
    if (!activeTenant) {
      setCustomWs(false);
      setWs(exam.workspaceId);
    }
    setDigits(OTP_CODE.split(""));
  }

  function handleWorkspaceSelect(value: string) {
    if (value === "__custom__") {
      setCustomWs(true);
      return;
    }
    setCustomWs(false);
    setWs(value);
    const nextTenant = MOCK_TENANT_LIST.find((t) => t.workspaceId === value);
    if (nextTenant) {
      const matchedPersona = DEMO_PERSONAS.find((p) => p.role === selectedRole);
      if (matchedPersona) {
        setPhoneValue(nextTenant.phones[matchedPersona.phoneKey]);
      }
    }
  }

  function setDigitAt(index: number, raw: string) {
    const ch = raw.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = ch;
      return next;
    });
    if (ch && index < 5) boxes.current[index + 1]?.focus();
  }

  function onKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      boxes.current[index - 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length < 2) return;
    e.preventDefault();
    const next = OTP_CODE.split("").map((_, i) => text[i] ?? "");
    setDigits(next);
    boxes.current[Math.min(text.length, 5)]?.focus();
  }

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const ver = (await api("/api/v1/auth/password", {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password, workspace_id: ws }),
      })) as { token: string; role?: string };
      if (ver.role && !allowedRoles.includes(ver.role)) {
        setError("That account is a different role. Open the matching sign-in.");
        return;
      }
      setToken(ver.token);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const code = digits.join("");
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      const start = (await api("/api/v1/auth/otp/start", {
        method: "POST",
        body: JSON.stringify({ phone: phoneValue, workspace_id: ws }),
      })) as { challenge_id: string };
      const ver = (await api("/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          phone: phoneValue,
          code,
          workspace_id: ws,
          role: selectedRole,
          challenge_id: start.challenge_id,
        }),
      })) as { token: string };
      setToken(ver.token);
      setAuthed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const masked = phoneValue.length > 6
    ? `${phoneValue.slice(0, 4)} ${"•".repeat(Math.max(2, phoneValue.length - 7))} ${phoneValue.slice(-3)}`
    : phoneValue;

  return (
    <div className="login-gate tint-sky">
      <span className="av av--lg" style={{ background: "var(--accent)", borderRadius: 12 }}>
        T
      </span>
      <h2 style={{ fontSize: "1.25rem", margin: "16px 0 6px" }}>Sign in</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Use your username and password. The workspace owner decides which teaching tools you see.
      </p>
      <form onSubmit={onPassword}>
        <label className="field">
          <span>Username</span>
          <input className="field__in" value={username} autoComplete="username" onChange={(ev) => setUsername(ev.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="field__in" type="password" value={password} autoComplete="current-password" onChange={(ev) => setPassword(ev.target.value)} />
        </label>
        <label className="field">
          <span>Workspace</span>
          <select className="field__in" value={isCustomWorkspace ? "__custom__" : ws} onChange={(ev) => handleWorkspaceSelect(ev.target.value)}>
            {MOCK_TENANT_LIST.map((t) => (
              <option key={t.key} value={t.workspaceId}>
                {t.label}
              </option>
            ))}
            <option value="__custom__">Other workspace</option>
          </select>
        </label>
        <button className="btn btn--dark" type="submit" disabled={busy} style={{ width: "100%", marginTop: 8 }}>
          {busy ? "Signing in" : "Sign in"}
        </button>
      </form>
      {error ? <p className="muted" style={{ color: "var(--bad, #b42318)" }}>{error}</p> : null}
      <details style={{ marginTop: 16 }}>
        <summary className="muted">Local demo code</summary>
      <form onSubmit={onSubmit}>
      <p className="muted" style={{ margin: "12px 0" }}>
        One-time code for a local review. The code is {OTP_CODE}. Sent to {masked}.
      </p>
      <label className="field">
        <span>Local demo account</span>
        <select
          className="field__in"
          value={activePersona?.id ?? "__custom__"}
          onChange={(ev) => handlePersonaSelect(ev.target.value)}
        >
          {DEMO_PERSONAS.map((p) => {
            const text = `${p.roleTitle} — ${p.name}`;
            return (
              <option key={p.id} value={p.id}>
                {text}
              </option>
            );
          })}
          <option value="__custom__">Custom phone number...</option>
        </select>
      </label>
      <label className="field">
        <span>Workspace</span>
        <select
          className="field__in"
          value={isCustomWorkspace ? "__custom__" : ws}
          onChange={(ev) => handleWorkspaceSelect(ev.target.value)}
        >
          {MOCK_TENANT_LIST.map((t) => (
            <option key={t.key} value={t.workspaceId}>
              {t.label}
            </option>
          ))}
          <option value="__custom__">Other workspace ID...</option>
        </select>
        {isCustomWorkspace ? (
          <input
            className="field__in"
            value={ws}
            placeholder="Workspace UUID"
            onChange={(ev) => setWs(ev.target.value)}
            style={{ fontFamily: "var(--mono)", fontSize: ".78rem", marginTop: 8 }}
          />
        ) : null}
        <em>{activeTenant ? `${activeTenant.label} · role ${selectedRole}` : `Custom workspace · role ${selectedRole}`}</em>
      </label>
      <label className="field">
        <span>Phone</span>
        <input
          className="field__in"
          value={phoneValue}
          autoComplete="tel"
          onChange={(ev) => setPhoneValue(ev.target.value)}
        />
      </label>
      <div className="row" style={{ gap: 8, flexWrap: "nowrap", marginBottom: 14 }}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            className={`otp-d${d ? " is-filled" : ""}`}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            value={d}
            onChange={(ev) => setDigitAt(i, ev.target.value)}
            onKeyDown={(ev) => onKeyDown(i, ev)}
            onPaste={i === 0 ? onPaste : undefined}
          />
        ))}
      </div>
      {error ? (
        <p className="muted" style={{ color: "var(--crimson)", marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Verifying" : "Verify & Continue"}
      </button>
    </form>
      </details>
    </div>
  );
}
