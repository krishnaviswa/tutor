"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Empty, Err } from "./bits";

type Dash = { sessions: number; students: number; attempts: number };

export function TeacherDashScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/teacher/dashboard")
      .then((row) => setData(row as Dash))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <h2>This workspace</h2>
      <span className="k">Live aggregates · same ledger as record</span>
      <Err message={error} />
      {!data ? (
        <Empty>Loading dashboard…</Empty>
      ) : (
        <div className="grid g4" style={{ marginBottom: 14 }}>
          <div className="stat">
            <div className="stat__v">{data.sessions}</div>
            <div className="stat__l">Sessions</div>
          </div>
          <div className="stat">
            <div className="stat__v">{data.students}</div>
            <div className="stat__l">Students</div>
          </div>
          <div className="stat">
            <div className="stat__v">{data.attempts}</div>
            <div className="stat__l">Attempts</div>
          </div>
        </div>
      )}
      <div className="card card--wash">
        <p className="muted">
          Same numbers the owner sees, scoped to this workspace — sessions, roster, practice attempts.
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
