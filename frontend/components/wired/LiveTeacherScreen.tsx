"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Live = {
  session: { id: string; title: string };
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
    <div className="studio">
      <div className="sb">
        <h2 style={{ fontSize: "1.1rem" }}>{live?.session.title || "Live"} · {live?.view || "teacher"}</h2>
        <span className="pill is-bad">REC mock</span>
      </div>
      <label className="field" style={{ marginTop: 10 }}>
        <span style={{ color: "#9fb0aa" }}>Session</span>
        <select className="field__in" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      <div className="vmain" style={{ marginTop: 10 }}>
        {live?.video_url || "Attach a mock video link on session-pre"}
      </div>
      <div className="dock">
        <div style={{ fontSize: ".82rem", marginBottom: 6 }}>Engagement ({live?.engagement?.length ?? 0})</div>
        {(live?.engagement || []).slice(-3).map((e, i) => (
          <div key={i} className="muted" style={{ color: "#aeb8b5" }}>
            {e.kind}
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="hot hot--btn"
            type="button"
            disabled={busy}
            onClick={() => void postEngagement("poll", { prompt: "Quick check" })}
          >
            Push poll
          </button>
          <button
            className="hot hot--btn"
            type="button"
            disabled={busy}
            onClick={() => void postEngagement("chat", { text: "Check in" })}
          >
            Chat
          </button>
        </div>
      </div>
      <Err message={error} />
      <div className="ctrls">
        <Link href={catalogRoute("record")} className="hot hot--btn" style={{ background: "#A4384A" }}>
          End class
        </Link>
      </div>
    </div>
  );
}
