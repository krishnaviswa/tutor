"use client";

import { useEffect, useState } from "react";
import { AVATAR_ACCEPT, AVATAR_MAX_BYTES, PersonAvatar, publishIdentity } from "@/components/SignedInMark";
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
  photo: string;
};

const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

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
  photo: "",
};

function readProfile(row: Partial<Profile> | null | undefined): Profile {
  return {
    phone: row?.phone ?? "",
    address: row?.address ?? "",
    expertise: row?.expertise ?? "",
    subjects: row?.subjects ?? "",
    board_label: row?.board_label ?? "",
    grade_label: row?.grade_label ?? "",
    study_info: row?.study_info ?? "",
    organization_email: row?.organization_email ?? "",
    photo: row?.photo ?? "",
  };
}

function tokenParts(current: string): string[] {
  return current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function selectedPresets(current: string, presets: readonly string[]): string[] {
  const parts = tokenParts(current);
  return presets.filter((preset) => parts.some((part) => part.toLowerCase() === preset.toLowerCase()));
}

function customText(current: string, presets: readonly string[]): string {
  return tokenParts(current)
    .filter((part) => !presets.some((preset) => preset.toLowerCase() === part.toLowerCase()))
    .join(", ");
}

function joinTokens(selected: readonly string[], custom: string): string {
  return [...selected, ...tokenParts(custom)].join(", ");
}

function ChipField({
  label,
  presets,
  value,
  customOn,
  customValue,
  placeholder,
  onChange,
  onCustomOn,
  onCustomValue,
}: {
  label: string;
  presets: readonly string[];
  value: string;
  customOn: boolean;
  customValue: string;
  placeholder: string;
  onChange: (next: string) => void;
  onCustomOn: (on: boolean) => void;
  onCustomValue: (next: string) => void;
}) {
  const selected = selectedPresets(value, presets);

  function togglePreset(item: string) {
    const on = selected.some((preset) => preset.toLowerCase() === item.toLowerCase());
    const next = on ? selected.filter((preset) => preset.toLowerCase() !== item.toLowerCase()) : [...selected, item];
    onChange(joinTokens(next, customOn ? customValue : ""));
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {presets.map((item) => {
          const on = selected.some((preset) => preset.toLowerCase() === item.toLowerCase());
          return (
            <button
              key={item}
              type="button"
              className={`chip${on ? " on" : ""}`}
              aria-pressed={on}
              onClick={() => togglePreset(item)}
            >
              {item}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip${customOn ? " on" : ""}`}
          aria-pressed={customOn}
          onClick={() => {
            if (customOn) {
              onCustomOn(false);
              onCustomValue("");
              onChange(joinTokens(selected, ""));
              return;
            }
            onCustomOn(true);
          }}
        >
          Custom
        </button>
      </div>
      {customOn ? (
        <input
          className="field__in"
          value={customValue}
          onChange={(e) => {
            const next = e.target.value;
            onCustomValue(next);
            onChange(joinTokens(selected, next));
          }}
          placeholder={placeholder}
          aria-label={`Custom ${label.toLowerCase()}`}
        />
      ) : null}
    </div>
  );
}

export function ProfileScreen() {
  const [role, setRole] = useState("student");
  const [name, setName] = useState("");
  const [form, setForm] = useState<Profile>(empty);
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [expertiseCustomOn, setExpertiseCustomOn] = useState(false);
  const [expertiseCustom, setExpertiseCustom] = useState("");
  const [subjectsCustomOn, setSubjectsCustomOn] = useState(false);
  const [subjectsCustom, setSubjectsCustom] = useState("");

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => {
        const row = me as { role?: string; display_name?: string };
        setRole(row.role || "student");
        const next = row.display_name?.trim() || "";
        if (next) setName((current) => current || next);
      })
      .catch(() => undefined);
    api("/api/v1/profile")
      .then((row) => {
        const data = row as Partial<Profile> & { display_name?: string };
        const next = readProfile(data);
        setForm(next);
        const loadedName = data.display_name?.trim() || "";
        if (loadedName) setName(loadedName);
        const expertiseExtra = customText(next.expertise, EXPERTISE_PRESETS);
        const subjectsExtra = customText(next.subjects, SUBJECT_PRESETS);
        setExpertiseCustom(expertiseExtra);
        setExpertiseCustomOn(expertiseExtra.length > 0);
        setSubjectsCustom(subjectsExtra);
        setSubjectsCustomOn(subjectsExtra.length > 0);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  function set<K extends keyof Profile>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onPhoto(file: File | null) {
    if (!file) return;
    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!IMAGE_TYPES.has(type)) {
      setError("Choose a JPEG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size <= 0) {
      setError("That photo is empty.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("That photo is larger than 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url.startsWith("data:image/")) {
        setError("Choose a JPEG, PNG, WebP, or GIF.");
        return;
      }
      setError("");
      set("photo", url);
    };
    reader.readAsDataURL(file);
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
      })) as Profile & { display_name?: string };
      const next = readProfile(saved);
      const savedName = saved.display_name?.trim() || name;
      setForm(next);
      if (saved.display_name?.trim()) setName(saved.display_name.trim());
      publishIdentity({ name: savedName, photo: next.photo });
      const expertiseExtra = customText(next.expertise, EXPERTISE_PRESETS);
      const subjectsExtra = customText(next.subjects, SUBJECT_PRESETS);
      setExpertiseCustom(expertiseExtra);
      setExpertiseCustomOn(expertiseExtra.length > 0);
      setSubjectsCustom(subjectsExtra);
      setSubjectsCustomOn(subjectsExtra.length > 0);
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
        <div className="who who--card">
          <PersonAvatar name={name} photo={form.photo} large />
          <div className="who__copy">
            <span className="who__name">{name}</span>
            <label className="field">
              <span>Photo</span>
              <input
                className="field__in"
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
              />
              <em>JPEG, PNG, WebP, or GIF. Up to 2 MB. It saves with the profile.</em>
            </label>
          </div>
        </div>
        <div className="form-stack">
          <div className="form-row">
            <label className="field">
              <span>Phone</span>
              <input className="field__in" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </label>
            <label className="field">
              <span>Address</span>
              <input className="field__in" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </label>
          </div>

          <ChipField
            label="Expertise"
            presets={EXPERTISE_PRESETS}
            value={form.expertise}
            customOn={expertiseCustomOn}
            customValue={expertiseCustom}
            placeholder="Type custom expertise"
            onChange={(expertise) => set("expertise", expertise)}
            onCustomOn={setExpertiseCustomOn}
            onCustomValue={setExpertiseCustom}
          />

          {role !== "student" ? (
            <ChipField
              label="Subjects"
              presets={SUBJECT_PRESETS}
              value={form.subjects}
              customOn={subjectsCustomOn}
              customValue={subjectsCustom}
              placeholder="Type custom subjects"
              onChange={(subjects) => set("subjects", subjects)}
              onCustomOn={setSubjectsCustomOn}
              onCustomValue={setSubjectsCustom}
            />
          ) : (
            <>
              <div className="form-row">
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

          <p className="meta-line">Organization email: {form.organization_email || "—"}</p>

          {step ? (
            step.faculty_admin ? (
              <div className="form-row">
                <label className="field">
                  <span>One-time code</span>
                  <input
                    className="field__in"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
                <label className="field">
                  <span>Email code</span>
                  <input
                    className="field__in"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </label>
              </div>
            ) : (
              <label className="field">
                <span>One-time code</span>
                <input
                  className="field__in"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>
            )
          ) : null}
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="hot hot--btn"
            disabled={busy}
            aria-describedby="profile-save-note"
            onClick={() => void (step ? save() : begin())}
          >
            Save profile
          </button>
          <p id="profile-save-note" className="meta-line">
            Saving sends a one-time code to confirm it is you.
          </p>
        </div>
      </div>
    </>
  );
}
