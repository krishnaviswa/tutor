"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err, rupees } from "./bits";

type Row = {
  id: string;
  amount_cents: number;
  status: string;
  teacher_name?: string;
  period?: string;
  sessions?: number;
  delivered?: number | unknown[] | null;
  hours?: number | string | null;
  explanation?: string;
};

function deliveredCount(value: Row["delivered"]): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function deliveredLine(value: Row["delivered"]): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return `${value} delivered`;
  if (Array.isArray(value)) return `${value.length} delivered`;
  return null;
}

function hoursNumber(value: Row["hours"]): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100) / 100;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
  }
  return 0;
}

function hoursLine(value: Row["hours"]): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value * 100) / 100;
    const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
    return `${text} ${rounded === 1 ? "hour" : "hours"}`;
  }
  if (typeof value === "string" && value.trim()) return `${value.trim()} hours`;
  return null;
}

function formatExplanation(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/\b(\d+)\s*cents\b/gi, (_, centsStr: string) => rupees(Number(centsStr)));
}

function statusBadge(status: string): { label: string; tone: string } {
  if (status === "paid") return { label: "Paid & Settled", tone: "is-good" };
  if (status === "approved") return { label: "Approved · Ready to Pay", tone: "is-info" };
  return { label: "Pending Verification", tone: "is-warn" };
}

const NEXT: Record<string, string> = { pending: "approved", approved: "paid" };
const NEXT_LABEL: Record<string, string> = {
  pending: "Approve Statement",
  approved: "Record Payout Paid",
};

export function PayoutsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  function load() {
    api("/api/v1/payouts")
      .then((data) => setRows(Array.isArray(data) ? (data as Row[]) : []))
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

  const totalPayoutCents = rows.reduce((sum, r) => sum + (r.amount_cents || 0), 0);
  const totalDelivered = rows.reduce((sum, r) => sum + deliveredCount(r.delivered), 0);
  const totalHours = Math.round(rows.reduce((sum, r) => sum + hoursNumber(r.hours), 0) * 100) / 100;
  const openStatements = rows.filter((r) => r.status !== "paid").length;

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Teacher Payouts &amp; Settlements</h2>
          <span className="k">
            Verify delivered teaching hours from completed classes and approve or settle faculty payout statements
          </span>
        </div>
        <div className="page-toolbar__actions">
          <Link href={catalogRoute("billing")} className="btn btn--sm">
            Student Billing
          </Link>
          <Link href={catalogRoute("owner")} className="btn btn--sm">
            Owner Overview
          </Link>
        </div>
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="stat__v">{rupees(totalPayoutCents)}</div>
          <div className="stat__l">Calculated Payout Total</div>
        </div>
        <div className="stat">
          <div className="stat__v">{totalDelivered}</div>
          <div className="stat__l">Verified Delivered Sessions</div>
        </div>
        <div className="stat">
          <div className="stat__v">{totalHours} hrs</div>
          <div className="stat__l">Verified Teaching Hours</div>
        </div>
        <div className="stat">
          <div className="stat__v">{openStatements}</div>
          <div className="stat__l">Statements Awaiting Action</div>
        </div>
      </div>

      <div className="card card--wash" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div className="k" style={{ marginBottom: 4 }}>How Payouts Are Verified</div>
        <p className="muted" style={{ margin: 0 }}>
          Delivered sessions count classes where the student attended with the teacher marked present. Approving a statement locks the verified teaching hours before settlement.
        </p>
      </div>

      <Err message={error} />

      {rows.length === 0 ? (
        <Empty>No teacher payout statements generated yet.</Empty>
      ) : (
        rows.map((r) => {
          const badge = statusBadge(r.status);
          const deliv = deliveredLine(r.delivered);
          const hrs = hoursLine(r.hours);
          const teacherName = r.teacher_name || "Faculty Member";
          return (
            <div key={r.id} className="card">
              <div className="sb" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="row" style={{ gap: 10 }}>
                  <Av name={teacherName} />
                  <div>
                    <div className="t">
                      {teacherName} · {rupees(r.amount_cents)}
                    </div>
                    <div className="s">
                      {[
                        r.period,
                        deliv,
                        hrs,
                        r.sessions != null ? `${r.sessions} sessions` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {r.explanation ? (
                      <div className="s muted" style={{ marginTop: 2 }}>
                        {formatExplanation(r.explanation)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <span className={`pill ${badge.tone}`}>{badge.label}</span>
                  {NEXT[r.status] ? (
                    <button
                      className="hot hot--btn"
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => void advance(r)}
                    >
                      {busy === r.id ? "Updating…" : NEXT_LABEL[r.status] || `Mark ${NEXT[r.status]}`}
                    </button>
                  ) : null}
                </div>
              </div>

              {NEXT[r.status] ? (
                <div className="s muted" style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line-soft)" }}>
                  <b>Consequence Preview:</b>{" "}
                  {r.status === "pending"
                    ? `Approving confirms ${hrs || "0 hours"} across ${deliv || "0 delivered"} for ${teacherName} (${rupees(r.amount_cents)}).`
                    : `Recording paid marks ${rupees(r.amount_cents)} as settled on ${teacherName}'s statement.`}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </>
  );
}
