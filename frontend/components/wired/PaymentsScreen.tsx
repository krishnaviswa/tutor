"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err, rupees } from "./bits";

type Inv = { id: string; amount_cents: number; status: string };

export function PaymentsScreen() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/api/v1/invoices/mine")
      .then((data) => setRows(data as Inv[]))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function pay(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/payments/checkout", {
        method: "POST",
        body: JSON.stringify({ invoice_id: id }),
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
      <AppBar title="Fees" />
      <div className="appwrap">
        <Err message={error} />
        {rows.length === 0 ? (
          <Empty>No invoices.</Empty>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="card">
              <div className="sb">
                <div>
                  <div className="t">{rupees(r.amount_cents)}</div>
                  <div className="s muted">{r.status}</div>
                </div>
                {r.status !== "paid" ? (
                  <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void pay(r.id)}>
                    Pay (mock)
                  </button>
                ) : (
                  <span className="pill is-good">paid</span>
                )}
              </div>
            </div>
          ))
        )}
        <div className="card card--wash">
          <p className="muted">Checkout hits the mock payments port. No live Razorpay.</p>
        </div>
      </div>
    </>
  );
}
