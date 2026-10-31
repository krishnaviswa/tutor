"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClassNotices } from "@/components/studio/ClassNotices";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err, Loading } from "./bits";

const TZ = "Asia/Kolkata";

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

type SessionItem = {
  id: string;
  title: string;
  starts_at: string | null;
  status?: string;
  display_status?: string;
};

function formatSessionTime(iso: string | null): string {
  if (!iso) return "Time to be scheduled";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function Bars({ rows }: { rows: Bar[] }) {
  if (!rows.length) return <p className="muted">No sessions recorded in the past 7 days.</p>;
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
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/api/v1/teacher/dashboard") as Promise<Dash>,
      api("/api/v1/sessions").catch(() => []) as Promise<SessionItem[]>,
    ])
      .then(([dash, sess]) => {
        setData(dash);
        setSessions(Array.isArray(sess) ? sess.slice(0, 4) : []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const chase = data?.at_risk ?? [];
  const practicePct = data?.practice_by_set?.[0]?.pct;
  const openDoubts = data?.doubt_backlog ?? 0;

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>{data?.cohort?.name || "Faculty Teaching Hub"}</h2>
          <span className="k">
            {data?.cohort
              ? `${data.cohort.size} enrolled students · Run today's classes, mark attendance, and follow up with students`
              : "Run today's classes, mark attendance, and support students who need attention"}
          </span>
        </div>
        <div className="page-toolbar__actions">
          <Link href="/app/faculty/session-pre" className="btn btn--sm">
            Prep Class
          </Link>
          <Link href="/app/faculty/live-teacher" className="hot hot--btn">
            Launch Live Board
          </Link>
          <Link href="/app/faculty/record" className="btn btn--sm">
            Mark Attendance Roll
          </Link>
          <Link href="/app/faculty/doubt-teacher" className="btn btn--sm">
            Answer Doubts {openDoubts > 0 ? `(${openDoubts})` : ""}
          </Link>
        </div>
      </div>

      {!data && !error ? <Loading>Loading teaching hub…</Loading> : null}
      <Err message={error} />
      <ClassNotices />

      {data ? (
        <>
          <div className="grid g4" style={{ marginBottom: 16 }}>
            <div className="stat">
              <div className="stat__v">{data.attendance_pct ?? 0}%</div>
              <div className="stat__l">Class Attendance</div>
            </div>
            <div className="stat">
              <div className="stat__v">{practicePct ?? 0}%</div>
              <div className="stat__l">Practice Completed</div>
            </div>
            <div className="stat">
              <div className="stat__v">{openDoubts}</div>
              <div className="stat__l">Open Student Doubts</div>
            </div>
            <div className="stat">
              <div className="stat__v">{chase.length}</div>
              <div className="stat__l">Students Needing Follow-Up</div>
            </div>
          </div>

          <div className="grid g2" style={{ alignItems: "start" }}>
            <div className="card">
              <div className="sb" style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Today&apos;s Schedule &amp; Next Classes</h3>
                <Link href={catalogRoute("schedule")} className="btn btn--sm">
                  Full Calendar
                </Link>
              </div>
              {sessions.length === 0 ? (
                <Empty>No sessions scheduled yet. Open the calendar to add a class.</Empty>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="list__i"
                    style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                  >
                    <div className="sb" style={{ gap: 8 }}>
                      <div className="t">{s.title}</div>
                      <div className="s">
                        {formatSessionTime(s.starts_at)} IST
                        {s.display_status ? ` · ${s.display_status}` : ""}
                      </div>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <Link href={`/app/faculty/session-pre?session=${encodeURIComponent(s.id)}`} className="btn btn--sm">
                        Prep Class
                      </Link>
                      <Link
                        href={`/app/faculty/live-teacher?session=${encodeURIComponent(s.id)}`}
                        className="btn btn--dark btn--sm"
                      >
                        Launch Live Board
                      </Link>
                      <Link href={`/app/faculty/record?session=${encodeURIComponent(s.id)}`} className="btn btn--sm">
                        Mark Attendance Roll
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <div className="sb" style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Needs Attention</h3>
                <Link href={catalogRoute("mentor")} className="btn btn--sm">
                  Mentor Follow-Ups
                </Link>
              </div>

              {openDoubts > 0 ? (
                <div className="list__i" style={{ flexWrap: "wrap", gap: 10 }}>
                  <div className="gr">
                    <div className="t">
                      {openDoubts} Student Doubt{openDoubts === 1 ? "" : "s"} Waiting
                    </div>
                    <div className="s">Students are waiting for a step-by-step clarification</div>
                  </div>
                  <Link href="/app/faculty/doubt-teacher" className="btn btn--dark btn--sm">
                    Answer Doubts
                  </Link>
                </div>
              ) : null}

              {chase.length === 0 && openDoubts === 0 ? (
                <p className="muted">All caught up — attendance, practice, and student doubts are on track.</p>
              ) : (
                chase.map((c) => (
                  <div
                    key={c.student_id}
                    className="list__i"
                    style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                  >
                    <div className="sb" style={{ gap: 8 }}>
                      <div className="row" style={{ gap: 8, flexWrap: "nowrap", minWidth: 0 }}>
                        <Av name={c.display_name} />
                        <div style={{ minWidth: 0 }}>
                          <div className="t" style={{ fontSize: ".9rem", fontWeight: 600 }}>
                            {c.display_name}
                          </div>
                          <div className="s">{c.reason}</div>
                        </div>
                      </div>
                      <span className={`pill ${c.tone === "bad" ? "is-bad" : "is-warn"}`}>
                        {c.tone === "bad" ? "High Priority" : "Needs Check-in"}
                      </span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <Link href={catalogRoute("mentor")} className="btn btn--sm">
                        Book 1-on-1
                      </Link>
                      <Link href={catalogRoute("timeline")} className="btn btn--sm">
                        Activity Log
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 4 }}>
            <div className="grid g2" style={{ alignItems: "start" }}>
              <div>
                <h3>Weekly Attendance Trend</h3>
                <Bars rows={data.attendance_week ?? []} />
              </div>
              <div>
                <h3>Practice Completion by Set</h3>
                <Bars
                  rows={(data.practice_by_set ?? []).map((r) => ({
                    day: (r.title || "Set").split(" ").slice(-1)[0],
                    pct: r.pct,
                  }))}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
