"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type Row = { id: string; action: string; payload?: unknown; created_at?: string | null };

export function AuditScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    api("/api/v1/audit")
      .then((data) => setRows(data as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  async function exp() {
    setError("");
    try {
      const row = await api("/api/v1/data-export", { method: "POST" });
      setNote(JSON.stringify(row));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <h2>Audit</h2>
      <span className="k">Workspace journal</span>
      <Err message={error} />
      <button className="btn btn--sm" type="button" onClick={() => void exp()}>
        Data export
      </button>
      {note ? <pre className="card" style={{ overflow: "auto" }}>{note}</pre> : null}
      {rows.length === 0 ? (
        <Empty>No audit rows yet.</Empty>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="list__i">
            <div className="gr">
              <div className="t">{r.action}</div>
              <div className="s">{r.created_at}</div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
