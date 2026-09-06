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
  next_session?: { id: string; title: string; starts_at: string; join_opens_at?: string | null } | null;
  due_practice?: { id: string; title: string; unanswered: number; total: number; due_at?: string | null } | null;
  this_week?: { title: string; starts_at?: string | null; kind: string } | null;
  doubt?: { id: string; title: string; status: string; has_clip: boolean } | null;
  weak_tags?: string[];
};

function whenLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

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

  const next = data?.next_session;
  const due = data?.due_practice;
  const week = data?.this_week;
  const doubt = data?.doubt;
  const tags = data?.weak_tags ?? [];

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
                {next ? whenLabel(next.starts_at) || "Next session" : "Sessions"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{next?.title || `${data.upcoming_sessions} on the calendar`}</div>
              <div className="muted">
                {next?.join_opens_at
                  ? `Live · join opens ${whenLabel(next.join_opens_at)}`
                  : "Join writes attendance — not the Meet URL"}
              </div>
            </Link>
            <Link href={catalogRoute("practice-play")} className="hot hot--card">
              <div className="k" style={{ color: "var(--crimson)" }}>
                {due?.due_at ? `Practice due · ${whenLabel(due.due_at)}` : "Practice"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{due?.title || `${data.attempts} attempts`}</div>
              <div className="muted">
                {due ? `${due.unanswered} / ${due.total} unanswered` : `Last score ${data.last_score ?? "—"}`}
              </div>
            </Link>
            {week ? (
              <div className="card">
                <div className="k">This week</div>
                <div className="list__i" style={{ border: 0, padding: "8px 0" }}>
                  <div className="gr">
                    <div className="t">{week.title}</div>
                    <div className="s">{whenLabel(week.starts_at) || "On the calendar"}</div>
                  </div>
                  <span className="pill">{week.kind}</span>
                </div>
              </div>
            ) : null}
            <Link href={catalogRoute("doubt-student")} className="hot hot--card">
              <div className="k" style={{ color: "var(--tint)" }}>
                {doubt?.status === "answered" ? "Your doubt was answered" : "Doubts"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{doubt?.title || "Ask after class"}</div>
              <div className="muted">
                {doubt?.has_clip ? "Clip attached · tap to view" : "Queue, not a chat pretending to be the ledger"}
              </div>
            </Link>
            <div className="card">
              <div className="k" style={{ marginBottom: 8 }}>
                Weak tags to drill
              </div>
              {tags.length === 0 ? (
                <p className="muted">No weak tags yet — finish a set to see them.</p>
              ) : (
                <div className="chips">
                  {tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link href={catalogRoute("practice-play")} className="hot hot--btn ghost">
                  Practice these
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
