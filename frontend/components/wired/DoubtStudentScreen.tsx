"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Doubt = { id: string; body: string; status: string; answer?: string | null };

export function DoubtStudentScreen() {
  const [rows, setRows] = useState<Doubt[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/doubts")
      .then((data) => setRows(data as Doubt[]))
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
      await api("/api/v1/doubts", { method: "POST", body: JSON.stringify({ body }) });
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
      <AppBar title="Doubts" />
      <div className="appwrap">
        <Err message={error} />
        <form onSubmit={onCreate} className="card">
          <label className="field">
            <span>Ask</span>
            <textarea className="field__in" value={body} onChange={(e) => setBody(e.target.value)} rows={3} required />
          </label>
          <button className="hot hot--btn" type="submit" disabled={busy}>
            Send to queue
          </button>
        </form>
        {rows.length === 0 ? (
          <Empty>No doubts yet.</Empty>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="card">
              <div className="t">{r.body}</div>
              <div className="s muted">{r.status}</div>
              {r.answer ? <p style={{ marginTop: 8 }}>{r.answer}</p> : null}
            </div>
          ))
        )}
      </div>
    </>
  );
}
