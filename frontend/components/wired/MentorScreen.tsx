"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Item = { id: string; title: string; status: string; student_id?: string | null; kind?: string };
type Session = { id: string; title: string };

export function MentorScreen() {
  const [rows, setRows] = useState<Item[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([api("/api/v1/backlog"), api("/api/v1/sessions")])
      .then(([b, s]) => {
        setRows(b as Item[]);
        const list = s as Session[];
        setSessions(list);
        if (list[0]) setSessionId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function book(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/backlog/${id}/book`, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId || null }),
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
      <h2>Mentor / backlog</h2>
      <span className="k">Booked slots on skipped work — not re-teaching</span>
      <Err message={error} />
      <label className="field">
        <span>Book onto session</span>
        <select className="field__in" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      {rows.length === 0 ? (
        <Empty>Backlog empty. Analysis actions create items.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="card">
            <div className="sb">
              <div>
                <div className="t">{r.title}</div>
                <div className="s muted">{r.status} · {r.kind}</div>
              </div>
              {r.status !== "booked" ? (
                <button className="btn btn--sm" type="button" disabled={busy} onClick={() => void book(r.id)}>
                  Book
                </button>
              ) : (
                <span className="pill is-good">booked</span>
              )}
            </div>
          </div>
        ))
      )}
    </>
  );
}
