"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type StudentRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  display_name: string;
  phone?: string | null;
};

type CohortRow = {
  id: string;
  workspace_id: string;
  name: string;
  student_ids: string[];
};

const AV_PALETTE = ["#2E7D4F", "#2C6C88", "#6A4C93", "#AF6C22", "#A4384A", "#3f7d63", "#4b6b8a"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || " ") + (parts[1]?.[0] || "")).toUpperCase();
}

function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}

function statusTone(status: string) {
  if (status === "at risk") return "bad";
  if (status === "trial") return "warn";
  return "good";
}

function cohortNamesFor(studentId: string, cohorts: CohortRow[]) {
  return cohorts.filter((c) => c.student_ids.includes(studentId)).map((c) => c.name);
}

export function RosterScreen() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    const [st, co] = await Promise.all([
      api("/api/v1/students") as Promise<StudentRow[]>,
      api("/api/v1/cohorts") as Promise<CohortRow[]>,
    ]);
    setStudents(Array.isArray(st) ? st : []);
    setCohorts(Array.isArray(co) ? co : []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const kicker = useMemo(() => {
    const n = students.length;
    const m = cohorts.length;
    return `${n} enrolled · ${m} cohort${m === 1 ? "" : "s"}`;
  }, [students.length, cohorts.length]);

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const display_name = name.trim();
    if (!display_name || saving) return;
    const phoneValue = phone.trim() || undefined;
    setSaving(true);
    setError(null);
    try {
      const created = (await api("/api/v1/students", {
        method: "POST",
        body: JSON.stringify({ display_name, phone: phoneValue ?? null }),
      })) as StudentRow;
      if (phoneValue && created?.id) {
        setPhones((prev) => ({ ...prev, [created.id]: phoneValue }));
      }
      setName("");
      setPhone("");
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h2>Students</h2>
      <span className="k">{loading ? "Loading roster…" : kicker}</span>
      <div className="row" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn btn--dark btn--sm"
          style={{ cursor: "pointer" }}
          onClick={() => setAdding((open) => !open)}
        >
          + Add student
        </button>
        <span className="btn btn--sm">Import CSV</span>
        <span className="btn btn--sm">Invite link</span>
        <span className="btn btn--sm">Paste WhatsApp list</span>
      </div>
      {adding ? (
        <form className="card" onSubmit={onAdd} style={{ marginBottom: 12 }}>
          <h3>Add student</h3>
          <label className="field">
            <span>Name</span>
            <input
              className="field__in"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              autoComplete="off"
              required
            />
          </label>
          <label className="field">
            <span>Phone</span>
            <input
              className="field__in"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
              autoComplete="off"
              inputMode="tel"
            />
          </label>
          <div className="row">
            <button
              type="submit"
              className="btn btn--dark btn--sm"
              disabled={saving || !name.trim()}
              style={{ cursor: "pointer" }}
            >
              {saving ? "Saving…" : "Save student"}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setAdding(false);
                setName("");
                setPhone("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {error ? <p className="muted">{error}</p> : null}
      <div className="tblwrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Student</th>
              <th>Phone</th>
              <th>Cohort</th>
              <th>Joined</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const names = cohortNamesFor(s.id, cohorts);
              const shownPhone = s.phone || phones[s.id] || "—";
              const status = "active";
              return (
                <tr key={s.id}>
                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                      <span className="av av--sm" style={{ background: avColor(s.display_name) }}>
                        {initials(s.display_name)}
                      </span>
                      <span>{s.display_name}</span>
                    </div>
                  </td>
                  <td className="muted">{shownPhone}</td>
                  <td>
                    {names.length ? (
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        {names.map((n) => (
                          <span key={n} className="pill">{n}</span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="muted">—</td>
                  <td>
                    <span className={`pill is-${statusTone(status)}`}>{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!loading && students.length === 0 && !error ? (
        <p className="muted">No students in this workspace yet.</p>
      ) : null}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Cohorts</h3>
        {cohorts.length === 0 && !loading ? <p className="muted">No cohorts yet.</p> : null}
        {cohorts.map((c) => (
          <div className="list__i" key={c.id}>
            <div className="gr">
              <div className="t">{c.name}</div>
              <div className="s">
                {c.student_ids.length} student{c.student_ids.length === 1 ? "" : "s"}
              </div>
            </div>
            <Link className="hot--link" href="/app/faculty/cohort-builder">
              Open
            </Link>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 6 }}>
        <Link className="hot hot--btn" href="/app/faculty/cohort-builder">
          Add a cohort
        </Link>
      </div>
    </>
  );
}
