"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Empty, Err } from "./bits";

type SessionRow = { id: string; title: string };
type Video = {
  session_id: string;
  recording_url?: string | null;
  video_url?: string | null;
  transcript: unknown[];
};

export function SessionVideoScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/sessions")
      .then((rows) => {
        const list = rows as SessionRow[];
        setSessions(list);
        if (list[0]) setSessionId(list[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    api(`/api/v1/sessions/${sessionId}/video`)
      .then((row) => setVideo(row as Video))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [sessionId]);

  return (
    <>
      <h2>Session recording</h2>
      <span className="k">Playback is a screen — transcript stays empty until STT</span>
      <Err message={error} />
      <label className="field">
        <span>Session</span>
        <select className="field__in" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      {!video ? (
        <Empty>Pick a session.</Empty>
      ) : (
        <>
          <div
            style={{
              background: "#11171a",
              borderRadius: 12,
              aspectRatio: "16/9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cdd6d3",
            }}
          >
            {video.recording_url || video.video_url || "No recording yet"}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="k">Transcript</div>
            <p className="muted">Empty by design. No fake captions.</p>
          </div>
        </>
      )}
    </>
  );
}
