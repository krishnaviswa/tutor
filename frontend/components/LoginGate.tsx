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
import { MOCK_TENANTS, OTP_CODE } from "@/lib/mocks";
import { clearToken, getToken, setToken } from "@/lib/session";

const exam = MOCK_TENANTS["exam-prep"];

export type LoginGateProps = {
  children: ReactNode;
  /** Seed teacher phone. Exam-prep faculty uses teacher OTP, not staff-login. */
  phone?: string;
  workspaceId?: string;
  /** API role sent to /auth/otp/verify. Default teacher. */
  role?: "teacher" | "owner" | "assistant" | "student" | "parent";
  /** Who may pass with an existing JWT. Defaults to ACCEPT[role]. Dual-role catalog ids. */
  accept?: string[];
};

const ACCEPT: Record<NonNullable<LoginGateProps["role"]>, string[]> = {
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
  const [digits, setDigits] = useState<string[]>(() => OTP_CODE.split(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  if (!ready) {
    return <div className="login-gate" aria-busy="true" />;
  }
  if (authed) return <>{children}</>;

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
          role,
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
    <form className="login-gate tint-sky" onSubmit={onSubmit}>
      <span className="av av--lg" style={{ background: "var(--accent)", borderRadius: 12 }}>
        T
      </span>
      <h2 style={{ fontSize: "1.25rem", margin: "16px 0 6px" }}>Enter the 6-digit code</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Sent to {masked}. Mock code {OTP_CODE}. Faculty signs in here — not via staff-login.
      </p>
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
      <label className="field">
        <span>Phone</span>
        <input
          className="field__in"
          value={phoneValue}
          autoComplete="tel"
          onChange={(ev) => setPhoneValue(ev.target.value)}
        />
      </label>
      <label className="field">
        <span>Workspace</span>
        <input
          className="field__in"
          value={ws}
          onChange={(ev) => setWs(ev.target.value)}
          style={{ fontFamily: "var(--mono)", fontSize: ".78rem" }}
        />
        <em>Exam-prep seed · role {role}</em>
      </label>
      {error ? (
        <p className="muted" style={{ color: "var(--crimson)", marginBottom: 12 }}>
          {error}
        </p>
      ) : null}
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Verifying" : "Verify"}
      </button>
      <div className="card card--wash" style={{ marginTop: 22 }}>
        <div className="k" style={{ marginBottom: 4 }}>One identity</div>
        <p className="muted">
          Sessions, practice, doubts and records thread to this number. The JWT stays in this browser.
        </p>
      </div>
    </form>
  );
}
