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
};

export function PayoutsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/payouts")
      .then((data) => setRows(data as Row[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

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
            </div>
          </div>
        ))
      )}
    </>
  );
}
