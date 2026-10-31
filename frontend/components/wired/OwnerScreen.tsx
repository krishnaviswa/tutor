"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Err, Loading, rupees } from "./bits";

type Meter = { meter_key: string; used: number; cap: number; warn: boolean; block: boolean };
type Console = {
  workspace?: { name: string; slug: string } | null;
  usage: Meter[];
  scorecard?: {
    sessions_done: number;
    sessions_plan: number;
    active_students: number;
    practice_pct: number;
    doubt_sla_pct: number;
    revenue_cents: number;
    collected_pct: number;
    churn_risk: number;
  };
  teachers?: { name: string; sessions: number; sla_pct: number }[];
  cohort_pnl?: { name: string; in_cents: number; margin_pct: number }[];
};

type WorkspaceCurrent = {
  auth_methods?: string[];
  preview_mode?: boolean;
};

const ENQUIRY_PACKAGES = [
  { value: "4", label: "Starter Pack (4 hrs)" },
  { value: "8", label: "Standard Pack (8 hrs)" },
  { value: "16", label: "Term Pack (16 hrs)" },
  { value: "24", label: "Intensive Pack (24 hrs)" },
] as const;

function errorDetail(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart)) as { detail?: unknown };
      const detail = body.detail;
      if (typeof detail === "string" && detail) return detail;
      if (Array.isArray(detail)) {
        const parts = detail
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
            return "";
          })
          .filter(Boolean);
        if (parts.length) return parts.join(" ");
      }
    } catch {
      /* keep the raw message */
    }
  }
  return raw;
}

export function OwnerScreen() {
  const [data, setData] = useState<Console | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceCurrent | null>(null);
  const [error, setError] = useState("");
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryHours, setEnquiryHours] = useState("8");
  const [enquiryOk, setEnquiryOk] = useState("");
  const [enquiryError, setEnquiryError] = useState("");
  const [enquiryBusy, setEnquiryBusy] = useState(false);

  async function submitEnquiry(event: FormEvent) {
    event.preventDefault();
    if (enquiryBusy) return;
    setEnquiryBusy(true);
    setEnquiryOk("");
    setEnquiryError("");
    const rawHours = enquiryHours.trim();
    const hours = rawHours !== "" && Number.isFinite(Number(rawHours)) ? Number(rawHours) : 8;
    try {
      const result = await api("/api/v1/owner/enquiries", {
        method: "POST",
        body: JSON.stringify({
          name: enquiryName.trim(),
          phone: enquiryPhone.trim(),
          hours,
        }),
      });
      const detail =
        result &&
        typeof result === "object" &&
        "detail" in result &&
        typeof (result as { detail?: unknown }).detail === "string"
          ? (result as { detail: string }).detail
          : "Enquiry saved.";
      setEnquiryOk(detail);
      setEnquiryName("");
      setEnquiryPhone("");
      setEnquiryHours("8");
    } catch (err) {
      setEnquiryError(errorDetail(err));
    } finally {
      setEnquiryBusy(false);
    }
  }

  useEffect(() => {
    Promise.all([api("/api/v1/owner/console"), api("/api/v1/usage")])
      .then(([consoleRow, usageRow]) => {
        const c = consoleRow as Console;
        const meters = (usageRow as { meters?: Console["usage"] }).meters;
        setData({ ...c, usage: meters ?? c.usage });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    api("/api/v1/workspaces/current")
      .then((row) => setWorkspace(row as WorkspaceCurrent))
      .catch(() => undefined);
  }, []);

  const sc = data?.scorecard;

  return (
    <>
      <div className="sb" style={{ marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2>{data?.workspace?.name || "Owner console"}</h2>
          <span className="k">Operating scorecard · same event log</span>
        </div>
        <button
          type="button"
          className={showEnquiry ? "btn btn--sm" : "hot hot--btn"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setShowEnquiry((prev) => !prev)}
        >
          {showEnquiry ? "Hide enquiry form" : "+ New Student Enquiry"}
        </button>
      </div>

      {!data && !error ? <Loading>Loading the scorecard…</Loading> : null}
      <Err message={error} />

      {data ? (
        <>
          {sc ? (
            <div className="grid g3" style={{ marginBottom: 14 }}>
              <div className="stat">
                <div className="stat__v">
                  {sc.sessions_done}
                  <span style={{ fontSize: ".9rem", color: "var(--ink-faint)" }}>/{sc.sessions_plan}</span>
                </div>
                <div className="stat__l">Sessions delivered</div>
              </div>
              <div className="stat">
                <div className="stat__v">{sc.active_students}</div>
                <div className="stat__l">Active students</div>
              </div>
              <div className="stat">
                <div className="stat__v">{sc.practice_pct}%</div>
                <div className="stat__l">Practice completion</div>
              </div>
              <div className="stat">
                <div className="stat__v">{sc.doubt_sla_pct}%</div>
                <div className="stat__l">Doubt SLA met</div>
              </div>
              <div className="stat">
                <div className="stat__v">{rupees(sc.revenue_cents)}</div>
                <div className="stat__l">Revenue booked</div>
                <div className="stat__d">
                  <span className="pill is-good">collected {sc.collected_pct}%</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat__v">{sc.churn_risk}</div>
                <div className="stat__l">Churn risk</div>
              </div>
            </div>
          ) : null}
          {workspace && (workspace.auth_methods || workspace.preview_mode !== undefined) ? (
            <p className="muted">Sign-in: {(workspace.auth_methods || []).join(", ")}</p>
          ) : null}
          <div className="grid g2" style={{ alignItems: "start", marginBottom: 14 }}>
            <div className="card">
              <h3>Teachers</h3>
              {(data.teachers ?? []).length === 0 ? (
                <p className="muted">No staff memberships yet.</p>
              ) : (
                (data.teachers ?? []).map((t) => (
                  <div className="list__i" key={t.name}>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                      <Av name={t.name} />
                      <div className="gr">
                        <div className="t">{t.name}</div>
                        <div className="s">
                          {t.sessions} sessions · doubt SLA {t.sla_pct}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="card">
              <h3>Cohort P&amp;L</h3>
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Cohort</th>
                      <th>In</th>
                      <th>Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.cohort_pnl ?? []).map((r) => (
                      <tr key={r.name}>
                        <td>{r.name}</td>
                        <td>{r.in_cents ? rupees(r.in_cents) : "—"}</td>
                        <td>{r.in_cents ? `${r.margin_pct}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="grid g3" style={{ marginBottom: 14 }}>
            {data.usage.map((m) => (
              <div key={m.meter_key} className="stat">
                <div className="stat__v">
                  {m.used}
                  <span style={{ fontSize: ".9rem", color: "var(--ink-faint)" }}>/{m.cap}</span>
                </div>
                <div className="stat__l">{m.meter_key}</div>
                <div className="stat__d">
                  {m.block ? (
                    <span className="pill is-bad">block</span>
                  ) : m.warn ? (
                    <span className="pill is-warn">80%</span>
                  ) : (
                    <span className="pill is-good">ok</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {showEnquiry || enquiryOk || enquiryError ? (
        <form
          className="card"
          aria-label="Enquiry"
          onSubmit={(event) => void submitEnquiry(event)}
          style={{ marginBottom: 14 }}
        >
          <h3>New Student Enquiry &amp; Lesson Pack</h3>
          <div className="grid g3" style={{ gap: 10 }}>
            <label className="field">
              <span>Student Name</span>
              <input
                className="field__in"
                value={enquiryName}
                onChange={(event) => setEnquiryName(event.target.value)}
                placeholder="Full name"
                required
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                className="field__in"
                value={enquiryPhone}
                autoComplete="tel"
                onChange={(event) => setEnquiryPhone(event.target.value)}
                placeholder="+91..."
                required
              />
            </label>
            <label className="field">
              <span>Lesson Pack Size</span>
              <select
                className="field__in"
                value={enquiryHours}
                onChange={(event) => setEnquiryHours(event.target.value)}
              >
                {ENQUIRY_PACKAGES.map((pkg) => (
                  <option key={pkg.value} value={pkg.value}>
                    {pkg.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button className="hot hot--btn" type="submit" disabled={enquiryBusy} style={{ width: "auto", margin: 0 }}>
              {enquiryBusy ? "Saving…" : "Save enquiry"}
            </button>
            <button
              className="btn btn--sm"
              type="button"
              style={{ width: "auto", margin: 0 }}
              onClick={() => setShowEnquiry(false)}
            >
              Close
            </button>
          </div>
          {enquiryOk ? (
            <p className="muted" role="status" style={{ marginTop: 8 }}>
              {enquiryOk}
            </p>
          ) : null}
          <Err message={enquiryError} />
        </form>
      ) : null}

      <div className="card card--wash">
        <p className="muted">
          Every number here is derived from the same event log — sessions, attempts, doubts, payments. Quotas still
          throttle metered send, not always-on core.
        </p>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link href={catalogRoute("subscription")} className="hot hot--btn ghost">
          Plan &amp; usage
        </Link>
        <Link href={catalogRoute("payouts")} className="btn btn--sm">
          Payouts
        </Link>
      </div>
    </>
  );
}
