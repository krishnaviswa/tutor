"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { MOCK_TENANTS, OTP_CODE } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { getToken, setToken } from "@/lib/session";
import { Err } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

export function StaffLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(exam.emails.teacher);
  const [phone, setPhone] = useState(exam.phones.teacher);
  const [ws, setWs] = useState(exam.workspaceId);
  const [code, setCode] = useState(OTP_CODE);
  const [mode, setMode] = useState<"otp" | "magic">("otp");
  const [staffRole, setStaffRole] = useState<"teacher" | "owner" | "assistant">("teacher");
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
      router.replace(staffRole === "owner" ? catalogRoute("owner") : catalogRoute("teacher-dash"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="supbody tint-sky" style={{ maxWidth: 440, margin: "0 auto", padding: "40px 24px" }} onSubmit={onSubmit}>
      <div className="wm" style={{ marginBottom: 22 }}>
        TutorOS <i>staff</i>
      </div>
      <h2 style={{ fontSize: "1.35rem", marginBottom: 16 }}>Staff sign-in</h2>
      <p className="muted" style={{ marginBottom: 16 }}>
        OTP {OTP_CODE} or magic link. Exam-prep faculty can skip this screen and OTP on the console.
      </p>
      <label className="field">
        <span>Role</span>
        <select className="field__in" value={staffRole} onChange={(e) => setStaffRole(e.target.value as typeof staffRole)}>
          <option value="teacher">teacher</option>
          <option value="owner">owner</option>
          <option value="assistant">assistant</option>
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
      <label className="field">
        <span>Workspace</span>
        <input className="field__in" value={ws} onChange={(e) => setWs(e.target.value)} style={{ fontFamily: "var(--mono)", fontSize: ".78rem" }} />
      </label>
      <Err message={error} />
      <button className="hot hot--btn" type="submit" disabled={busy}>
        {busy ? "Signing in" : "Sign in"}
      </button>
      <div className="card" style={{ marginTop: 20 }}>
        <div className="k" style={{ marginBottom: 4 }}>Why a separate door</div>
        <p className="muted">Staff must not share the student app. Membership decides which console they enter.</p>
      </div>
    </form>
  );
}
