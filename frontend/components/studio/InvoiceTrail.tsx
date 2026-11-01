"use client";

import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { formatInr, formatWhen, maskIds } from "@/lib/format";

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
  refundedCents: number;
  events: TrailEvent[];
  receipt: string;
};

const REFUND_PRESET_RUPEES = [2500, 4500, 9000, 18000] as const;

const REFUND_REASONS = [
  "Schedule conflict",
  "Duplicate payment",
  "Course withdrawal",
  "Service credit",
] as const;

export function InvoiceTrail({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [amountPreset, setAmountPreset] = useState("");
  const [customRupees, setCustomRupees] = useState("");
  const [reason, setReason] = useState<string>(REFUND_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    api("/api/v1/auth/me")
      .then((body) => {
        if (!live) return;
        const next = body && typeof body === "object" ? (body as { role?: unknown }).role : "";
        setRole(typeof next === "string" ? next : "");
      })
      .catch(() => {
        if (live) setRole("");
      });
    return () => {
      live = false;
    };
  }, []);

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

  const remainingCents =
    invoice?.amountCents == null ? 0 : Math.max(0, invoice.amountCents - invoice.refundedCents);
  const choices = refundChoices(remainingCents);
  const maxRupees = Math.floor(remainingCents / 100);
  const preset =
    amountPreset === "custom" || choices.some((choice) => String(choice.cents) === amountPreset)
      ? amountPreset
      : String(choices[choices.length - 1]?.cents ?? "");
  const owner = role === "owner";

  async function onRefund(e: FormEvent) {
    e.preventDefault();
    const cents = preset === "custom" ? Math.round(Number(customRupees) * 100) : Number(preset);
    if (!Number.isInteger(cents) || cents <= 0) {
      setError("Refund amount must be greater than ₹0.");
      setNote("");
      return;
    }
    if (cents > remainingCents) {
      setError("Refund amount cannot be more than the invoice.");
      setNote("");
      return;
    }
    if (!reason.trim()) {
      setError("Select a reason for the refund.");
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
      setCustomRupees("");
      setAmountPreset("");
      setReason(REFUND_REASONS[0]);
      setNote("Refund submitted.");
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const receipt = receiptLine(invoice?.receipt ?? "");

  return (
    <section className="card stack">
      <h3>Invoice trail</h3>
      {error ? (
        <p className="meta-line" role="alert" style={{ color: "var(--crimson)" }}>
          {maskIds(error)}
        </p>
      ) : null}
      {loading ? (
        <p className="meta-line">Loading…</p>
      ) : invoice ? (
        <>
          <div>
            <div className="k">Status</div>
            <div className="t">{invoice.status ? humanize(invoice.status) : "—"}</div>
          </div>
          <div>
            <div className="k">Amount</div>
            <div className="t">{invoice.amountCents == null ? "—" : formatInr(invoice.amountCents)}</div>
          </div>
          <div>
            <div className="k">Events</div>
            {invoice.events.length === 0 ? (
              <p className="meta-line">No events yet.</p>
            ) : (
              <ul>
                {invoice.events.map((event) => {
                  const when = formatWhen(event.when);
                  return (
                    <li key={event.key} className="list__i">
                      <div className="gr">
                        <div className="t">
                          {humanize(event.kind)}
                          {event.detail ? <span className="s"> · {event.detail}</span> : null}
                        </div>
                      </div>
                      {when ? <span className="s">{when}</span> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <p className="meta-line">{receipt || "No receipt yet"}</p>
        </>
      ) : null}
      {owner && invoice && choices.length > 0 ? (
        <form className="form-stack" onSubmit={onRefund}>
          <h3>Refund</h3>
          <div className="form-row">
            <label className="field">
              <span>Refund amount</span>
              <select className="field__in" value={preset} onChange={(e) => setAmountPreset(e.target.value)}>
                {choices.map((opt) => (
                  <option key={opt.cents} value={String(opt.cents)}>
                    {opt.label}
                  </option>
                ))}
                {maxRupees >= 1 ? <option value="custom">Custom amount…</option> : null}
              </select>
            </label>
            <label className="field">
              <span>Reason</span>
              <select className="field__in" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REFUND_REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {preset === "custom" ? (
            <label className="field">
              <span>Custom refund amount (₹)</span>
              <input
                className="field__in"
                type="number"
                min={1}
                max={maxRupees}
                step={1}
                value={customRupees}
                onChange={(e) => setCustomRupees(e.target.value)}
                placeholder="Enter refund in ₹"
                required
              />
            </label>
          ) : null}
          <div className="form-actions">
            <button type="submit" className="hot hot--btn" disabled={busy}>
              {busy ? "Submitting…" : "Refund"}
            </button>
            {note ? <p className="meta-line">{note}</p> : null}
          </div>
        </form>
      ) : null}
    </section>
  );
}

function refundChoices(remainingCents: number) {
  if (remainingCents <= 0) return [];
  const seen = new Set<number>();
  const cents = [
    ...REFUND_PRESET_RUPEES.map((rupees) => rupees * 100).filter((value) => value < remainingCents),
    remainingCents,
  ];
  return cents
    .filter((value) => {
      if (seen.has(value) || value <= 0) return false;
      seen.add(value);
      return true;
    })
    .map((value) => ({ cents: value, label: formatInr(value) }));
}

function humanize(kind: string) {
  const text = (kind || "event").replace(/_/g, " ").trim();
  if (!text) return "—";
  return text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function receiptLine(receipt: string) {
  const text = receipt.trim();
  if (!text) return "";
  const code = text.match(/\bRCT-[A-Za-z0-9]+\b/);
  if (code) return `Receipt ${code[0].toUpperCase()}`;
  return maskIds(text)
    .replace(/amount_cents\s+\d+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInvoice(body: unknown, fallbackId: string): InvoiceView {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    id: typeof row.id === "string" ? row.id : fallbackId,
    status: typeof row.status === "string" ? row.status : "",
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : null,
    refundedCents: typeof row.refunded_cents === "number" ? row.refunded_cents : 0,
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
    if (typeof event.amount_cents === "number") bits.push(formatInr(event.amount_cents));
    if (typeof event.reason === "string" && event.reason) bits.push(maskIds(event.reason));
    if (typeof event.note === "string" && event.note) bits.push(maskIds(event.note));
    const key = typeof event.id === "string" ? event.id : `${kind}-${i}`;
    return { key, kind, when, detail: bits.join(" · ") };
  });
}
