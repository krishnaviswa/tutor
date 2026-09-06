"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Slice = {
  student_id: string;
  display_name: string;
  attempts: number;
  last_score: number | null;
  last_max: number | null;
  attendance_present: number;
  attendance_total: number;
  attendance?: { present: number; total: number };
  practice_pct?: number;
  latest_test?: { score: number; max: number; title: string } | null;
  teacher_note?: string;
};

type Export = {
  students: { id: string; display_name: string }[];
  attempts: { id: string; student_id: string; score: number }[];
  slice?: Slice[];
};

export function ReportsScreen() {
  const [role, setRole] = useState("teacher");
  const [slice, setSlice] = useState<Slice[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "teacher"))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!role) return;
    api("/api/v1/reports")
      .then((rows) => setSlice(Array.isArray(rows) ? (rows as Slice[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [role]);

  async function exportReport() {
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/reports/export", { method: "POST" })) as Export;
      if (row.slice) setSlice(row.slice);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function marksheet(s: Slice) {
    const att = s.attendance || { present: s.attendance_present, total: s.attendance_total };
    const attPct = att.total ? Math.round((att.present / att.total) * 100) : 0;
    return (
      <div key={s.student_id} className="card">
        <div style={{ fontFamily: "var(--serif)", fontWeight: 600 }}>Term report — {s.display_name}</div>
        <div className="muted" style={{ marginTop: 4 }}>From the timeline · not a second gradebook</div>
        <div className="hr" />
        <div className="sb" style={{ fontSize: ".82rem", marginBottom: 6 }}>
          <span className="muted">Attendance</span>
          <span>
            {att.present} / {att.total} · {attPct}%
          </span>
        </div>
        <div className="sb" style={{ fontSize: ".82rem", marginBottom: 6 }}>
          <span className="muted">Practice completion</span>
          <span>{s.practice_pct ?? 0}%</span>
        </div>
        <div className="sb" style={{ fontSize: ".82rem", marginBottom: 6 }}>
          <span className="muted">Latest test</span>
          <span>
            {s.latest_test
              ? `${s.latest_test.title} · ${s.latest_test.score} / ${s.latest_test.max}`
              : s.last_score == null
                ? "—"
                : `${s.last_score}/${s.last_max ?? "?"}`}
          </span>
        </div>
        <div className="sb" style={{ fontSize: ".82rem", marginBottom: 6, alignItems: "flex-start" }}>
          <span className="muted">Teacher note</span>
          <span style={{ textAlign: "right", maxWidth: "55%" }}>{s.teacher_note || "—"}</span>
        </div>
      </div>
    );
  }

  const body = (
    <>
      <Err message={error} />
      {slice.length === 0 ? (
        <Empty>No report rows in this workspace yet.</Empty>
      ) : (
        slice.map((s) => marksheet(s))
      )}
    </>
  );

  if (role === "parent") {
    return (
      <>
        <AppBar title="Marksheet" extra={<span className="pill">your child</span>} />
        <div className="appwrap">{body}</div>
      </>
    );
  }

  return (
    <>
      <h2>Reports & exports</h2>
      <span className="k">Term slice from this workspace ledger</span>
      <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void exportReport()}>
        Export
      </button>
      {body}
    </>
  );
}
