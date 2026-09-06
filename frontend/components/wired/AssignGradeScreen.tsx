"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Asg = { id: string; title: string };
type Sub = { id: string; student_id: string; grade?: string | null; feedback?: string | null };

export function AssignGradeScreen() {
  const params = useSearchParams();
  const [assignments, setAssignments] = useState<Asg[]>([]);
  const [asgId, setAsgId] = useState(params.get("id") || "");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [sel, setSel] = useState<Sub | null>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/v1/assignments")
      .then((rows) => {
        const list = rows as Asg[];
        setAssignments(list);
        if (!asgId && list[0]) setAsgId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [asgId]);

  useEffect(() => {
    if (!asgId) return;
    api(`/api/v1/assignments/${asgId}/submissions`)
      .then((rows) => setSubs(rows as Sub[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [asgId]);

  async function save() {
    if (!sel || !asgId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/assignments/${asgId}/grade`, {
        method: "POST",
        body: JSON.stringify({ submission_id: sel.id, grade, feedback }),
      });
      const rows = (await api(`/api/v1/assignments/${asgId}/submissions`)) as Sub[];
      setSubs(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Submissions</h2>
      <span className="k">Grade writes the timeline</span>
      <Err message={error} />
      <label className="field">
        <span>Assignment</span>
        <select className="field__in" value={asgId} onChange={(e) => setAsgId(e.target.value)}>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </label>
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {subs.length === 0 ? (
            <Empty>No submissions yet.</Empty>
          ) : (
            subs.map((s) => (
              <button
                key={s.id}
                type="button"
                className={sel?.id === s.id ? "hot hot--row" : "card"}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => {
                  setSel(s);
                  setGrade(s.grade || "");
                  setFeedback(s.feedback || "");
                }}
              >
                <div className="t">{s.student_id}</div>
                <div className="s muted">{s.grade || "ungraded"}</div>
              </button>
            ))
          )}
        </div>
        <div className="card">
          {sel ? (
            <>
              <label className="field">
                <span>Grade</span>
                <input className="field__in" value={grade} onChange={(e) => setGrade(e.target.value)} />
              </label>
              <label className="field">
                <span>Feedback</span>
                <textarea className="field__in" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3} />
              </label>
              <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void save()}>
                Return to student
              </button>
            </>
          ) : (
            <p className="muted">Pick a submission.</p>
          )}
        </div>
      </div>
    </>
  );
}
