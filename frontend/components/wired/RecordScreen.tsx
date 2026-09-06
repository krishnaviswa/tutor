"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

const TZ = "Asia/Kolkata";

type SessionRow = {
  id: string;
  title: string;
  starts_at: string | null;
  cohort_id: string;
};

type StudentRow = {
  id: string;
  display_name: string;
};

type AttendanceIn = {
  student_id: string;
  status: string;
};

type RecordPayload = {
  session: SessionRow;
  notes: string;
  attendance: AttendanceIn[];
  capture?: { kind: string }[];
};

type PatchResult = {
  record_id: string;
  session_id: string;
  notes: string;
  timeline_event_ids: string[];
};

const AV_PALETTE = ["#2E7D4F", "#2C6C88", "#6A4C93", "#AF6C22", "#A4384A", "#3f7d63", "#4b6b8a"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || " ") + (parts[1]?.[0] || "")).toUpperCase();
}

function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function formatWhen(iso: string | null) {
  if (!iso) return "Unscheduled";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

function btnStyle(extra?: CSSProperties): CSSProperties {
  return { width: "auto", margin: 0, cursor: "pointer", ...extra };
}

function RecordScreenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySession = searchParams.get("session");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [sessionId, setSessionId] = useState(querySession ?? "");
  const [session, setSession] = useState<SessionRow | null>(null);
  const [notes, setNotes] = useState("");
  const [loadedNotes, setLoadedNotes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<PatchResult | null>(null);
  const [capture, setCapture] = useState<{ kind: string }[]>([]);

  const loadLists = useCallback(async () => {
    const [sess, studs] = await Promise.all([
      api("/api/v1/sessions") as Promise<SessionRow[]>,
      api("/api/v1/students") as Promise<StudentRow[]>,
    ]);
    const sessionRows = Array.isArray(sess) ? sess : [];
    const studentRows = Array.isArray(studs) ? studs : [];
    setSessions(sessionRows);
    setStudents(studentRows);
    return { sessionRows, studentRows };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLists()
      .then(({ sessionRows }) => {
        if (cancelled) return;
        const q = new URLSearchParams(window.location.search).get("session");
        const pick =
          q && sessionRows.some((s) => s.id === q) ? q : sessionRows[0]?.id ?? "";
        setSessionId(pick);
        if (pick && pick !== q) {
          router.replace(`/app/faculty/record?session=${encodeURIComponent(pick)}`);
        }
        if (!pick) setLoading(false);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [loadLists, router]);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api(`/api/v1/sessions/${sessionId}/record`)
      .then((row) => {
        if (cancelled) return;
        const rec = row as RecordPayload;
        setSession(rec.session ?? null);
        const nextNotes = rec.notes ?? "";
        setNotes(nextNotes);
        setLoadedNotes(nextNotes);
        const next: Record<string, string> = {};
        for (const a of rec.attendance ?? []) {
          next[a.student_id] = a.status || "present";
        }
        setAttendance(next);
        setCapture(rec.capture ?? []);
        setSaved(null);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function pickSession(id: string) {
    setSessionId(id);
    router.replace(`/app/faculty/record?session=${encodeURIComponent(id)}`);
  }

  const rows = useMemo(() => {
    const byId = new Map(students.map((s) => [s.id, s]));
    const ids = new Set<string>([...students.map((s) => s.id), ...Object.keys(attendance)]);
    return [...ids].map((id) => ({
      id,
      display_name: byId.get(id)?.display_name ?? id.slice(0, 8),
      status: attendance[id] ?? "present",
    }));
  }, [students, attendance]);

  const present = rows.filter((r) => r.status === "present").length;
  const absent = rows.filter((r) => r.status === "absent").length;

  const events = useMemo(() => {
    const items: { t: string; b: string }[] = [];
    if (session?.starts_at) {
      items.push({ t: formatTime(session.starts_at), b: "Session scheduled" });
    }
    if (loadedNotes.trim()) {
      items.push({ t: "Notes", b: "Teacher note on file" });
    }
    if (rows.length) {
      items.push({ t: "Attendance", b: `${present} present · ${absent} absent` });
    }
    if (saved) {
      const n = saved.timeline_event_ids?.length ?? 0;
      items.push({
        t: "Saved",
        b: `Record generated · ${n} timeline write${n === 1 ? "" : "s"}`,
      });
    }
    if (!items.length) {
      items.push({ t: "Event log", b: "No events yet — save the record after class." });
    }
    return items;
  }, [session, loadedNotes, rows.length, present, absent, saved]);

  function toggleStatus(id: string) {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === "absent" ? "present" : "absent",
    }));
    setSaved(null);
  }

  async function saveRecord() {
    if (!sessionId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const result = (await api(`/api/v1/sessions/${sessionId}/record`, {
        method: "PATCH",
        body: JSON.stringify({
          notes,
          attendance: rows.map((r) => ({ student_id: r.id, status: r.status })),
        }),
      })) as PatchResult;
      setSaved(result);
      setLoadedNotes(result.notes ?? notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  const title = session?.title || sessions.find((s) => s.id === sessionId)?.title || "Session record";
  const kicker = loading
    ? "Loading record…"
    : `${formatWhen(session?.starts_at ?? null)}`;

  return (
    <>
      <h2>Session record — {title}</h2>
      <span className="k">
        {kicker}
        {" · "}
        <span className="pill is-info">event log — not a transcription</span>
        {capture.length ? ` · Captured: ${capture.length} live events` : ""}
      </span>
      <label className="field">
        <span>Session</span>
        <select
          className="field__in"
          value={sessionId}
          onChange={(e) => pickSession(e.target.value)}
          disabled={loading || sessions.length === 0}
        >
          {sessions.length === 0 ? <option value="">No sessions</option> : null}
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="muted">{error}</p> : null}
      <div className="grid g2" style={{ alignItems: "start" }}>
        <div className="card">
          <h3>Event transcript</h3>
          <div className="tl" style={{ marginTop: 6 }}>
            {events.map((e) => (
              <div className="tl__i" key={`${e.t}-${e.b}`}>
                <div className="tl__t">{e.t}</div>
                <div className="tl__b">{e.b}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="card">
            <div className="sb">
              <h3 style={{ margin: 0 }}>Attendance</h3>
              <span className="muted">
                {present} present · {absent} absent
              </span>
            </div>
            <div className="row" style={{ marginTop: 8, gap: 6 }}>
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`pill ${r.status === "absent" ? "is-bad" : "is-good"}`}
                  style={btnStyle()}
                  onClick={() => toggleStatus(r.id)}
                  title={r.status === "absent" ? "Mark present" : "Mark absent"}
                >
                  <span className="av av--sm" style={{ background: avColor(r.display_name) }}>
                    {initials(r.display_name)}
                  </span>
                  {firstName(r.display_name)}
                </button>
              ))}
            </div>
            {rows.length === 0 && !loading ? (
              <p className="muted" style={{ marginTop: 8 }}>
                No students in this workspace yet.
              </p>
            ) : null}
            <p className="muted" style={{ marginTop: 10 }}>
              Tap a name to toggle present / absent. Saving writes the ledger — it does not send WhatsApp.
            </p>
          </div>
          <div className="card">
            <h3>Teacher note</h3>
            <label className="field">
              <span>Notes</span>
              <textarea
                className="field__in"
                rows={4}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(null);
                }}
                placeholder="What to open with next class, who to follow up…"
              />
            </label>
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn btn--sm"
                style={btnStyle()}
                onClick={saveRecord}
                disabled={saving || !sessionId}
              >
                {saving ? "Saving…" : "+ Add note"}
              </button>
              {saved ? (
                <span className="pill is-good">
                  {saved.timeline_event_ids?.length ?? 0} timeline writes
                </span>
              ) : null}
            </div>
          </div>
          <div className="card card--wash">
            <p className="muted">
              This record fans out to <b>{rows.length} student timeline{rows.length === 1 ? "" : "s"}</b> when
              you save. Timeline is the ledger; channels follow that write.
            </p>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <Link className="hot hot--btn" href="/app/faculty/teacher-dash" style={btnStyle({ textDecoration: "none" })}>
          Open cohort dashboard
        </Link>
      </div>
    </>
  );
}

export function RecordScreen() {
  return (
    <Suspense fallback={<p className="muted">Loading session record…</p>}>
      <RecordScreenInner />
    </Suspense>
  );
}
