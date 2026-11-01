"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Cohort = { id: string; name: string };
type Student = { id: string; user_id?: string; display_name: string };
type Analysis = {
  cohort_id: string;
  students: Record<string, { id: string; score: number; max_score: number }[]>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AnalysisScreen() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [studentRows, setStudentRows] = useState<Student[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/api/v1/cohorts") as Promise<Cohort[]>,
      api("/api/v1/students").catch(() => []) as Promise<Student[]>,
    ])
      .then(([rows, studs]) => {
        const list = Array.isArray(rows) ? rows : [];
        setCohorts(list);
        setStudentRows(Array.isArray(studs) ? studs : []);
        if (list[0]) setCohortId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    api(`/api/v1/analysis/${cohortId}`)
      .then((row) => setData(row as Analysis))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [cohortId]);

  const studentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of studentRows) {
      if (s.id) map[s.id] = s.display_name;
      if (s.user_id) map[s.user_id] = s.display_name;
    }
    return map;
  }, [studentRows]);

  function resolveName(sid: string): string {
    if (studentNameMap[sid]) return studentNameMap[sid];
    if (UUID_RE.test(sid)) return "Student";
    return sid || "Student";
  }

  async function action(studentId: string) {
    setBusy(true);
    setError("");
    setNote("");
    try {
      await api(`/api/v1/analysis/${studentId}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action: "remediate", student_id: studentId, note: "from analysis" }),
      });
      setNote(`Remediation booked for ${resolveName(studentId)}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const students = data ? Object.entries(data.students) : [];

  return (
    <>
      <h2>Analysis</h2>
      <span className="k">Attempts by cohort · remediation books the mentor backlog</span>
      <Err message={error} />
      {note ? <p className="muted" role="status">{note}</p> : null}
      <label className="field">
        <span>Cohort</span>
        <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {students.length === 0 ? (
        <Empty>No attempts in this cohort yet.</Empty>
      ) : (
        students.map(([sid, atts]) => (
          <div key={sid} className="card">
            <div className="sb">
              <div>
                <div className="t">{resolveName(sid)}</div>
                <div className="s muted">
                  {atts.map((a) => `${a.score}/${a.max_score}`).join(" · ")}
                </div>
              </div>
              <button className="btn btn--sm" type="button" disabled={busy} onClick={() => void action(sid)}>
                Book remediation
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
