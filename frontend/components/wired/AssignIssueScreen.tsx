"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Asg = { id: string; title: string; body: string; cohort_id?: string | null };
type Cohort = { id: string; name: string };

export function AssignIssueScreen() {
  const [rows, setRows] = useState<Asg[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/assignments"), api("/api/v1/cohorts")])
      .then(([a, c]) => {
        setRows(a as Asg[]);
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
      await api("/api/v1/assignments", {
        method: "POST",
        body: JSON.stringify({ title, body, cohort_id: cohortId || null }),
      });
      setTitle("");
      setBody("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>New assignment</h2>
      <span className="k">Issue · collect · grade · return</span>
      <Err message={error} />
      <form className="card" onSubmit={onCreate}>
        <label className="field">
          <span>Title</span>
          <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span>Instructions</span>
          <textarea className="field__in" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
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
        <button className="hot hot--btn" type="submit" disabled={busy}>
          Issue
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>No assignments.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card">
            <div className="sb">
              <div>
                <div className="t">{r.title}</div>
                <div className="s muted">{r.body}</div>
              </div>
              <Link href={`${catalogRoute("assign-grade")}?id=${r.id}`} className="hot--link">
                Grade
              </Link>
            </div>
          </div>
        ))
      )}
    </>
  );
}
