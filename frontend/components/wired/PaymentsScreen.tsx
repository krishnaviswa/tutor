"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err, rupees } from "./bits";

type Inv = {
  id: string;
  amount_cents: number;
  status: string;
  due_on?: string;
  label?: string;
  state?: string;
  receipt_id?: string | null;
};

function pillFor(state?: string) {
  if (state === "paid") return "is-good";
  if (state === "overdue") return "is-bad";
  return "is-warn";
}

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

  const unpaid = rows.filter((r) => r.status !== "paid");
  const paid = rows.filter((r) => r.status === "paid");
  const due = unpaid[0];

  return (
    <>
      <AppBar title="Fees" />
      <div className="appwrap">
        <Err message={error} />
        {rows.length === 0 ? (
          <Empty>No invoices.</Empty>
        ) : (
          <>
            {due ? (
              <div className="card" style={{ borderColor: "color-mix(in srgb, var(--crimson) 40%, var(--line))" }}>
                <div className="k" style={{ color: "var(--crimson)" }}>
                  Due {due.due_on || ""}
                </div>
                <div className="sb" style={{ margin: "6px 0" }}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: "1.4rem" }}>{rupees(due.amount_cents)}</span>
                  <span className={`pill ${pillFor(due.state)}`}>{due.state || due.status}</span>
                </div>
                <div className="muted">
                  {due.label || "Invoice"} · {due.id.slice(-8)}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void pay(due.id)}>
                    Pay (mock)
                  </button>
                </div>
                <p className="muted" style={{ marginTop: 8, fontSize: ".72rem" }}>
                  Checkout hits the mock payments port. No live Razorpay.
                </p>
              </div>
            ) : null}
            <div className="card">
              <div className="k" style={{ marginBottom: 8 }}>
                Receipts & history
              </div>
              {paid.length === 0 && unpaid.length <= 1 ? (
                <p className="muted">No paid receipts yet.</p>
              ) : null}
              {paid.map((r) => (
                <div className="list__i" key={r.id}>
                  <div className="gr">
                    <div className="t" style={{ fontWeight: 400 }}>
                      {r.label || "Paid"} · {rupees(r.amount_cents)}
                    </div>
                    <div className="s">
                      {r.receipt_id || r.id} {r.due_on ? `· ${r.due_on}` : ""}
                    </div>
                  </div>
                  <span className="pill is-good">paid</span>
                </div>
              ))}
              {unpaid.slice(due ? 1 : 0).map((r) => (
                <div className="list__i" key={r.id}>
                  <div className="gr">
                    <div className="t" style={{ fontWeight: 400 }}>
                      {r.label || "Open"} · {rupees(r.amount_cents)}
                    </div>
                    <div className="s">{r.due_on}</div>
                  </div>
                  <button className="btn btn--sm" type="button" disabled={busy} onClick={() => void pay(r.id)}>
                    Pay
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
