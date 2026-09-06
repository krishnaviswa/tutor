"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Cohort = { id: string; name: string };
type Analysis = { cohort_id: string; students: Record<string, { id: string; score: number; max_score: number }[]> };

export function AnalysisScreen() {
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/cohorts")
      .then((rows) => {
        const list = rows as Cohort[];
        setCohorts(list);
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

  async function action(studentId: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/analysis/${studentId}/action`, {
        method: "PATCH",
        body: JSON.stringify({ action: "remediate", student_id: studentId, note: "from analysis" }),
      });
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
                <div className="t">{sid}</div>
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
