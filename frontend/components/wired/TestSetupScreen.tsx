"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Q = { id: string; stem: string };
type Test = { id: string; title: string; question_ids: string[] };
type Cohort = { id: string; name: string };

export function TestSetupScreen() {
  const [tests, setTests] = useState<Test[]>([]);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [title, setTitle] = useState("Mock");
  const [picked, setPicked] = useState<string[]>([]);
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/tests"), api("/api/v1/questions"), api("/api/v1/cohorts")])
      .then(([t, q, c]) => {
        setTests(t as Test[]);
        setQuestions(q as Q[]);
        setCohorts(c as Cohort[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/tests", {
        method: "POST",
        body: JSON.stringify({ title, question_ids: picked, cohort_id: cohortId || null }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Test setup</h2>
      <span className="k">Mocks hang off the same question bank</span>
      <Err message={error} />
      <form className="card" onSubmit={onCreate}>
        <label className="field">
          <span>Title</span>
          <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Cohort</span>
          <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">All</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {questions.map((q) => (
          <label key={q.id} className="list__i">
            <input
              type="checkbox"
              checked={picked.includes(q.id)}
              onChange={() => setPicked((p) => (p.includes(q.id) ? p.filter((x) => x !== q.id) : [...p, q.id]))}
            />
            <span>{q.stem}</span>
          </label>
        ))}
        <button className="hot hot--btn" type="submit" disabled={busy}>
          Create test
        </button>
      </form>
      {tests.length === 0 ? (
        <Empty>No tests.</Empty>
      ) : (
        tests.map((t) => (
          <div key={t.id} className="card">
            <div className="sb">
              <div className="t">{t.title}</div>
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
