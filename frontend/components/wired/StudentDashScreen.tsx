"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Empty, Err } from "./bits";

type Dash = {
  student_id: string;
  upcoming_sessions: number;
  attempts: number;
  last_score: number | null;
};

export function StudentDashScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("there");

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setName((me as { display_name?: string }).display_name || "there"))
      .catch(() => undefined);
    api("/api/v1/me/dashboard")
      .then((row) => setData(row as Dash))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <>
      <AppBar title={`Hi, ${name}`} extra={<span className="pill">student</span>} />
      <div className="appwrap">
        <Err message={error} />
        {!data ? (
          <Empty>Loading…</Empty>
        ) : (
          <>
            <Link href={catalogRoute("join")} className="hot hot--card">
              <div className="k" style={{ color: "var(--tint)" }}>
                Sessions
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{data.upcoming_sessions} on the calendar</div>
              <div className="muted">Join writes attendance — not the Meet URL</div>
            </Link>
            <Link href={catalogRoute("practice-play")} className="hot hot--card">
              <div className="k" style={{ color: "var(--crimson)" }}>
                Practice
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{data.attempts} attempts</div>
              <div className="muted">Last score {data.last_score ?? "—"}</div>
            </Link>
            <Link href={catalogRoute("doubt-student")} className="hot hot--card">
              <div className="k" style={{ color: "var(--tint)" }}>
                Doubts
              </div>
              <div className="muted">Ask after class — queue, not a chat pretending to be the ledger</div>
            </Link>
          </>
        )}
      </div>
    </>
  );
}
