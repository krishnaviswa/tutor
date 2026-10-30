"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import "./billing.css";

type BillingMode = "static" | "hourly";

/** Same cohort row as CohortBuilderScreen, plus the billing fields this panel writes. */
type Cohort = {
  id: string;
  name: string;
  student_ids: string[];
  invite_token?: string;
  waitlist?: string[];
  billing_mode?: string;
  hourly_rate_cents?: number | null;
};

type LineItem = {
  key: string;
  label: string;
  hours: string;
  amount: string;
};

type HourlyInvoice = {
  id: string;
  status: string;
  hours: number | null;
  amountCents: number | null;
  lines: LineItem[];
};

export function HourlyBillingPanel({ cohortId }: { cohortId: string }) {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [mode, setMode] = useState<BillingMode>("static");
  const [rate, setRate] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [invoice, setInvoice] = useState<HourlyInvoice | null>(null);
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let live = true;
    api("/api/v1/cohorts")
      .then((body) => {
        if (!live || !Array.isArray(body)) return;
        const row = (body as Cohort[]).find((item) => item && item.id === cohortId);
        if (!row) return;
        setCohort(row);
        if (row.billing_mode === "static" || row.billing_mode === "hourly") setMode(row.billing_mode);
        if (typeof row.hourly_rate_cents === "number") setRate(String(row.hourly_rate_cents));
      })
      .catch((err) => {
        if (!live) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      live = false;
    };
  }, [cohortId]);

  const parsedRate = Number(rate);
  const rateOk = Number.isInteger(parsedRate) && parsedRate > 0;

  async function saveMode() {
    if (mode === "hourly" && !rateOk) {
      setError("Enter an hourly rate in cents greater than 0.");
      setNote("");
      return;
    }
    setBusy("save");
    setError("");
    setNote("");
    try {
      const payload: { billing_mode: BillingMode; hourly_rate_cents?: number } = { billing_mode: mode };
      if (mode === "hourly") payload.hourly_rate_cents = parsedRate;
      const saved = (await api(`/api/v1/cohorts/${cohortId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      })) as Partial<Cohort>;
      if (saved && typeof saved === "object") {
        setCohort((prev) => ({ ...(prev || { id: cohortId, name: "", student_ids: [] }), ...saved }));
        if (saved.billing_mode === "static" || saved.billing_mode === "hourly") setMode(saved.billing_mode);
        if (typeof saved.hourly_rate_cents === "number") setRate(String(saved.hourly_rate_cents));
      }
      setNote("Billing mode saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function createInvoice() {
    if (!startsOn || !endsOn) {
      setError("Choose a start date and an end date.");
      return;
    }
    if (endsOn < startsOn) {
      setError("End date must be on or after the start date.");
      return;
    }
    setBusy("invoice");
    setError("");
    setNote("");
    try {
      const body = await api("/api/v1/invoices/hourly", {
        method: "POST",
        body: JSON.stringify({
          cohort_id: cohortId,
          period_start: `${startsOn}T00:00:00`,
          period_end: `${endsOn}T23:59:59`,
        }),
      });
      const first = Array.isArray(body) ? body[0] : body;
      setInvoice(parseInvoice(first));
      setApproved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  async function approve() {
    if (!invoice?.id) return;
    setBusy("approve");
    setError("");
    try {
      const body = await api(`/api/v1/invoices/${invoice.id}/approve`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      const next = parseInvoice(body);
      setInvoice((prev) => ({
        id: next.id || prev?.id || "",
        status: next.status || prev?.status || "",
        hours: next.hours ?? prev?.hours ?? null,
        amountCents: next.amountCents ?? prev?.amountCents ?? null,
        lines: next.lines.length ? next.lines : prev?.lines || [],
      }));
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy("");
    }
  }

  const showApprove = !!invoice && invoice.status === "pending_review" && !approved && !!invoice.id;

  return (
    <section className="studio-panel">
      <div>
        <h2 className="studio-title">Hourly billing</h2>
        <p className="studio-muted">
          {cohort?.name || cohortId}
          {cohort ? ` · ${(cohort.student_ids || []).length} students` : ""}
        </p>
      </div>
      {error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}
      {note ? <p className="studio-muted">{note}</p> : null}
      <fieldset className="studio-field">
        <legend className="studio-muted">Billing mode</legend>
        <div className="studio-choice">
          <label>
            <input
              type="radio"
              name={`billing-mode-${cohortId}`}
              checked={mode === "static"}
              onChange={() => setMode("static")}
            />
            static
          </label>
          <label>
            <input
              type="radio"
              name={`billing-mode-${cohortId}`}
              checked={mode === "hourly"}
              onChange={() => setMode("hourly")}
            />
            hourly
          </label>
        </div>
      </fieldset>
      {mode === "hourly" ? (
        <label className="studio-field">
          Hourly rate (cents)
          <input
            className="studio-input"
            type="number"
            min={1}
            step={1}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
          <span>{rateOk ? `${formatUnits(parsedRate)} per hour` : "Rate must be greater than 0."}</span>
        </label>
      ) : null}
      <div className="studio-actions">
        <button type="button" className="studio-btn" disabled={busy !== "" || (mode === "hourly" && !rateOk)} onClick={() => void saveMode()}>
          {busy === "save" ? "Saving…" : "Save billing mode"}
        </button>
      </div>
      <div className="studio-split">
        <label className="studio-field">
          Starts on
          <input className="studio-input" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
        </label>
        <label className="studio-field">
          Ends on
          <input className="studio-input" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </label>
      </div>
      <div className="studio-actions">
        <button type="button" className="studio-btn" disabled={busy !== ""} onClick={() => void createInvoice()}>
          {busy === "invoice" ? "Creating…" : "Create hourly invoice"}
        </button>
        {showApprove ? (
          <button type="button" className="studio-btn studio-btn--quiet" disabled={busy !== ""} onClick={() => void approve()}>
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        ) : null}
      </div>
      {invoice ? (
        <>
          <dl className="studio-meta">
            <div>
              <dt>Status</dt>
              <dd>{invoice.status || "—"}</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{invoice.hours == null ? "—" : invoice.hours}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{invoice.amountCents == null ? "—" : formatUnits(invoice.amountCents)}</dd>
            </div>
          </dl>
          {invoice.lines.length > 0 ? (
            <ul className="studio-list">
              {invoice.lines.map((line) => (
                <li key={line.key}>
                  <span>
                    {line.label}
                    {line.hours ? <span className="studio-muted"> · {line.hours} h</span> : null}
                  </span>
                  <span>{line.amount}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function formatUnits(cents: number) {
  return (cents / 100).toFixed(2);
}

function unwrap(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return {};
  const row = body as Record<string, unknown>;
  if (typeof row.status !== "string" && row.invoice && typeof row.invoice === "object") {
    return row.invoice as Record<string, unknown>;
  }
  return row;
}

function parseInvoice(body: unknown): HourlyInvoice {
  const row = unwrap(body);
  const hoursRaw = row.hours ?? row.hours_billed;
  const linesRaw = Array.isArray(row.sessions)
    ? row.sessions
    : Array.isArray(row.line_items)
      ? row.line_items
      : Array.isArray(row.lines)
        ? row.lines
        : [];
  return {
    id: typeof row.id === "string" ? row.id : "",
    status: typeof row.status === "string" ? row.status : "",
    hours: typeof hoursRaw === "number" ? hoursRaw : null,
    amountCents: typeof row.amount_cents === "number" ? row.amount_cents : null,
    lines: linesRaw.map((item, i) => {
      if (!item || typeof item !== "object") {
        return { key: String(i), label: String(item), hours: "", amount: "" };
      }
      const line = item as Record<string, unknown>;
      return {
        key: typeof line.id === "string" ? line.id : String(i),
        label: String(line.label ?? line.description ?? line.title ?? `Line ${i + 1}`),
        hours: typeof line.hours === "number" ? String(line.hours) : "",
        amount: typeof line.amount_cents === "number" ? formatUnits(line.amount_cents) : "",
      };
    }),
  };
}
