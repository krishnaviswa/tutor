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
      <div className="dock" style={{ borderColor: "#2f5140", background: "#15241d" }}>
        <div style={{ fontSize: ".7rem", color: "#8fd3ab", letterSpacing: ".08em", textTransform: "uppercase" }}>
          Live · mock
        </div>
        {(live?.engagement || []).length === 0 ? (
          <div style={{ fontSize: ".86rem", color: "#eef4f1", margin: "6px 0 10px" }}>No poll yet</div>
        ) : (
          (live?.engagement || []).map((e, i) => (
            <div key={i} className="muted" style={{ color: "#aeb8b5" }}>
              {e.kind}
            </div>
          ))
        )}
        {sessionId ? (
          <>
            <label className="field" style={{ marginTop: 8 }}>
              <span style={{ color: "#9fb0aa" }}>Chat</span>
              <input className="field__in" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <button className="hot hot--btn" type="button" disabled={busy} onClick={() => void sendChat()}>
              Send
            </button>
          </>
        ) : null}
      </div>
      <Err message={error} />
      <div className="ctrls">
        <Link href={catalogRoute("student-dash")} className="hot hot--btn" style={{ background: "#A4384A" }}>
          Leave
        </Link>
      </div>
    </div>
  );
}
