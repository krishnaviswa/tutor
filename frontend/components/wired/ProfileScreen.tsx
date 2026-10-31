"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Err } from "./bits";

type Profile = {
  phone: string;
  address: string;
  expertise: string;
  subjects: string;
  board_label: string;
  grade_label: string;
  study_info: string;
  organization_email: string;
};

type Step = { challenge_id: string; email_challenge_id?: string | null; faculty_admin?: boolean };

const empty: Profile = {
  phone: "",
  address: "",
  expertise: "",
  subjects: "",
  board_label: "",
  grade_label: "",
  study_info: "",
  organization_email: "",
};

export function ProfileScreen() {
  const [role, setRole] = useState("student");
  const [form, setForm] = useState<Profile>(empty);
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "student"))
      .catch(() => undefined);
    api("/api/v1/profile")
      .then((row) => setForm({ ...empty, ...(row as Profile) }))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function set<K extends keyof Profile>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function begin() {
    setBusy(true);
    setError("");
    try {
      const started = (await api("/api/v1/profile/step-up", { method: "POST" })) as Step;
      setStep(started);
      setMsg(started.faculty_admin ? "Enter the code and the email code." : "Enter the one-time code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!step) return;
    setBusy(true);
    setError("");
    try {
      const saved = (await api("/api/v1/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          challenge_id: step.challenge_id,
          code,
          email_challenge_id: step.email_challenge_id,
          email_code: emailCode || undefined,
        }),
      })) as Profile;
      setForm({ ...empty, ...saved });
      setStep(null);
      setCode("");
      setEmailCode("");
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Profile</h2>
      <span className="k">Phone and home address stay on this page.</span>
      <Err message={error} />
      {msg ? <p className="muted">{msg}</p> : null}
      <div className="card">
        <label className="field">
          <span>Phone</span>
          <input className="field__in" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>
        <label className="field">
          <span>Address</span>
          <input className="field__in" value={form.address} onChange={(e) => set("address", e.target.value)} />
        </label>
        <label className="field">
          <span>Expertise</span>
          <input className="field__in" value={form.expertise} onChange={(e) => set("expertise", e.target.value)} />
        </label>
        {role !== "student" ? (
          <label className="field">
            <span>Subjects</span>
            <input className="field__in" value={form.subjects} onChange={(e) => set("subjects", e.target.value)} />
          </label>
        ) : (
          <>
            <label className="field">
              <span>Board</span>
              <input className="field__in" value={form.board_label} onChange={(e) => set("board_label", e.target.value)} />
            </label>
            <label className="field">
              <span>Grade</span>
              <input className="field__in" value={form.grade_label} onChange={(e) => set("grade_label", e.target.value)} />
            </label>
            <label className="field">
              <span>What you are studying</span>
              <textarea className="field__in" value={form.study_info} onChange={(e) => set("study_info", e.target.value)} rows={3} />
            </label>
          </>
        )}
        <p className="muted">Organization email: {form.organization_email || "—"}</p>
        {step ? (
          <>
            <label className="field">
              <span>One-time code</span>
              <input className="field__in" value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
            </label>
            {step.faculty_admin ? (
              <label className="field">
                <span>Email code</span>
                <input className="field__in" value={emailCode} onChange={(e) => setEmailCode(e.target.value)} inputMode="numeric" />
              </label>
            ) : null}
            <button type="button" className="hot hot--btn" disabled={busy} onClick={() => void save()}>
              Save profile
            </button>
          </>
        ) : (
          <button type="button" className="hot hot--btn" disabled={busy} onClick={() => void begin()}>
            Confirm to save
          </button>
        )}
      </div>
    </>
  );
}
