"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MOCK_TENANTS } from "@/lib/mocks";
import { catalogRoute } from "@/lib/screens";
import { Err, Loading } from "./bits";

const exam = MOCK_TENANTS["exam-prep"];

type SessionRow = {
  id: string;
  title: string;
  starts_at?: string | null;
  display_status?: string;
  status?: string;
};

type Preview = {
  session_id: string;
  title: string;
  starts_at?: string | null;
  video_url?: string | null;
  workspace_name?: string | null;
};

function formatSessionTime(iso?: string | null): string {
  if (!iso) return "Scheduled session";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function tokenForSessionId(sessionId: string): string {
  if (sessionId.endsWith("000000000053")) return exam.joinTokenNext;
  return exam.joinToken;
}

export function JoinScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const paramToken = params.get("token") || "";
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [token, setToken] = useState(paramToken || exam.joinToken);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = params.get("token");
    if (t) setToken(t);
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSessions(true);
    api("/api/v1/sessions")
      .then((rows) => {
        if (cancelled) return;
        const all = Array.isArray(rows) ? (rows as SessionRow[]) : [];
        const active = all.filter((s) => s.display_status !== "Cancelled" && s.status !== "cancelled");
        const upcoming = active.filter((s) => s.display_status === "Upcoming");
        const list = upcoming.length > 0 ? upcoming : active;
        setSessions(list);
        if (list[0]) {
          setSelectedSessionId(list[0].id);
          if (!paramToken) {
            setToken(tokenForSessionId(list[0].id));
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingSessions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [paramToken]);

  async function loadPreview(targetToken = token) {
    if (!targetToken) return;
    setError("");
    try {
      const row = (await api(`/api/v1/join/${encodeURIComponent(targetToken)}`)) as Preview;
      setPreview(row);
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (token) void loadPreview(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleSelectSession(sessionId: string) {
    setSelectedSessionId(sessionId);
    const mappedToken = tokenForSessionId(sessionId);
    setToken(mappedToken);
  }

  async function enter() {
    setBusy(true);
    setError("");
    try {
      if (token) {
        const row = (await api(`/api/v1/join/${encodeURIComponent(token)}/enter`, {
          method: "POST",
        })) as { session_id: string };
        const destId = selectedSessionId || row.session_id;
        router.push(`${catalogRoute("live-student")}?session=${destId}`);
        return;
      }
      if (selectedSessionId) {
        router.push(`${catalogRoute("live-student")}?session=${selectedSessionId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null;
  const activeTitle = selectedSession?.title || preview?.title || "Join Live Session";
  const activeTime = selectedSession?.starts_at || preview?.starts_at;

  return (
    <div style={{ padding: "24px 20px", minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <h2 style={{ fontSize: "1.15rem" }}>{activeTitle}</h2>
      <p className="muted" style={{ marginBottom: 14 }}>
        Joining opens the live classroom and automatically records your attendance.
      </p>

      {loadingSessions ? <Loading>Checking your upcoming classes…</Loading> : null}

      {sessions.length > 0 ? (
        <label className="field">
          <span>Select upcoming session</span>
          <select
            className="field__in"
            value={selectedSessionId}
            onChange={(e) => handleSelectSession(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} — {formatSessionTime(s.starts_at)}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {selectedSession || preview ? (
        <div className="card" style={{ marginTop: 8 }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div className="k">{preview?.workspace_name || "Live Classroom"}</div>
            <span className="pill is-good">{selectedSession?.display_status || "Ready to join"}</span>
          </div>
          <div className="t" style={{ marginTop: 4, fontWeight: 600 }}>
            {activeTitle}
          </div>
          <div className="muted" style={{ marginTop: 2 }}>
            {formatSessionTime(activeTime)}
          </div>
        </div>
      ) : null}

      <div className="stage stage--end" style={{ aspectRatio: "16/10", marginTop: 12 }}>
        Camera &amp; microphone ready
      </div>

      <Err message={error} />

      <button
        className="hot hot--btn"
        type="button"
        disabled={busy || (!token && !selectedSessionId)}
        onClick={() => void enter()}
        style={{ marginTop: 14 }}
      >
        {busy ? "Joining classroom…" : "Join Live Session"}
      </button>

      <details style={{ marginTop: 14 }}>
        <summary className="muted" style={{ cursor: "pointer", fontSize: ".82rem" }}>
          Have a direct join code?
        </summary>
        <div style={{ marginTop: 8 }}>
          <label className="field">
            <span>Direct invite code</span>
            <input
              className="field__in"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter class invite code"
            />
          </label>
          <button className="btn btn--sm" type="button" onClick={() => void loadPreview(token)}>
            Verify code
          </button>
        </div>
      </details>

      <p className="muted" style={{ marginTop: 14, textAlign: "center", fontSize: ".78rem" }}>
        <Link href={catalogRoute("student-dash")}>Back to student dashboard</Link>
      </p>
    </div>
  );
}
