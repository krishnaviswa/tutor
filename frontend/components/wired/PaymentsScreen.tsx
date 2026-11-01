"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatWhen, shortId } from "@/lib/format";
import { formatPackHours, readBalanceMinutes } from "@/lib/lessonPack";
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

function humanStatusLabel(state?: string, status?: string): string {
  const key = state || status || "pending";
  if (key === "paid") return "Paid";
  if (key === "overdue") return "Overdue";
  if (key === "pending_review") return "Awaiting Academy Review";
  if (key === "refunded") return "Refunded";
  return "Payment Due";
}

function humanInvoiceCode(inv: Inv): string {
  if (inv.receipt_id && !/^[0-9a-f]{8}-/i.test(inv.receipt_id)) return inv.receipt_id;
  return `INV-${shortId(inv.id).toUpperCase()}`;
}

function showWhen(value?: string | null) {
  return value ? formatWhen(value) : "";
}

function invoiceRows(data: unknown): Inv[] {
  if (Array.isArray(data)) return data as Inv[];
  if (!data || typeof data !== "object") return [];
  const obj = data as { invoices?: unknown; items?: unknown };
  if (Array.isArray(obj.invoices)) return obj.invoices as Inv[];
  if (Array.isArray(obj.items)) return obj.items as Inv[];
  return [];
}

async function packLabelFromApi(): Promise<string | null> {
  const me = (await api("/api/v1/auth/me")) as { role?: string };
  let minutes: number | null = null;
  let studentId = "";
  if (me.role === "parent") {
    const home = (await api("/api/v1/parent/home")) as {
      children?: { student_id?: string }[];
    };
    const child = home.children?.[0];
    studentId = child?.student_id || "";
    minutes = readBalanceMinutes(child) ?? readBalanceMinutes(home);
  } else if (me.role === "student") {
    const dash = (await api("/api/v1/me/dashboard")) as { student_id?: string };
    studentId = dash.student_id || "";
    minutes = readBalanceMinutes(dash);
  }
  if (minutes == null && studentId) {
    const pack = await api(`/api/v1/students/${encodeURIComponent(studentId)}/lesson-pack`);
    minutes = readBalanceMinutes(pack);
  }
  return minutes == null ? null : formatPackHours(minutes);
}

export function PaymentsScreen() {
  const [rows, setRows] = useState<Inv[]>([]);
  const [packLabel, setPackLabel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api("/api/v1/invoices/mine")
      .then((data) => {
        setRows(invoiceRows(data));
        const onInvoices = readBalanceMinutes(data);
        if (onInvoices != null) setPackLabel(formatPackHours(onInvoices));
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    packLabelFromApi()
      .then((label) => {
        if (label) setPackLabel(label);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pay(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/payments/checkout", {
        method: "POST",
        headers: { "Idempotency-Key": id },
        body: JSON.stringify({ invoice_id: id }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const unpaid = rows.filter((r) => r.status !== "paid" && r.status !== "refunded");
  const paid = rows.filter((r) => r.status === "paid");
  const due = unpaid[0];
  const totalPaidCents = paid.reduce((sum, r) => sum + (r.amount_cents || 0), 0);

  return (
    <>
      <AppBar
        title="Fees & Lesson Pack"
        extra={
          packLabel ? (
            <span className="pill is-good">{packLabel} Remaining</span>
          ) : undefined
        }
      />
      <div className="appwrap">
        <div className="page-toolbar">
          <div className="page-toolbar__title">
            <h2>Tuition Fees, Lesson Pack &amp; Receipts</h2>
            <span className="k">
              Check your remaining lesson-pack hours, pay open tuition invoices in ₹, and review official payment receipts
            </span>
          </div>
        </div>

        <Err message={error} />

        <div className="grid g2" style={{ marginBottom: 16 }}>
          {packLabel ? (
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="k">Lesson Pack Balance</div>
              <div className="stat__v" style={{ margin: "6px 0" }}>
                {packLabel}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                Hours left on this pack. Attended &amp; no-show classes deduct 1 hour; teacher cancellations preserve your hour.
              </p>
            </div>
          ) : null}
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="k">Tuition Summary</div>
            <div className="stat__v" style={{ margin: "6px 0" }}>
              {due ? rupees(due.amount_cents) : rupees(0)}
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {due
                ? `Current due on ${showWhen(due.due_on) || "this term"} · ${rupees(totalPaidCents)} paid to date`
                : `All invoices settled · ${rupees(totalPaidCents)} paid to date`}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <Empty>No fee invoices on file yet.</Empty>
        ) : (
          <>
            {due ? (
              <div className="card" style={{ borderColor: "color-mix(in srgb, var(--crimson) 40%, var(--line))" }}>
                <div className="sb" style={{ marginBottom: 6 }}>
                  <span className="k" style={{ color: "var(--crimson)" }}>
                    Due {showWhen(due.due_on) || "Now"}
                  </span>
                  <span className={`pill ${pillFor(due.state)}`}>
                    {humanStatusLabel(due.state, due.status)}
                  </span>
                </div>
                <div className="sb" style={{ margin: "6px 0" }}>
                  <span className="stat__v">{rupees(due.amount_cents)}</span>
                  <span className="muted">
                    {due.label || "Term Tuition"} · {humanInvoiceCode(due)}
                  </span>
                </div>

                <div className="card card--wash" style={{ padding: "10px 14px", margin: "10px 0" }}>
                  <div className="k" style={{ marginBottom: 2 }}>Payment Consequence Preview</div>
                  <div className="s" style={{ color: "var(--ink)" }}>
                    {due.status === "pending_review"
                      ? "This hourly statement is awaiting academy verification before payment opens."
                      : `Paying ${rupees(due.amount_cents)} immediately marks ${due.label || "this invoice"} (${humanInvoiceCode(due)}) as Paid and generates your official receipt.`}
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  {due.status === "pending_review" ? (
                    <p className="muted">Waiting for the academy to approve this hourly invoice.</p>
                  ) : (
                    <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void pay(due.id)}>
                      {busy ? "Processing Payment…" : `Pay ${rupees(due.amount_cents)}`}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className="card">
              <div className="k" style={{ marginBottom: 8 }}>
                Receipts &amp; Payment History
              </div>
              {paid.length === 0 && unpaid.length <= 1 ? (
                <p className="muted">No paid receipts yet.</p>
              ) : null}
              {paid.map((r) => (
                <div className="list__i" key={r.id}>
                  <div className="gr">
                    <div className="t" style={{ fontWeight: 500 }}>
                      {r.label || "Tuition Fee"} · {rupees(r.amount_cents)}
                    </div>
                    <div className="s">
                      Receipt {humanInvoiceCode(r)} {showWhen(r.due_on) ? `· Paid (${showWhen(r.due_on)})` : ""}
                    </div>
                  </div>
                  <span className="pill is-good">Paid</span>
                </div>
              ))}
              {unpaid.slice(due ? 1 : 0).map((r) => (
                <div className="list__i" key={r.id}>
                  <div className="gr">
                    <div className="t" style={{ fontWeight: 500 }}>
                      {r.label || "Upcoming Installment"} · {rupees(r.amount_cents)}
                    </div>
                    <div className="s">
                      {humanInvoiceCode(r)} {showWhen(r.due_on) ? `· Due ${showWhen(r.due_on)}` : ""}
                    </div>
                  </div>
                  {r.status === "pending_review" ? (
                    <span className="pill is-warn">Awaiting Approval</span>
                  ) : (
                    <button className="btn btn--sm" type="button" disabled={busy} onClick={() => void pay(r.id)}>
                      Pay {rupees(r.amount_cents)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
