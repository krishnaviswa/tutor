"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";
import { MOCK_TENANTS, OTP_CODE } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { getToken, setToken } from "@/lib/session";
import { Err } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

export function StudentLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState(exam.phones.student);
  const [email, setEmail] = useState(exam.emails.student);
  const [ws, setWs] = useState(exam.workspaceId);
  const [digits, setDigits] = useState<string[]>(() => OTP_CODE.split(""));
  const [mode, setMode] = useState<"otp" | "magic">("otp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!getToken()) return;
    api("/api/v1/auth/me")
      .then((me) => {
        if ((me as { role?: string }).role === "student") router.replace(catalogRoute("student-dash"));
      })
      .catch(() => undefined);
  }, [router]);

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
    if (e.key === "Backspace" && !digits[index] && index > 0) boxes.current[index - 1]?.focus();
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
    setBusy(true);
    try {
      if (mode === "magic") {
        const ver = (await api("/api/v1/auth/magic-link", {
          method: "POST",
          body: JSON.stringify({ email, workspace_id: ws, role: "student" }),
        })) as { token: string };
        setToken(ver.token);
        router.replace(catalogRoute("student-dash"));
        return;
      }
      const code = digits.join("");
      if (code.length !== 6) {
        setError("Enter the 6-digit code.");
        setBusy(false);
        return;
      }
      const start = (await api("/api/v1/auth/otp/start", {
        method: "POST",
        body: JSON.stringify({ phone, workspace_id: ws }),
      })) as { challenge_id: string };
      const ver = (await api("/api/v1/auth/otp/verify", {
        method: "POST",
        body: JSON.stringify({
          phone,
          code,
          workspace_id: ws,
          role: "student",
          challenge_id: start.challenge_id,
        }),
      })) as { token: string };
      setToken(ver.token);
      router.replace(catalogRoute("student-dash"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const masked = phone.length > 6
    ? `${phone.slice(0, 4)} ${"•".repeat(Math.max(2, phone.length - 7))} ${phone.slice(-3)}`
    : phone;

  return (
    <form className="login-gate tint-accent" onSubmit={onSubmit}>
      <span className="av av--lg" style={{ background: "var(--accent)", borderRadius: 12 }}>
        T
      </span>
      <h2 style={{ fontSize: "1.25rem", margin: "16px 0 6px" }}>
        {mode === "magic" ? "Magic link" : "Enter the 6-digit code"}
      </h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Sent to {masked}. Mock code {OTP_CODE}. Magic link is the same stub JWT.
      </p>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip${mode === "otp" ? " on" : ""}`} onClick={() => setMode("otp")}>
          Phone OTP
        </button>
        <button type="button" className={`chip${mode === "magic" ? " on" : ""}`} onClick={() => setMode("magic")}>
          Magic link
        </button>
      </div>
      {mode === "otp" ? (
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
      ) : (
        <label className="field">
          <span>Email</span>
          <input className="field__in" value={email} autoComplete="email" onChange={(ev) => setEmail(ev.target.value)} />
        </label>
      )}
      {mode === "otp" ? (
      <label className="field">
        <span>Phone</span>
        <input className="field__in" value={phone} autoComplete="tel" onChange={(ev) => setPhone(ev.target.value)} />
      </label>
      ) : null}
      <label className="field">
        <span>Workspace</span>
        <input
          className="field__in"
          value={ws}
          onChange={(ev) => setWs(ev.target.value)}
          style={{ fontFamily: "var(--mono)", fontSize: ".78rem" }}
        />
      </label>
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Verifying" : mode === "magic" ? "Send magic link" : "Verify"}
      </button>
      <div className="card card--wash" style={{ marginTop: 22 }}>
        <div className="k" style={{ marginBottom: 4 }}>One identity</div>
        <p className="muted">
          Sessions, practice, doubts, reports and fees thread to this number.
        </p>
      </div>
    </form>
  );
}
