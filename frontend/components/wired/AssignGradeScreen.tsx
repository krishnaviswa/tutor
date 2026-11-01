"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Asg = { id: string; title: string };
type Student = { id: string; user_id?: string; display_name: string };
type Sub = {
  id: string;
  student_id: string;
  grade?: string | null;
  feedback?: string | null;
  late?: boolean;
  resubmit_count?: number;
};

const GRADE_OPTIONS = [
  "A+ (95–100%)",
  "A (85–94%)",
  "B+ (75–84%)",
  "B (65–74%)",
  "C (50–64%)",
  "Needs Revision",
] as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AssignGradeScreen() {
  const params = useSearchParams();
  const [assignments, setAssignments] = useState<Asg[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [asgId, setAsgId] = useState(params.get("id") || "");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [sel, setSel] = useState<Sub | null>(null);
  const [grade, setGrade] = useState<string>(GRADE_OPTIONS[0]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api("/api/v1/assignments") as Promise<Asg[]>,
      api("/api/v1/students").catch(() => []) as Promise<Student[]>,
    ])
      .then(([rows, studs]) => {
        const list = Array.isArray(rows) ? rows : [];
        setAssignments(list);
        setStudents(Array.isArray(studs) ? studs : []);
        if (!asgId && list[0]) setAsgId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [asgId]);

  useEffect(() => {
    if (!asgId) return;
    api(`/api/v1/assignments/${asgId}/submissions`)
      .then((rows) => setSubs(Array.isArray(rows) ? (rows as Sub[]) : []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [asgId]);

  const studentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of students) {
      if (s.id) map[s.id] = s.display_name;
      if (s.user_id) map[s.user_id] = s.display_name;
    }
    return map;
  }, [students]);

  function resolveStudentName(studentId: string): string {
    if (studentNameMap[studentId]) return studentNameMap[studentId];
    if (UUID_RE.test(studentId)) return "Student";
    return studentId || "Student";
  }

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
      setSubs(Array.isArray(rows) ? rows : []);
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
                  setGrade(s.grade || GRADE_OPTIONS[0]);
                  setFeedback(s.feedback || "");
                }}
              >
                <div className="t">{resolveStudentName(s.student_id)}</div>
                <div className="s muted">
                  {s.grade || "Ungraded"}
                  {s.late ? " · Late" : ""}
                  {s.resubmit_count != null ? ` · Resubmission #${s.resubmit_count}` : ""}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="card">
          {sel ? (
            <>
              <div className="k" style={{ marginBottom: 8 }}>
                Grading {resolveStudentName(sel.student_id)}
              </div>
              <label className="field">
                <span>Grade</span>
                <select className="field__in" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {grade && !GRADE_OPTIONS.includes(grade as (typeof GRADE_OPTIONS)[number]) ? (
                    <option value={grade}>{grade}</option>
                  ) : null}
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Feedback</span>
                <textarea
                  className="field__in"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Constructive notes for the student's timeline…"
                />
              </label>
              <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void save()}>
                {busy ? "Saving…" : "Return to student"}
              </button>
            </>
          ) : (
            <p className="muted">Pick a student submission on the left to grade.</p>
          )}
        </div>
      </div>
    </>
  );
}
