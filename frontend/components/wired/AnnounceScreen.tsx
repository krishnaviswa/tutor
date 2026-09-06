"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Row = {
  id: string;
  title: string;
  body: string;
  cohort_id?: string | null;
  scheduled_at?: string;
  channels?: string[];
};
type Cohort = { id: string; name: string };

export function AnnounceScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/announcements"), api("/api/v1/cohorts")])
      .then(([a, c]) => {
        setRows(a as Row[]);
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
      await api("/api/v1/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body, cohort_id: cohortId || null, channels: ["in_app"] }),
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
      <h2>Announcements</h2>
      <span className="k">Broadcasts write the timeline, then mock channels</span>
      <Err message={error} />
      <form className="card" onSubmit={onCreate}>
        <label className="field">
          <span>Title</span>
          <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          <span>Body</span>
          <textarea className="field__in" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
        </label>
        <label className="field">
          <span>Cohort (optional)</span>
          <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">Whole workspace</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="hot hot--btn" type="submit" disabled={busy}>
          Publish
        </button>
      </form>
      {rows.length === 0 ? (
        <Empty>No announcements.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="list__i">
            <div className="gr">
              <div className="t">{r.title}</div>
              <div className="s">{r.body}</div>
              <div className="s muted">
                {[r.scheduled_at, (r.channels || []).join(", ")].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
