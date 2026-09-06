"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err } from "./bits";

type Bar = { day?: string; title?: string; pct: number };
type Dash = {
  sessions: number;
  students: number;
  attempts: number;
  cohort?: { id: string; name: string; size: number } | null;
  attendance_pct?: number;
  attendance_week?: Bar[];
  practice_by_set?: Bar[];
  doubt_backlog?: number;
  at_risk?: { student_id: string; display_name: string; reason: string; tone: string }[];
};

function Bars({ rows }: { rows: Bar[] }) {
  if (!rows.length) return <p className="muted">No sessions in the last week.</p>;
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar" key={r.day || r.title}>
          <b style={{ height: `${Math.max(r.pct, 4)}%` }} />
          <em>{r.day || r.title || `${r.pct}%`}</em>
        </div>
      ))}
    </div>
  );
}

export function TeacherDashScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/teacher/dashboard")
      .then((row) => setData(row as Dash))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const chase = data?.at_risk ?? [];
  const practicePct = data?.practice_by_set?.[0]?.pct;

  return (
    <>
      <h2>{data?.cohort?.name || "This workspace"}</h2>
      <span className="k">
        {data?.cohort ? `${data.cohort.size} students · live aggregates` : "Live aggregates · same ledger as record"}
      </span>
      <Err message={error} />
      {!data ? (
        <Empty>Loading dashboard…</Empty>
      ) : (
        <>
          <div className="grid g4" style={{ marginBottom: 14 }}>
            <div className="stat">
              <div className="stat__v">{data.attendance_pct ?? 0}%</div>
              <div className="stat__l">Attendance</div>
            </div>
            <div className="stat">
              <div className="stat__v">{practicePct ?? 0}%</div>
              <div className="stat__l">Practice done</div>
            </div>
            <div className="stat">
              <div className="stat__v">{data.doubt_backlog ?? 0}</div>
              <div className="stat__l">Doubt backlog</div>
            </div>
            <div className="stat">
              <div className="stat__v">{chase.length}</div>
              <div className="stat__l">At risk</div>
            </div>
          </div>
          <div className="grid g2" style={{ alignItems: "start" }}>
            <div className="card">
              <h3>Students to chase</h3>
              {chase.length === 0 ? (
                <p className="muted">No chase list — attendance and practice look steady.</p>
              ) : (
                chase.map((c) => (
                  <Link key={c.student_id} href={catalogRoute("timeline")} className="hot hot--row">
                    <div className="sb">
                      <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                        <Av name={c.display_name} />
                        <div className="gr">
                          <div className="t" style={{ fontSize: ".85rem", fontWeight: 600 }}>
                            {c.display_name}
                          </div>
                          <div className="s">{c.reason}</div>
                        </div>
                      </div>
                      <span className={`pill ${c.tone === "bad" ? "is-bad" : "is-warn"}`}>open record</span>
                    </div>
                  </Link>
                ))
              )}
              <div className="row" style={{ marginTop: 6 }}>
                <Link href={catalogRoute("mentor")} className="hot hot--btn ghost">
                  Mentor backlog
                </Link>
              </div>
            </div>
            <div className="card">
              <h3>Attendance this week</h3>
              <Bars rows={data.attendance_week ?? []} />
              <div className="hr" />
              <div className="k" style={{ marginBottom: 8 }}>
                Practice completion by set
              </div>
              <Bars
                rows={(data.practice_by_set ?? []).map((r) => ({
                  day: (r.title || "set").split(" ").slice(-1)[0],
                  pct: r.pct,
                }))}
              />
            </div>
          </div>
        </>
      )}
      <div className="card card--wash" style={{ marginTop: 12 }}>
        <p className="muted">
          Same numbers the owner sees, scoped to this workspace — attendance from join, completion from attempts, backlog
          from the doubts queue.
        </p>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Link href={catalogRoute("schedule")} className="hot hot--btn">
          Open schedule
        </Link>
        <Link href={catalogRoute("mentor")} className="btn btn--sm">
          Mentor backlog
        </Link>
      </div>
    </>
  );
}
