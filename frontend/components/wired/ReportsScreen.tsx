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

  const body = (
    <>
      <Err message={error} />
      {slice.length === 0 ? (
        <Empty>No report rows in this workspace yet.</Empty>
      ) : (
        slice.map((s) => (
          <div key={s.student_id} className="card">
            <div className="sb">
              <div className="t">{s.display_name}</div>
              <span className="pill">
                {s.last_score == null ? "no score" : `${s.last_score}/${s.last_max ?? "?"}`}
              </span>
            </div>
            <p className="muted">
              {s.attempts} attempts · attendance {s.attendance_present}/{s.attendance_total}
            </p>
          </div>
        ))
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
      {role !== "parent" ? (
        <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void exportReport()}>
          Export
        </button>
      ) : null}
      {body}
    </>
  );
}
