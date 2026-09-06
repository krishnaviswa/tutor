"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";

const TZ = "Asia/Kolkata";
const AV_PAL = ["#2E7D4F", "#2C6C88", "#6A4C93", "#AF6C22", "#A4384A", "#3f7d63", "#4b6b8a"];

type SessionRow = {
  id: string;
  workspace_id: string;
  cohort_id: string;
  title: string;
  starts_at: string | null;
};

type StudentRow = {
  id: string;
  display_name: string;
};

type CohortRow = {
  id: string;
  name: string;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || " ") + (parts[1]?.[0] || "")).toUpperCase();
}

function avColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PAL[h % AV_PAL.length];
}

function formatWhen(iso: string | null): string {
  if (!iso) return "Time unset";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function videoPill(url: string): { label: string; tone: string } {
  if (url.includes("meet.google.com")) return { label: "Google Meet · auto", tone: "info" };
  if (url.startsWith("mock://")) return { label: "Mock · auto", tone: "info" };
  return { label: "Video · attached", tone: "info" };
}

function btnStyle(extra?: CSSProperties): CSSProperties {
  return { width: "auto", margin: 0, cursor: "pointer", ...extra };
}

export function SessionPreScreen() {
  const params = useSearchParams();
  const sessionId = params.get("session") || "";
  const [session, setSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [cohortName, setCohortName] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setError("");
    try {
      const [sess, roster, coh, video] = await Promise.all([
        api(`/api/v1/sessions/${id}`) as Promise<SessionRow>,
        api("/api/v1/students") as Promise<StudentRow[]>,
        api("/api/v1/cohorts") as Promise<CohortRow[]>,
        api(`/api/v1/sessions/${id}/video`).catch(() => null) as Promise<{ video_url?: string | null } | null>,
      ]);
      setSession(sess);
      setStudents(Array.isArray(roster) ? roster : []);
      const match = Array.isArray(coh) ? coh.find((c) => c.id === sess.cohort_id) : undefined;
      setCohortName(match?.name || "");
      setVideoUrl(video?.video_url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void load(sessionId);
  }, [sessionId, load]);

  const shown = useMemo(() => students.slice(0, 5), [students]);
  const extra = Math.max(0, students.length - shown.length);

  async function attachLink() {
    if (!sessionId) return;
    setBusy(true);
    setError("");
    try {
      const row = (await api(`/api/v1/sessions/${sessionId}/video-link`, { method: "POST" })) as {
        video_url?: string;
      };
      setVideoUrl(row.video_url || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!sessionId) {
    return (
      <>
        <h2>Session</h2>
        <p className="muted">Pick a session from the calendar.</p>
        <Link href="/app/faculty/schedule" className="hot hot--btn" style={btnStyle({ textDecoration: "none" })}>
          Back to schedule
        </Link>
      </>
    );
  }

  return (
    <>
      <h2>{session?.title || "Session"}</h2>
      <span className="k">
        Live · {cohortName || "Cohort"} · {formatWhen(session?.starts_at ?? null)} IST
      </span>
      {error ? <p className="muted">{error}</p> : null}
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          <div className="hot hot--row" style={{ cursor: "default" }}>
            <div className="sb">
              <b>Video link</b>
              {videoUrl ? (
                <span className={`pill is-${videoPill(videoUrl).tone}`}>{videoPill(videoUrl).label}</span>
              ) : (
                <span className="pill">Not attached</span>
              )}
            </div>
            <div className="muted" style={{ fontFamily: "var(--mono)", fontSize: ".8rem", marginTop: 6 }}>
              {videoUrl || "No link yet — attach the mock meeting URL."}
            </div>
            <div className="muted" style={{ marginTop: 4 }}>
              TutorOS does not host video. Attach the mock port link, then start class.
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className="btn btn--sm"
                style={btnStyle()}
                disabled={busy}
                onClick={() => void attachLink()}
              >
                {busy ? "Attaching…" : videoUrl ? "Refresh mock link" : "Attach mock video link"}
              </button>
            </div>
          </div>
          <div className="card">
            <h3>Agenda</h3>
            <p className="muted" style={{ margin: 0 }}>
              No agenda on this session yet.
            </p>
          </div>
        </div>
        <div>
          <div className="card card--wash">
            <div className="k" style={{ marginBottom: 8 }}>
              Auto-releases when class ends
            </div>
            <div className="list__i">
              <div className="gr">
                <div className="t">Lesson · {session?.title || "—"}</div>
                <div className="s">to {students.length} student{students.length === 1 ? "" : "s"}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="sb">
              <h3 style={{ margin: 0 }}>Roster</h3>
              <span className="muted">{students.length} enrolled</span>
            </div>
            <div className="avrow" style={{ marginTop: 10 }}>
              {shown.map((st) => (
                <span
                  key={st.id}
                  className="av av--sm"
                  title={st.display_name}
                  style={{ background: avColor(st.display_name) }}
                >
                  {initials(st.display_name)}
                </span>
              ))}
              {extra > 0 ? (
                <span className="av av--sm" style={{ background: "var(--ink-faint)" }}>
                  +{extra}
                </span>
              ) : null}
              {students.length === 0 ? <span className="muted">No students yet</span> : null}
            </div>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <Link href="/app/faculty/live-teacher" className="hot hot--btn" style={btnStyle({ textDecoration: "none" })}>
          Start class
        </Link>
      </div>
    </>
  );
}
