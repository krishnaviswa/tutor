"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { DEMO_PERSONAS, MOCK_TENANT_LIST, MOCK_TENANTS, OTP_CODE, type DemoPersonaRole } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { getToken, setToken } from "@/lib/session";
import { Err } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

export function StaffLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(exam.emails.teacher);
  const [phone, setPhone] = useState(exam.phones.teacher);
  const [ws, setWs] = useState(exam.workspaceId);
  const [customWs, setCustomWs] = useState(false);
  const [code, setCode] = useState(OTP_CODE);
  const [mode, setMode] = useState<"otp" | "magic">("otp");
  const [staffRole, setStaffRole] = useState<DemoPersonaRole>("teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    api("/api/v1/auth/me")
      .then((me) => {
        const role = (me as { role?: string }).role;
        if (role === "owner") router.replace(catalogRoute("owner"));
        else if (role === "teacher" || role === "assistant") router.replace(catalogRoute("teacher-dash"));
      })
      .catch(() => undefined);
  }, [router]);

  const activeTenant = MOCK_TENANT_LIST.find((t) => t.workspaceId === ws);
  const isCustomWorkspace = customWs || !activeTenant;
  const activePersona = DEMO_PERSONAS.find((p) => {
    const tenantForMatch = activeTenant ?? exam;
    return tenantForMatch.phones[p.phoneKey] === phone && p.role === staffRole;
  });

  function handlePersonaSelect(personaId: string) {
    if (personaId === "__custom__") return;
    const persona = DEMO_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;
    const targetTenant = activeTenant ?? exam;
    setStaffRole(persona.role);
    setPhone(targetTenant.phones[persona.phoneKey]);
    setEmail(targetTenant.emails[persona.phoneKey]);
    if (!activeTenant) {
      setCustomWs(false);
      setWs(exam.workspaceId);
    }
    setCode(OTP_CODE);
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
      const matchedPersona = DEMO_PERSONAS.find((p) => p.role === staffRole);
      if (matchedPersona) {
        setPhone(nextTenant.phones[matchedPersona.phoneKey]);
        setEmail(nextTenant.emails[matchedPersona.phoneKey]);
      }
    }
  }

  function handleRoleChange(nextRole: DemoPersonaRole) {
    setStaffRole(nextRole);
    const targetTenant = activeTenant ?? exam;
    const matchedPersona = DEMO_PERSONAS.find((p) => p.role === nextRole);
    if (matchedPersona) {
      setPhone(targetTenant.phones[matchedPersona.phoneKey]);
      setEmail(targetTenant.emails[matchedPersona.phoneKey]);
    }
  }

  function destinationForRole(role: DemoPersonaRole): string {
    if (role === "owner") return catalogRoute("owner");
    if (role === "student") return catalogRoute("student-dash");
    if (role === "parent") return catalogRoute("parent-home");
    return catalogRoute("teacher-dash");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "magic") {
        const ver = (await api("/api/v1/auth/magic-link", {
          method: "POST",
          body: JSON.stringify({ email, workspace_id: ws, role: staffRole }),
        })) as { token: string; role?: string };
        setToken(ver.token);
      } else {
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
            role: staffRole,
            challenge_id: start.challenge_id,
          }),
        })) as { token: string; role?: string };
        setToken(ver.token);
      }
      router.replace(destinationForRole(staffRole));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-gate" onSubmit={onSubmit}>
      <div className="wm" style={{ marginBottom: 8 }}>
        TutorOS <i>staff</i>
      </div>
      <h2>Staff sign-in</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        OTP {OTP_CODE} or magic link. Exam-prep faculty can skip this screen and OTP on the console.
      </p>
      <label className="field">
        <span>Demo Persona Quick-Select</span>
        <select
          className="field__in"
          value={activePersona?.id ?? "__custom__"}
          onChange={(e) => handlePersonaSelect(e.target.value)}
        >
          {DEMO_PERSONAS.map((p) => {
            const tenantPhone = (activeTenant ?? exam).phones[p.phoneKey];
            return (
              <option key={p.id} value={p.id}>
                {`${p.roleTitle} — ${p.name} (${tenantPhone})`}
              </option>
            );
          })}
          <option value="__custom__">Custom credentials...</option>
        </select>
      </label>
      <label className="field">
        <span>Workspace</span>
        <select
          className="field__in"
          value={isCustomWorkspace ? "__custom__" : ws}
          onChange={(e) => handleWorkspaceSelect(e.target.value)}
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
            onChange={(e) => setWs(e.target.value)}
            style={{ fontFamily: "var(--mono)", fontSize: ".78rem", marginTop: 8 }}
          />
        ) : null}
      </label>
      <label className="field">
        <span>Role</span>
        <select className="field__in" value={staffRole} onChange={(e) => handleRoleChange(e.target.value as DemoPersonaRole)}>
          <option value="teacher">Teacher (Faculty)</option>
          <option value="owner">Owner / Admin</option>
          <option value="assistant">Teaching Assistant</option>
          <option value="student">Student</option>
          <option value="parent">Parent</option>
        </select>
      </label>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip${mode === "otp" ? " on" : ""}`} onClick={() => setMode("otp")}>
          Phone OTP
        </button>
        <button type="button" className={`chip${mode === "magic" ? " on" : ""}`} onClick={() => setMode("magic")}>
          Magic link
        </button>
      </div>
      {mode === "otp" ? (
        <>
          <label className="field">
            <span>Phone</span>
            <input className="field__in" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">
            <span>OTP</span>
            <input className="field__in" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
          </label>
        </>
      ) : (
        <label className="field">
          <span>Work email</span>
          <input className="field__in" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
      )}
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy} aria-busy={busy}>
        {busy ? "Signing in" : "Sign in"}
      </button>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="k" style={{ marginBottom: 4 }}>Why a separate door</div>
        <p className="muted">Staff must not share the student app. Membership decides which console they enter.</p>
      </div>
    </form>
  );
}
