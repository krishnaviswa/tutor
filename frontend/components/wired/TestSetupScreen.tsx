"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Q = { id: string; stem: string; difficulty?: string };
type Test = {
  id: string;
  title: string;
  question_ids: string[];
  cohort_id?: string | null;
  negative_mark?: boolean;
};
type Cohort = { id: string; name: string };

const TEST_PRESETS = [
  "Weekly Topic Mock",
  "Full-Length Benchmark Mock",
  "Unit Assessment Test",
  "Speed & Accuracy Drill",
] as const;

export function TestSetupScreen() {
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [preset, setPreset] = useState<string>(TEST_PRESETS[0]);
  const [title, setTitle] = useState<string>(TEST_PRESETS[0]);
  const [picked, setPicked] = useState<string[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [negativeMark, setNegativeMark] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/tests"), api("/api/v1/questions"), api("/api/v1/cohorts")])
      .then(([t, q, c]) => {
        setTests(Array.isArray(t) ? (t as Test[]) : []);
        setQuestions(Array.isArray(q) ? (q as Q[]) : []);
        setCohorts(Array.isArray(c) ? (c as Cohort[]) : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  const cohortMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of cohorts) map[c.id] = c.name;
    return map;
  }, [cohorts]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/tests", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim() || "Mock Test",
          question_ids: picked,
          cohort_id: cohortId || null,
          negative_mark: negativeMark,
        }),
      });
      setPicked([]);
      setNegativeMark(false);
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="sb" style={{ marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>Test setup</h2>
          <span className="k">Mocks hang off the same question bank</span>
        </div>
        <button
          type="button"
          className={showCreate ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowCreate((prev) => !prev)}
        >
          {showCreate ? "Close form" : "+ Create Mock Test"}
        </button>
      </div>

      <Err message={error} />

      {showCreate ? (
        <form className="card" onSubmit={onCreate} style={{ marginBottom: 14 }}>
          <h3>Configure mock test</h3>
          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Test template</span>
              <select
                className="field__in"
                value={preset}
                onChange={(e) => {
                  const val = e.target.value;
                  setPreset(val);
                  if (val !== "__custom__") setTitle(val);
                }}
              >
                {TEST_PRESETS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
                <option value="__custom__">Custom title…</option>
              </select>
            </label>

            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setPreset("__custom__");
                }}
                required
              />
            </label>

            <label className="field">
              <span>Cohort</span>
              <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                <option value="">All cohorts</option>
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="k" style={{ margin: "8px 0" }}>
            Select questions ({picked.length} chosen)
          </div>
          {questions.length === 0 ? (
            <p className="muted">No questions in bank yet.</p>
          ) : (
            questions.map((q) => (
              <label key={q.id} className="list__i" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={picked.includes(q.id)}
                  onChange={() =>
                    setPicked((p) => (p.includes(q.id) ? p.filter((x) => x !== q.id) : [...p, q.id]))
                  }
                />
                <span>{q.stem}</span>
              </label>
            ))
          )}

          <label className="list__i" style={{ cursor: "pointer", marginTop: 6 }}>
            <input
              type="checkbox"
              checked={negativeMark}
              onChange={(e) => setNegativeMark(e.target.checked)}
            />
            <span>Apply negative marking for wrong answers</span>
          </label>

          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="hot hot--btn" type="submit" disabled={busy} style={{ width: "auto", margin: 0 }}>
              {busy ? "Creating…" : "Create test"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tests.length === 0 ? (
        <Empty>No tests configured yet. Click &ldquo;+ Create Mock Test&rdquo; above to add one.</Empty>
      ) : (
        tests.map((t) => (
          <div key={t.id} className="card">
            <div className="sb">
              <div>
                <div className="t">{t.title}</div>
                <div className="s muted">
                  {[
                    `${(t.question_ids || []).length} questions`,
                    t.cohort_id && cohortMap[t.cohort_id] ? cohortMap[t.cohort_id] : "All cohorts",
                    t.negative_mark ? "Negative marking enabled" : "Standard marking",
                  ].join(" · ")}
                </div>
              </div>
              <Link href={catalogRoute("test-runner")} className="hot--link">
                Runner
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}
