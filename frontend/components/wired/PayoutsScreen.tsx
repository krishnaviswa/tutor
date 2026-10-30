"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err, rupees } from "./bits";

type Row = {
  id: string;
  amount_cents: number;
  status: string;
  teacher_name?: string;
  period?: string;
  sessions?: number;
  explanation?: string;
};

const NEXT: Record<string, string> = { pending: "approved", approved: "paid" };

export function PayoutsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function load() {
    api("/api/v1/payouts")
      .then((data) => setRows(data as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function advance(row: Row) {
    const next = NEXT[row.status];
    if (!next) return;
    setBusy(row.id);
    setError("");
    try {
      await api(`/api/v1/payouts/${row.id}/advance`, {
        method: "POST",
        body: JSON.stringify({ status: next }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <h2>Payouts</h2>
      <span className="k">Owner only</span>
      <Err message={error} />
      {rows.length === 0 ? (
        <Empty>No payouts yet.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="list__i">
            <div className="gr">
              <div className="t">{rupees(r.amount_cents)}</div>
              <div className="s">
                {[
                  r.teacher_name,
                  r.period,
                  r.sessions != null ? `${r.sessions} sessions` : null,
                  r.status,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              {r.explanation ? <div className="s muted">{r.explanation}</div> : null}
            </div>
            {NEXT[r.status] ? (
              <button className="btn btn--sm" type="button" disabled={busy === r.id} onClick={() => void advance(r)}>
                {busy === r.id ? "Saving…" : `Mark ${NEXT[r.status]}`}
              </button>
            ) : null}
          </div>
        ))
      )}
    </>
  );
}
