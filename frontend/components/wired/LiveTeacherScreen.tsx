"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionBoard } from "@/components/studio/SessionBoard";
import { CohortChat } from "@/components/studio/CohortChat";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Live = {
  session: { id: string; title: string; cohort_id?: string | null };
  view: string;
  video_url?: string | null;
  engagement: { kind: string; payload?: Record<string, unknown> }[];
};

type SessionRow = { id: string; title: string };

export function LiveTeacherScreen() {
  const params = useSearchParams();
  const [sessionId, setSessionId] = useState(params.get("session") || "");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState("");

  useEffect(() => {
    api("/api/v1/sessions")
      .then((rows) => {
        const list = rows as SessionRow[];
        setSessions(list);
        if (!sessionId && list[0]) setSessionId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [sessionId]);

  function loadLive(id: string) {
    if (!id) return;
    api(`/api/v1/sessions/${id}/live`)
      .then((row) => setLive(row as Live))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    if (sessionId) loadLive(sessionId);
  }, [sessionId]);

  async function postEngagement(kind: string, payload: Record<string, unknown>) {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/sessions/${sessionId}/engagement`, {
        method: "POST",
        body: JSON.stringify({ kind, payload }),
      });
      loadLive(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="board-room">
      <header className="board-room__bar">
        <div>
          <h2>Whiteboard</h2>
          <p className="muted">{live?.session.title || "Shared class canvas"}</p>
        </div>
        <label className="field board-room__pick">
          <span>Session</span>
          <select className="field__in" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn btn--sm"
          type="button"
          disabled={busy || !sessionId}
          onClick={() => {
            setBusy(true);
            setError("");
            api(`/api/v1/sessions/${sessionId}/start`, { method: "POST" })
              .then(() => setStarted("Class started. People in this class can see the notice."))
              .catch((err) => setError(err instanceof Error ? err.message : String(err)))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? "Starting" : "Start class"}
        </button>
      </header>
      {started ? <p className="muted">{started}</p> : null}
      <Err message={error} />
      {sessionId ? (
        <SessionBoard sessionId={sessionId} />
      ) : (
        <p className="muted">No session on the calendar yet. Add one from Schedule, then the canvas opens here.</p>
      )}
      {live?.session.cohort_id ? (
        <div className="card" style={{ marginTop: 12 }}>
          <CohortChat cohortId={live.session.cohort_id} title="Class chat" />
        </div>
      ) : null}
      <details className="card">
        <summary>Polls and check-ins ({live?.engagement?.length ?? 0})</summary>
        <div style={{ marginTop: 10 }}>
        {(live?.engagement || []).slice(-3).map((e, i) => (
          <div key={i} className="muted">
            {e.kind}
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="hot hot--btn"
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void postEngagement("poll", { prompt: "Quick check" })}
          >
            {busy ? "Sending" : "Push poll"}
          </button>
          <button
            className="hot hot--btn"
            type="button"
            disabled={busy}
            aria-busy={busy}
            onClick={() => void postEngagement("chat", { text: "Check in" })}
          >
            {busy ? "Sending" : "Chat"}
          </button>
        </div>
        </div>
      </details>
      <div className="board-room__foot">
        <Link
          href={`${catalogRoute("record")}?session=${encodeURIComponent(sessionId)}`}
          className="btn btn--sm"
        >
          End class
        </Link>
      </div>
    </div>
  );
}
