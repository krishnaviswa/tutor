"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Export = {
  students: { id: string; display_name: string }[];
  attempts: { id: string; student_id: string; score: number }[];
};

export function ReportsScreen() {
  const [role, setRole] = useState("teacher");
  const [data, setData] = useState<Export | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "teacher"))
      .catch(() => undefined);
  }, []);

  async function exportReport() {
    setBusy(true);
    setError("");
    try {
      const row = (await api("/api/v1/reports/export", { method: "POST" })) as Export;
      setData(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (role === "parent") {
      api("/api/v1/reports")
        .then(() => undefined)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    }
  }, [role]);

  if (role === "parent") {
    return (
      <>
        <AppBar title="Marksheet" extra={<span className="pill">your child</span>} />
        <div className="appwrap">
          <Err message={error} />
          <div className="card">
            <p className="muted">
              Faculty generate the report from the timeline. You read this slice — not a second gradebook.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h2>Reports & exports</h2>
      <span className="k">JSON export from this workspace</span>
      <Err message={error} />
      <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void exportReport()}>
        Export
      </button>
      {!data ? (
        <Empty>Run an export.</Empty>
      ) : (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="k">{data.students.length} students · {data.attempts.length} attempts</div>
          {data.students.map((s) => (
            <div key={s.id} className="list__i">
              <div className="gr">
                <div className="t">{s.display_name}</div>
                <div className="s">{s.id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
