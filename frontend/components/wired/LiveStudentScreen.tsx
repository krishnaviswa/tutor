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
    if (id) setSessionId(id);
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
    <div className="studio" style={{ display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {!sessionId ? (
        <div style={{ padding: 16 }}>
          <p className="muted">Join from the waiting room so attendance is recorded.</p>
          <Link href={catalogRoute("join")} className="hot hot--btn">
            Open join
          </Link>
        </div>
      ) : null}
      <div className="vmain" style={{ aspectRatio: "3/4", flex: 1 }}>
        {live?.session.title || "Waiting"} · {live?.view || "student"}
        <div style={{ width: "100%" }}>{live?.video_url || "Join from the waiting room first"}</div>
      </div>
      {sessionId ? (
        <div className="card">
          <SessionBoard sessionId={sessionId} />
        </div>
      ) : null}
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
      <Err message={error} />
      <div className="ctrls">
        <Link href={catalogRoute("student-dash")} className="hot hot--btn danger">
          Leave
        </Link>
      </div>
    </div>
  );
}
