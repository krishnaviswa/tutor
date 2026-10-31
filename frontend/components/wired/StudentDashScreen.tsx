"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ClassNotices } from "@/components/studio/ClassNotices";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Err, Loading } from "./bits";

type Dash = {
  student_id: string;
  upcoming_sessions: number;
  attempts: number;
  last_score: number | null;
  next_session?: { id: string; title: string; starts_at: string; teacher_user_id?: string; join_opens_at?: string | null } | null;
  due_practice?: { id: string; title: string; unanswered: number; total: number; due_at?: string | null } | null;
  this_week?: { title: string; starts_at?: string | null; kind: string } | null;
  doubt?: { id: string; title: string; status: string; has_clip: boolean } | null;
  weak_tags?: string[];
  teacher_windows?: {
    teacher_id: string;
    teacher_name: string;
    windows: { weekday: string; start: string; end: string }[];
    gaps: { weekday: string; start: string; end: string }[];
  }[];
};

function SessionActions({ sessionId, teacherId }: { sessionId: string; teacherId?: string }) {
  const [when, setWhen] = useState("");
  const [feedback, setFeedback] = useState("");
  const [msg, setMsg] = useState("");

  async function decline() {
    setMsg("");
    try {
      await api(`/api/v1/sessions/${sessionId}/student-change`, {
        method: "POST",
        body: JSON.stringify({ action: "decline", reason: "unwell" }),
      });
      setMsg("Declined. Your teacher can see it.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function move() {
    if (!when) return;
    setMsg("");
    try {
      await api(`/api/v1/sessions/${sessionId}/student-change`, {
        method: "POST",
        body: JSON.stringify({
          action: "reschedule",
          reason: "unavailable",
          starts_at: new Date(when).toISOString(),
        }),
      });
      setMsg("Moved. Your teacher can see the new time.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendFeedback() {
    if (!teacherId || !feedback.trim()) return;
    setMsg("");
    try {
      await api("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({ teacher_user_id: teacherId, session_id: sessionId, body: feedback }),
      });
      setFeedback("");
      setMsg("Feedback saved for that teacher.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="card">
      <div className="k">This 1-on-1</div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn--sm" onClick={() => void decline()}>
          I am unwell
        </button>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="btn btn--sm" onClick={() => void move()}>
          I am unavailable then
        </button>
      </div>
      <label className="field">
        <span>Feedback for the teacher</span>
        <textarea className="field__in" value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={2} />
      </label>
      <button type="button" className="btn btn--sm" onClick={() => void sendFeedback()}>
        Send feedback
      </button>
      {msg ? <p className="muted">{msg}</p> : null}
    </div>
  );
}

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
        {!data && !error ? <Loading>Loading your day…</Loading> : null}
        <Err message={error} />
        <ClassNotices />
        {data ? (
          <>
            <Link href={catalogRoute("live-student")} className="hot hot--card">
              <div className="k">Whiteboard</div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>Open the class canvas</div>
              <div className="muted">Draw with your teacher. It stays with this session.</div>
            </Link>
            <Link href={catalogRoute("join")} className="hot hot--card">
              <div className="k">
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
              <div className="k">
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
              <div className="k">
                {doubt?.status === "answered" ? "Your doubt was answered" : "Doubts"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{doubt?.title || "Ask after class"}</div>
              <div className="muted">
                {doubt?.has_clip ? "Clip attached · tap to view" : "Queue, not a chat pretending to be the ledger"}
              </div>
            </Link>
            {(data.teacher_windows || []).map((row) => (
              <div className="card" key={row.teacher_id}>
                <div className="k">When {row.teacher_name} is free</div>
                {row.windows.length === 0 ? (
                  <p className="muted">No published windows.</p>
                ) : (
                  row.windows.map((w) => (
                    <div key={`${w.weekday}-${w.start}`} className="s">
                      {w.weekday} {w.start}–{w.end}
                    </div>
                  ))
                )}
                {row.gaps.map((g) => (
                  <div key={`${g.weekday}-${g.start}`} className="muted">
                    {g.weekday} {g.start}–{g.end} is closed
                  </div>
                ))}
              </div>
            ))}
            {next ? (
              <SessionActions sessionId={next.id} teacherId={next.teacher_user_id} />
            ) : null}
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
        ) : null}
      </div>
    </>
  );
}
