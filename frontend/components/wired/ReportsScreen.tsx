"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Av, Empty, Err, rupees } from "./bits";

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
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [exportedCount, setExportedCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revenue, setRevenue] = useState<{ platform_cents: number; student_cents: number } | null>(null);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setRole((me as { role?: string }).role || "teacher"))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (role !== "owner") return;
    api("/api/v1/reports/revenue")
      .then((row) => setRevenue(row as { platform_cents: number; student_cents: number }))
      .catch(() => undefined);
  }, [role]);

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
      setExportedCount((row.slice || slice).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const visibleSlice =
    selectedStudentId === "all"
      ? slice
      : slice.filter((s) => s.student_id === selectedStudentId);

  function marksheet(s: Slice) {
    const att = s.attendance || { present: s.attendance_present, total: s.attendance_total };
    const attPct = att.total ? Math.round((att.present / att.total) * 100) : 0;
    const pracPct = s.practice_pct ?? 0;

    return (
      <div key={s.student_id} className="card">
        <div className="sb" style={{ marginBottom: 8 }}>
          <div className="row" style={{ gap: 10 }}>
            <Av name={s.display_name} />
            <div>
              <div className="t">Term Progress Report — {s.display_name}</div>
              <div className="s muted">
                Verified attendance, practice completion, and latest assessment scores
              </div>
            </div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className={`pill ${attPct >= 75 ? "is-good" : "is-warn"}`}>
              Attendance {attPct}%
            </span>
            <span className={`pill ${pracPct >= 60 ? "is-good" : "is-info"}`}>
              Practice {pracPct}%
            </span>
          </div>
        </div>
        <div className="hr" />
        <div className="sb" style={{ fontSize: ".88rem", marginBottom: 8 }}>
          <span className="muted">Classes Attended</span>
          <span>
            <b>
              {att.present} of {att.total}
            </b>{" "}
            sessions ({attPct}%)
          </span>
        </div>
        <div className="sb" style={{ fontSize: ".88rem", marginBottom: 8 }}>
          <span className="muted">Practice Set Completion</span>
          <span>
            <b>{pracPct}%</b> ({s.attempts} attempt{s.attempts === 1 ? "" : "s"})
          </span>
        </div>
        <div className="sb" style={{ fontSize: ".88rem", marginBottom: 8 }}>
          <span className="muted">Latest Assessment Score</span>
          <span>
            <b>
              {s.latest_test
                ? `${s.latest_test.title} · ${s.latest_test.score} / ${s.latest_test.max}`
                : s.last_score == null
                  ? "No test taken yet"
                  : `${s.last_score} / ${s.last_max ?? "—"}`}
            </b>
          </span>
        </div>
        <div className="sb" style={{ fontSize: ".88rem", marginBottom: 4, alignItems: "flex-start" }}>
          <span className="muted">Teacher Feedback Note</span>
          <span style={{ textAlign: "right", maxWidth: "60%" }}>
            {s.teacher_note || "On track with current unit."}
          </span>
        </div>
      </div>
    );
  }

  const body = (
    <>
      <Err message={error} />
      {exportedCount != null ? (
        <div className="card card--wash" style={{ padding: "10px 14px", marginBottom: 12 }}>
          <span className="pill is-good" style={{ marginRight: 8 }}>Export Ready</span>
          <span className="s" style={{ color: "var(--ink)" }}>
            Refreshed and exported {exportedCount} student progress report{exportedCount === 1 ? "" : "s"}.
          </span>
        </div>
      ) : null}
      {visibleSlice.length === 0 ? (
        <Empty>No student progress reports available yet.</Empty>
      ) : (
        visibleSlice.map((s) => marksheet(s))
      )}
    </>
  );

  if (role === "parent") {
    return (
      <>
        <AppBar title="Child Progress Report" extra={<span className="pill is-info">Term Marksheet</span>} />
        <div className="appwrap">{body}</div>
      </>
    );
  }

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Student Progress Reports &amp; Exports</h2>
          <span className="k">
            Review verified attendance, practice completion, and latest assessment scores for every student
          </span>
        </div>
        <div className="page-toolbar__actions">
          {slice.length > 1 ? (
            <select
              className="field__in"
              style={{ width: "auto", padding: "8px 12px", fontSize: "var(--text-sm)" }}
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              aria-label="Filter by student"
            >
              <option value="all">All Students ({slice.length})</option>
              {slice.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.display_name}
                </option>
              ))}
            </select>
          ) : null}
          <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void exportReport()}>
            {busy ? "Preparing Export…" : "Export Reports"}
          </button>
        </div>
      </div>

      {revenue ? (
        <div className="grid g2" style={{ margin: "0 0 16px" }}>
          <div className="stat">
            <div className="stat__v">{rupees(revenue.platform_cents)}</div>
            <div className="stat__l">Platform Subscription Total</div>
          </div>
          <div className="stat">
            <div className="stat__v">{rupees(revenue.student_cents)}</div>
            <div className="stat__l">Student Fees Collected</div>
          </div>
        </div>
      ) : null}

      {body}
    </>
  );
}
