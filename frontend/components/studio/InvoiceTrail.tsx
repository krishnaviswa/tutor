"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import "./billing.css";

type TrailEvent = {
  key: string;
  kind: string;
  when: string;
  detail: string;
};

type InvoiceView = {
  id: string;
  status: string;
  amountCents: number | null;
  events: TrailEvent[];
  receipt: string;
};

const KNOWN = ["created", "payment_attempted", "paid", "refunded"];

export function InvoiceTrail({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api(`/api/v1/invoices/${invoiceId}`)
      .then((body) => {
        if (!live) return;
        setInvoice(parseInvoice(body, invoiceId));
        setError("");
      })
      .catch((err) => {
        if (!live) return;
        setInvoice(null);
        const msg = err instanceof Error ? err.message : String(err);
        setError(/^404\b/.test(msg) ? "Invoice not found." : msg);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [invoiceId, reload]);

  async function onRefund(e: FormEvent) {
    e.preventDefault();
    const cents = Number(amount);
    if (!Number.isInteger(cents) || cents <= 0) {
      setError("Refund amount must be a whole number of cents greater than 0.");
      setNote("");
      return;
    }
    if (!reason.trim()) {
      setError("Enter a reason for the refund.");
      setNote("");
      return;
    }
    setBusy(true);
    setError("");
    setNote("");
    try {
      await api(`/api/v1/invoices/${invoiceId}/refund`, {
        method: "POST",
        body: JSON.stringify({ amount_cents: cents, reason: reason.trim() }),
      });
      setAmount("");
      setReason("");
      setNote("Refund submitted.");
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="studio-panel">
      <div>
        <h2 className="studio-title">Invoice trail</h2>
        <p className="studio-muted">{invoice?.id || invoiceId}</p>
      </div>
      {error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="studio-muted">{note}</p> : null}
      {loading ? (
        <p className="studio-muted">Loading…</p>
      ) : invoice ? (
        <>
          <dl className="studio-meta">
            <div>
              <dt>Status</dt>
              <dd>{invoice.status || "—"}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{invoice.amountCents == null ? "—" : formatUnits(invoice.amountCents)}</dd>
            </div>
          </dl>
          <div>
            <h3 className="studio-card__title">Events</h3>
            {invoice.events.length === 0 ? (
              <p className="studio-muted">No events yet.</p>
            ) : (
              <ul className="studio-list">
                {invoice.events.map((event) => (
                  <li key={event.key}>
                    <span>
                      {labelFor(event.kind)}
                      {event.detail ? <span className="studio-muted"> · {event.detail}</span> : null}
                    </span>
                    <span className="studio-muted">{event.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="studio-card__title">Receipt</h3>
            {invoice.receipt ? (
              <pre className="studio-receipt">{invoice.receipt}</pre>
            ) : (
              <p className="studio-muted">No receipt stored.</p>
            )}
          </div>
        </>
      ) : null}
      <form onSubmit={onRefund}>
        <h3 className="studio-card__title">Refund</h3>
        <p className="studio-muted">Owners can refund. Other roles are rejected by the API.</p>
        <label className="studio-field">
          Amount (cents)
          <input
            className="studio-input"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label className="studio-field">
          Reason
          <input className="studio-input" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </label>
        <div className="studio-actions">
          <button type="submit" className="studio-btn" disabled={busy}>
            {busy ? "Submitting…" : "Refund"}
          </button>
        </div>
      </form>
    </section>
  );
}

function formatUnits(cents: number) {
  return (cents / 100).toFixed(2);
}

function labelFor(kind: string) {
  return KNOWN.includes(kind) ? kind : kind || "event";
}

function parseInvoice(body: unknown, fallbackId: string): InvoiceView {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    id: typeof row.id === "string" ? row.id : fallbackId,
    status: typeof row.status === "string" ? row.status : "",
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : null,
    events: readEvents(row.events),
    receipt: readReceipt(row.receipt),
  };
}

function readReceipt(receipt: unknown) {
  if (typeof receipt === "string") return receipt;
  if (receipt && typeof receipt === "object") {
    const rec = receipt as Record<string, unknown>;
    if (typeof rec.text === "string") return rec.text;
    if (typeof rec.body === "string") return rec.body;
  }
  return "";
}

function readEvents(raw: unknown): TrailEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item === "string") return { key: String(i), kind: item, when: "", detail: "" };
    if (!item || typeof item !== "object") return { key: String(i), kind: "event", when: "", detail: "" };
    const event = item as Record<string, unknown>;
    const kind = String(event.type ?? event.kind ?? event.event ?? event.event_type ?? "event");
    const when = String(event.at ?? event.created_at ?? event.occurred_at ?? "");
    const bits: string[] = [];
    if (typeof event.amount_cents === "number") bits.push(formatUnits(event.amount_cents));
    if (typeof event.reason === "string" && event.reason) bits.push(event.reason);
    if (typeof event.note === "string" && event.note) bits.push(event.note);
    const key = typeof event.id === "string" ? event.id : `${kind}-${i}`;
    return { key, kind, when, detail: bits.join(" · ") };
  });
}
