"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { api } from "@/lib/api";
import { DEMO_PERSONAS, MOCK_TENANT_LIST, MOCK_TENANTS, OTP_CODE, type DemoPersonaRole } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { setToken } from "@/lib/session";
import { Err, signInError } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

export function StudentLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState(exam.phones.student);
  const [email, setEmail] = useState(exam.emails.student);
  const [ws, setWs] = useState(exam.workspaceId);
  const [selectedRole, setSelectedRole] = useState<DemoPersonaRole>("student");
  const [customWs, setCustomWs] = useState(false);
  const [digits, setDigits] = useState<string[]>(() => OTP_CODE.split(""));
  const [mode, setMode] = useState<"otp" | "magic">("otp");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const boxes = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => {
        if ((me as { role?: string }).role === "student") router.replace(catalogRoute("student-dash"));
      })
      .catch(() => undefined);
  }, [router]);

  const activeTenant = MOCK_TENANT_LIST.find((t) => t.workspaceId === ws);
  const isCustomWorkspace = customWs || !activeTenant;
  const activePersona = DEMO_PERSONAS.find((p) => {
    const tenantForMatch = activeTenant ?? exam;
    return tenantForMatch.phones[p.phoneKey] === phone && p.role === selectedRole;
  });

  function handlePersonaSelect(personaId: string) {
    if (personaId === "__custom__") return;
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    const targetTenant = activeTenant ?? exam;
    setSelectedRole(persona.role);
    setPhone(targetTenant.phones[persona.phoneKey]);
    setEmail(targetTenant.emails[persona.phoneKey]);
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
        setPhone(nextTenant.phones[matchedPersona.phoneKey]);
        setEmail(nextTenant.emails[matchedPersona.phoneKey]);
      }
    }
  }

  function destinationForRole(role: DemoPersonaRole): string {
    if (role === "owner") return catalogRoute("owner");
    if (role === "teacher" || role === "assistant") return catalogRoute("teacher-dash");
    if (role === "parent") return catalogRoute("parent-home");
    return catalogRoute("student-dash");
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
          body: JSON.stringify({ email, workspace_id: ws, role: selectedRole }),
        })) as { token: string };
        setToken(ver.token);
        router.replace(destinationForRole(selectedRole));
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
          role: selectedRole,
          challenge_id: start.challenge_id,
        }),
      })) as { token: string };
      setToken(ver.token);
      router.replace(destinationForRole(selectedRole));
    } catch (err) {
      setError(signInError(err));
    } finally {
      setBusy(false);
    }
  }

  const masked = phone.length > 6
    ? `${phone.slice(0, 4)} ${"•".repeat(Math.max(2, phone.length - 7))} ${phone.slice(-3)}`
    : phone;

  return (
    <form className="login-gate" onSubmit={onSubmit}>
      <span className="av av--lg" style={{ background: "var(--accent)", borderRadius: 16 }}>
        T
      </span>
      <h2>
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
      <label className="field">
        <span>Demo Persona Quick-Select</span>
        <select
          className="field__in"
          value={activePersona?.id ?? "__custom__"}
          onChange={(ev) => handlePersonaSelect(ev.target.value)}
        >
          {DEMO_PERSONAS.map((p) => {
            const tenantPhone = (activeTenant ?? exam).phones[p.phoneKey];
            return (
              <option key={p.id} value={p.id}>
                {`${p.roleTitle} — ${p.name} (${tenantPhone})`}
              </option>
            );
          })}
          <option value="__custom__">Custom phone / email...</option>
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
      </label>
      {mode === "otp" ? (
        <>
          <label className="field">
            <span>Phone</span>
            <input className="field__in" value={phone} autoComplete="tel" onChange={(ev) => setPhone(ev.target.value)} />
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
        </>
      ) : (
        <label className="field">
          <span>Email</span>
          <input className="field__in" value={email} autoComplete="email" onChange={(ev) => setEmail(ev.target.value)} />
        </label>
      )}
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy} aria-busy={busy}>
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
