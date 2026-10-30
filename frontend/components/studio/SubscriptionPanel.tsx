"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import "./billing.css";

/** Existing owner quota route. It may later include tier, status, period_end, invoices. */
const SUBSCRIPTION_PATH = "/api/v1/billing/subscription";
const CHANGE_PATH = "/api/v1/billing/subscription/tier";
const CANCEL_PATH = "/api/v1/billing/subscription/cancel";

const TIERS = ["starter", "cohort", "institute"] as const;
type Tier = (typeof TIERS)[number];

const PLACEHOLDER_CENTS: Record<Tier, number> = {
  starter: 0,
  cohort: 4900,
  institute: 14900,
};

type ListedInvoice = {
  id?: string;
  status?: string;
  amount_cents?: number;
};

type SubscriptionView = {
  tier: Tier | null;
  tierLabel: string;
  status: string;
  periodEnd: string;
  invoices: ListedInvoice[];
};

function formatUnits(cents: number) {
  return (cents / 100).toFixed(2);
}

function failMessage(err: unknown, notFound: string) {
  const msg = err instanceof Error ? err.message : String(err);
  if (/^404\b/.test(msg)) return notFound;
  return msg;
}

function isTier(value: string): value is Tier {
  return value === "starter" || value === "cohort" || value === "institute";
}

function readInvoices(raw: unknown): ListedInvoice[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((row): row is ListedInvoice => !!row && typeof row === "object");
}

function parseSubscription(body: unknown): SubscriptionView {
  const row = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const tierRaw = typeof row.tier === "string" ? row.tier : "";
  const period = row.period_end ?? row.current_period_end;
  return {
    tier: isTier(tierRaw) ? tierRaw : null,
    tierLabel: tierRaw,
    status: typeof row.status === "string" ? row.status : "",
    periodEnd: period == null || period === "" ? "" : String(period),
    invoices: readInvoices(row.invoices),
  };
}

function moveLabel(from: Tier | null, to: Tier) {
  if (!from) return `Switch to ${to}`;
  return TIERS.indexOf(to) > TIERS.indexOf(from) ? `Upgrade to ${to}` : `Downgrade to ${to}`;
}

export function SubscriptionPanel() {
  const [sub, setSub] = useState<SubscriptionView | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api(SUBSCRIPTION_PATH)
      .then((body) => {
        if (!live) return;
        setSub(parseSubscription(body));
        setError("");
      })
      .catch((err) => {
        if (!live) return;
        setSub(null);
        setError(failMessage(err, "Subscription is not available."));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [reload]);

  async function changeTier(tier: Tier) {
    setBusy(tier);
    setError("");
    try {
      await api(CHANGE_PATH, {
        method: "POST",
        body: JSON.stringify({ tier }),
      });
      setReload((n) => n + 1);
    } catch (err) {
      setError(failMessage(err, "Could not change the subscription."));
    } finally {
      setBusy("");
    }
  }

  async function cancel() {
    setBusy("cancel");
    setError("");
    try {
      await api(CANCEL_PATH, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setReload((n) => n + 1);
    } catch (err) {
      setError(failMessage(err, "Could not cancel the subscription."));
    } finally {
      setBusy("");
    }
  }

  const bare =
    !!sub && !sub.tierLabel && !sub.status && !sub.periodEnd;

  return (
    <section className="studio-panel">
      <div>
        <h2 className="studio-title">Subscription</h2>
        <p className="studio-muted">Workspace tier, status, and period end.</p>
      </div>
      {error ? (
        <p className="studio-error" role="alert">
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="studio-muted">Loading…</p>
      ) : sub ? (
        <>
          <dl className="studio-meta">
            <div>
              <dt>Tier</dt>
              <dd>{sub.tierLabel || "—"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{sub.status || "—"}</dd>
            </div>
            <div>
              <dt>Period end</dt>
              <dd>{sub.periodEnd || "—"}</dd>
            </div>
          </dl>
          {bare ? (
            <p className="studio-muted">Tier, status, and period end are not in this response.</p>
          ) : null}
          {sub.invoices.length > 0 ? (
            <ul className="studio-list">
              {sub.invoices.map((inv, i) => (
                <li key={inv.id || String(i)}>
                  <span>{inv.id || "Invoice"}</span>
                  <span className="studio-muted">
                    {inv.status || "—"}
                    {typeof inv.amount_cents === "number" ? ` · ${formatUnits(inv.amount_cents)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      <div className="studio-cards">
        {TIERS.map((tier) => {
          const current = sub?.tier === tier;
          return (
            <article key={tier} className={current ? "studio-card studio-card--current" : "studio-card"}>
              <h3 className="studio-card__title">{tier}</h3>
              <p className="studio-price">{formatUnits(PLACEHOLDER_CENTS[tier])}</p>
              <p className="studio-muted">Placeholder price</p>
              <button
                type="button"
                className="studio-btn"
                disabled={current || busy !== ""}
                onClick={() => void changeTier(tier)}
              >
                {busy === tier ? "Saving…" : current ? "Current" : moveLabel(sub?.tier ?? null, tier)}
              </button>
            </article>
          );
        })}
      </div>
      <div className="studio-actions">
        <button
          type="button"
          className="studio-btn studio-btn--quiet"
          disabled={busy !== "" || sub?.status === "canceled"}
          onClick={() => void cancel()}
        >
          {busy === "cancel" ? "Canceling…" : "Cancel subscription"}
        </button>
        <button
          type="button"
          className="studio-btn studio-btn--quiet"
          disabled={busy !== ""}
          onClick={() => {
            const pausing = sub?.status !== "paused";
            setBusy(pausing ? "pause" : "resume");
            setError("");
            api(pausing ? "/api/v1/billing/subscription/pause" : "/api/v1/billing/subscription/resume", {
              method: "POST",
              body: JSON.stringify({}),
            })
              .then(() => setReload((n) => n + 1))
              .catch((err) => setError(failMessage(err, "Could not update the subscription.")))
              .finally(() => setBusy(""));
          }}
        >
          {busy === "pause" || busy === "resume" ? "Saving…" : sub?.status === "paused" ? "Resume" : "Pause"}
        </button>
      </div>
    </section>
  );
}
