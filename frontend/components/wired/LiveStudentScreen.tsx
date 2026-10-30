"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SessionBoard } from "@/components/studio/SessionBoard";
import { CohortChat } from "@/components/studio/CohortChat";
import { api } from "@/lib/api";
import { MOCK_TENANTS } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Live = {
  session: { id: string; title: string; cohort_id?: string | null };
  view: string;
  video_url?: string | null;
  engagement: { kind: string }[];
};

export function LiveStudentScreen() {
  const params = useSearchParams();
  const [sessionId, setSessionId] = useState(params.get("session") || "");
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = params.get("session");
    if (id) {
      setSessionId(id);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = (await api("/api/v1/me/dashboard")) as { next_session?: { id?: string } | null };
        if (cancelled) return;
        if (row.next_session?.id) {
          setSessionId(row.next_session.id);
          return;
        }
        // The demo class is already on the calendar, even when it is no longer "upcoming".
        const join = (await api(`/api/v1/join/${encodeURIComponent(MOCK_TENANTS["exam-prep"].joinToken)}`)) as {
          session_id?: string;
        };
        if (!cancelled && join.session_id) setSessionId(join.session_id);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  function loadLive(id: string) {
    if (!id) return;
    api(`/api/v1/sessions/${id}/live`)
      .then((row) => setLive(row as Live))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    if (sessionId) loadLive(sessionId);
  }, [sessionId]);

  async function sendChat() {
    if (!sessionId || !text.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/sessions/${sessionId}/engagement`, {
        method: "POST",
        body: JSON.stringify({ kind: "chat", payload: { text: text.trim() } }),
      });
      setText("");
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
        <Link href={catalogRoute("join")} className="btn btn--sm">
          Join for attendance
        </Link>
      </header>
      <Err message={error} />
      {sessionId ? (
        <SessionBoard sessionId={sessionId} />
      ) : (
        <p className="muted">No upcoming class yet. Join from the waiting room when one is on the calendar.</p>
      )}
      {live?.session.cohort_id ? (
        <div className="card">
          <CohortChat cohortId={live.session.cohort_id} title="Class chat" />
        </div>
      ) : null}
      <div className="dock">
        <div className="k">Live · mock</div>
        {(live?.engagement || []).length === 0 ? (
          <div className="t" style={{ margin: "6px 0 10px" }}>No poll yet</div>
        ) : (
          (live?.engagement || []).map((e, i) => (
            <div key={i} className="muted">
              {e.kind}
            </div>
          ))
        )}
        {sessionId ? (
          <>
            <label className="field" style={{ marginTop: 8 }}>
              <span>Chat</span>
              <input className="field__in" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button className="hot hot--btn" type="button" disabled={busy} aria-busy={busy} onClick={() => void sendChat()}>
              {busy ? "Sending" : "Send"}
            </button>
          </>
        ) : null}
      </div>
      <div className="board-room__foot">
        <Link href={catalogRoute("student-dash")} className="btn btn--sm">
          Leave
        </Link>
      </div>
    </div>
  );
}
