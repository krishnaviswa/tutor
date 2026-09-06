"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Err } from "./bits";

type Preview = {
  session_id: string;
  title: string;
  starts_at?: string | null;
  video_url?: string | null;
  workspace_name?: string | null;
};

export function JoinScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (t) setToken(t);
  }, [params]);

  async function loadPreview() {
    if (!token) return;
    setError("");
    try {
      const row = (await api(`/api/v1/join/${encodeURIComponent(token)}`)) as Preview;
      setPreview(row);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (token) void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function enter() {
    setBusy(true);
    setError("");
    try {
      const row = (await api(`/api/v1/join/${encodeURIComponent(token)}/enter`, {
        method: "POST",
      })) as { session_id: string };
      router.push(`${catalogRoute("live-student")}?session=${row.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: "24px 20px", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <h2 style={{ fontSize: "1.15rem" }}>{preview?.title || "Join class"}</h2>
      <p className="muted" style={{ marginBottom: 14 }}>
        Attendance is this enter — not the video URL.
      </p>
      <label className="field">
        <span>Join token</span>
        <input className="field__in" value={token} onChange={(e) => setToken(e.target.value)} />
        <em>Teacher attaches a mock video link on session-pre to mint a token.</em>
      </label>
      <button className="btn btn--sm" type="button" onClick={() => void loadPreview()}>
        Preview
      </button>
      {preview ? (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="k">{preview.workspace_name}</div>
          <div className="t">{preview.title}</div>
          <div className="muted">{preview.video_url || "no mock link yet"}</div>
        </div>
      ) : null}
      <div
        style={{
          background: "#11171a",
          borderRadius: 16,
          aspectRatio: "3/4",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          padding: 14,
          color: "#cdd6d3",
          fontSize: ".8rem",
          marginTop: 12,
        }}
      >
        Camera preview
      </div>
      <Err message={error} />
      <button className="hot hot--btn" type="button" disabled={busy || !token} onClick={() => void enter()} style={{ marginTop: 14 }}>
        Join now
      </button>
      <p className="muted" style={{ marginTop: 12, textAlign: "center", fontSize: ".74rem" }}>
        Mock Meet/Teams URL after enter. <Link href={catalogRoute("student-dash")}>Back home</Link>
      </p>
    </div>
  );
}
