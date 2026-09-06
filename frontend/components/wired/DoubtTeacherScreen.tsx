"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Doubt = {
  id: string;
  student_id: string;
  body: string;
  status: string;
  answer?: string | null;
  queue_position?: number;
  sla_hours?: number;
};

export function DoubtTeacherScreen() {
  const [rows, setRows] = useState<Doubt[]>([]);
  const [sel, setSel] = useState<Doubt | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/doubts/queue")
      .then((data) => setRows(data as Doubt[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve() {
    if (!sel) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/doubts/${sel.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "answered", answer }),
      });
      setAnswer("");
      setSel(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h2>Doubts queue</h2>
      <span className="k">{rows.length} open in this workspace</span>
      <Err message={error} />
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {rows.length === 0 ? (
            <Empty>Queue is empty.</Empty>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                type="button"
                className={sel?.id === r.id ? "hot hot--row" : "card"}
                style={{ width: "100%", textAlign: "left" }}
                onClick={() => {
                  setSel(r);
                  setAnswer(r.answer || "");
                }}
              >
                <div className="t">{r.body}</div>
                <div className="s muted">
                  {r.status}
                  {r.queue_position != null || r.sla_hours != null
                    ? ` · #${r.queue_position ?? "—"} · ${r.sla_hours ?? 0}h`
                    : ""}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="card">
          {sel ? (
            <>
              <h3>{sel.body}</h3>
              <label className="field">
                <span>Answer</span>
                <textarea className="field__in" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} />
              </label>
              <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void resolve()}>
                Mark answered
              </button>
            </>
          ) : (
            <p className="muted">Pick a doubt. Timeline writes on answer — WhatsApp is a channel.</p>
          )}
        </div>
      </div>
    </>
  );
}
