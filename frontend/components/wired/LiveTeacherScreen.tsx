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

type SessionRow = { id: string; title: string; teacher_user_id?: string | null };

const CLASS_LOCK = "Only the assigned teacher or the owner can change this class.";

function explainLiveError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)).replace(/\s+/g, " ").trim();
  const start = raw.indexOf("{");
  if (start >= 0) {
    try {
      const body = JSON.parse(raw.slice(start)) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail.trim()) return body.detail.trim();
    } catch {
      /* use the sentence below */
    }
  }
  if (raw.includes("403") || raw.includes(CLASS_LOCK)) return CLASS_LOCK;
  return raw.replace(/^\d{3}\s+/, "") || "Could not update this class.";
}

export function LiveTeacherScreen() {
  const params = useSearchParams();
  const [sessionId, setSessionId] = useState(params.get("session") || "");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState("");
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((row) => {
        const person = row as { id?: string; role?: string };
        setMe({ id: person.id || "", role: person.role || "" });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api("/api/v1/sessions")
      .then((rows) => {
        const list = rows as SessionRow[];
        setSessions(list);
        if (!sessionId && list[0]) setSessionId(list[0].id);
      })
      .catch((e) => setError(explainLiveError(e)));
  }, [sessionId]);

  function loadLive(id: string) {
    if (!id) return;
    api(`/api/v1/sessions/${id}/live`)
      .then((row) => setLive(row as Live))
      .catch((e) => setError(explainLiveError(e)));
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
      setError(explainLiveError(err));
    } finally {
      setBusy(false);
    }
  }

  const selected = sessions.find((row) => row.id === sessionId);
  const readOnly = Boolean(
    me &&
      (me.role === "teacher" || me.role === "assistant") &&
      selected?.teacher_user_id &&
      selected.teacher_user_id !== me.id,
  );

  return (
    <div className="board-room">
      <header className="board-room__bar">
        <h2 className="board-room__title">{live?.session.title || "Class whiteboard"}</h2>
        <div className="board-room__actions">
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
            disabled={busy || !sessionId || readOnly}
            onClick={() => {
              if (readOnly) {
                setError(CLASS_LOCK);
                return;
              }
              setBusy(true);
              setError("");
              api(`/api/v1/sessions/${sessionId}/start`, { method: "POST" })
                .then(() => setStarted("Class started. People in this class can see the notice."))
                .catch((err) => setError(explainLiveError(err)))
                .finally(() => setBusy(false));
            }}
          >
            {busy ? "Starting" : "Start class"}
          </button>
        </div>
      </header>
      {started ? <p className="muted">{started}</p> : null}
      <Err message={error} />
      {sessionId ? (
        <SessionBoard sessionId={sessionId} library={!readOnly} readOnly={readOnly} />
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
