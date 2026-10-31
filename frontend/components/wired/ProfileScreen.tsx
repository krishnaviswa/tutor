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

const BOARD_OPTIONS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board"] as const;

const GRADE_OPTIONS = [
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Repeater / Dropper",
  "Undergraduate",
] as const;

const SUBJECT_PRESETS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
] as const;

const EXPERTISE_PRESETS = [
  "JEE Advanced",
  "NEET UG",
  "Board Exams",
  "Olympiad",
  "Foundation",
  "Concept Remediation",
] as const;

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

function toggleTokenList(current: string, item: string): string {
  const parts = current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.includes(item)) {
    return parts.filter((s) => s !== item).join(", ");
  }
  return [...parts, item].join(", ");
}

function hasToken(current: string, item: string): boolean {
  return current
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes(item.toLowerCase());
}

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
        <div className="grid g2" style={{ gap: 10 }}>
          <label className="field">
            <span>Phone</span>
            <input className="field__in" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="field">
            <span>Address</span>
            <input className="field__in" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </label>
        </div>

        <div className="field">
          <span>Expertise</span>
          <div className="chips" style={{ margin: "6px 0" }}>
            {EXPERTISE_PRESETS.map((item) => (
              <button
                key={item}
                type="button"
                className={`chip${hasToken(form.expertise, item) ? " on" : ""}`}
                onClick={() => set("expertise", toggleTokenList(form.expertise, item))}
              >
                {item}
              </button>
            ))}
          </div>
          <input
            className="field__in"
            value={form.expertise}
            onChange={(e) => set("expertise", e.target.value)}
            placeholder="Select presets above or type custom expertise…"
          />
        </div>

        {role !== "student" ? (
          <div className="field">
            <span>Subjects</span>
            <div className="chips" style={{ margin: "6px 0" }}>
              {SUBJECT_PRESETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip${hasToken(form.subjects, item) ? " on" : ""}`}
                  onClick={() => set("subjects", toggleTokenList(form.subjects, item))}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              className="field__in"
              value={form.subjects}
              onChange={(e) => set("subjects", e.target.value)}
              placeholder="Select subjects above or type custom subjects…"
            />
          </div>
        ) : (
          <>
            <div className="grid g2" style={{ gap: 10 }}>
              <label className="field">
                <span>Board</span>
                <select
                  className="field__in"
                  value={form.board_label}
                  onChange={(e) => set("board_label", e.target.value)}
                >
                  <option value="">Select board…</option>
                  {form.board_label &&
                  !BOARD_OPTIONS.includes(form.board_label as (typeof BOARD_OPTIONS)[number]) ? (
                    <option value={form.board_label}>{form.board_label}</option>
                  ) : null}
                  {BOARD_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Grade</span>
                <select
                  className="field__in"
                  value={form.grade_label}
                  onChange={(e) => set("grade_label", e.target.value)}
                >
                  <option value="">Select grade…</option>
                  {form.grade_label &&
                  !GRADE_OPTIONS.includes(form.grade_label as (typeof GRADE_OPTIONS)[number]) ? (
                    <option value={form.grade_label}>{form.grade_label}</option>
                  ) : null}
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>What you are studying</span>
              <textarea
                className="field__in"
                value={form.study_info}
                onChange={(e) => set("study_info", e.target.value)}
                rows={3}
              />
            </label>
          </>
        )}

        <p className="muted">Organization email: {form.organization_email || "—"}</p>
        {step ? (
          <>
            <label className="field">
              <span>One-time code</span>
              <input
                className="field__in"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
              />
            </label>
            {step.faculty_admin ? (
              <label className="field">
                <span>Email code</span>
                <input
                  className="field__in"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  inputMode="numeric"
                />
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
