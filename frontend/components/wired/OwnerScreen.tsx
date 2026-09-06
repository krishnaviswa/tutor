"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err, rupees } from "./bits";

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

export function OwnerScreen() {
  const [data, setData] = useState<Console | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceCurrent | null>(null);
  const [error, setError] = useState("");

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
      <h2>{data?.workspace?.name || "Owner console"}</h2>
      <span className="k">Operating scorecard · same event log</span>
      <Err message={error} />
      {!data ? (
        <Empty>Loading…</Empty>
      ) : (
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
              <h3>Cohort P&L</h3>
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
      )}
      <div className="card card--wash">
        <p className="muted">Every number here is derived from the same event log — sessions, attempts, doubts, payments. Quotas still throttle metered send, not always-on core.</p>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link href={catalogRoute("subscription")} className="hot hot--btn ghost">
          Plan & usage
        </Link>
        <Link href={catalogRoute("payouts")} className="btn btn--sm">
          Payouts
        </Link>
      </div>
    </>
  );
}
