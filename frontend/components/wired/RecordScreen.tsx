"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Err } from "./bits";

const TZ = "Asia/Kolkata";

const STUDENT_ROLL = [
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No-show" },
  { value: "student_cancel", label: "Student cancel" },
  { value: "teacher_cancel", label: "Teacher cancel" },
] as const;

const NOTE_TEMPLATES = [
  "Covered core concepts and worked examples. Assigned practice set for next session.",
  "Completed numerical problem-solving drill. Students should revise formula derivations.",
  "Reviewed previous test doubts and strengthened weak topic fundamentals.",
];

type StudentRoll = (typeof STUDENT_ROLL)[number]["value"];

function normalizeStudent(status: string | null | undefined): StudentRoll | "" {
  if (status === "present" || status === "attended") return "attended";
  if (status === "absent" || status === "no_show") return "no_show";
  if (status === "student_cancel" || status === "teacher_cancel") return status;
  return "";
}

function studentLabel(status: string): string {
  return STUDENT_ROLL.find((item) => item.value === status)?.label ?? "Not marked";
}

function statusPillTone(status: string): string {
  if (status === "attended") return "is-good";
  if (status === "no_show") return "is-bad";
  if (status === "teacher_cancel" || status === "student_cancel") return "is-warn";
  return "";
}

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
  teacher_status?: string | null;
  capture?: { kind: string }[];
};

type PatchResult = {
  record_id: string;
  session_id: string;
  notes: string;
  timeline_event_ids: string[];
};

const AV_PALETTE = ["#0071E3", "#5E5CE6", "#FF9F0A", "#FF375F", "#64D2FF", "#30B0C7", "#8E8E93"];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || " ") + (parts[1]?.[0] || "")).toUpperCase();
}

function avColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
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
  const [teacherStatus, setTeacherStatus] = useState("");
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
          const status = normalizeStudent(a.status);
          if (status) next[a.student_id] = status;
        }
        setAttendance(next);
        setTeacherStatus(rec.teacher_status === "present" || rec.teacher_status === "absent" ? rec.teacher_status : "");
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
    return [...ids].map((id, idx) => ({
      id,
      display_name: byId.get(id)?.display_name ?? `Enrolled Student ${idx + 1}`,
      status: normalizeStudent(attendance[id]),
    }));
  }, [students, attendance]);

  const attended = rows.filter((r) => r.status === "attended").length;
  const noShow = rows.filter((r) => r.status === "no_show").length;
  const studentCancel = rows.filter((r) => r.status === "student_cancel").length;
  const teacherCancel = rows.filter((r) => r.status === "teacher_cancel").length;
  const unmarked = rows.length - attended - noShow - studentCancel - teacherCancel;
  const hoursUsedCount = attended + noShow;
  const hoursPreservedCount = teacherCancel;
  const rollSummary = `${attended} Attended · ${noShow} No-show · ${studentCancel} Student cancel · ${teacherCancel} Teacher cancel · ${unmarked} Unmarked`;

  const events = useMemo(() => {
    const items: { t: string; b: string }[] = [];
    if (session?.starts_at) {
      items.push({ t: formatTime(session.starts_at), b: "Class session scheduled" });
    }
    if (capture.length > 0) {
      items.push({ t: "Live Class", b: `${capture.length} interactive whiteboard / poll activity captured` });
    }
    if (rows.length) {
      items.push({ t: "Attendance Roll", b: rollSummary });
    }
    if (loadedNotes.trim()) {
      items.push({ t: "Class Summary", b: loadedNotes.trim() });
    }
    if (saved) {
      const n = saved.timeline_event_ids?.length ?? 0;
      items.push({
        t: "Saved",
        b: `Class record saved and published to ${n} student progress ${n === 1 ? "log" : "logs"}`,
      });
    }
    if (!items.length) {
      items.push({ t: "Pending", b: "Complete the 3 steps on this screen to record the class." });
    }
    return items;
  }, [session, capture.length, loadedNotes, rows.length, rollSummary, saved]);

  function setStatus(id: string, status: StudentRoll) {
    setAttendance((prev) => ({
      ...prev,
      [id]: prev[id] === status ? "" : status,
    }));
    setSaved(null);
  }

  function markAllAttended() {
    setTeacherStatus("present");
    const next: Record<string, string> = {};
    for (const r of rows) {
      next[r.id] = "attended";
    }
    setAttendance(next);
    setSaved(null);
  }

  function setTeacher(status: "present" | "absent") {
    setTeacherStatus((prev) => (prev === status ? "" : status));
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
          attendance: rows
            .filter((r) => normalizeStudent(r.status))
            .map((r) => ({ student_id: r.id, status: normalizeStudent(r.status) })),
          teacher_status: teacherStatus,
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

  const title = session?.title || sessions.find((s) => s.id === sessionId)?.title || "Class Record";
  const kicker = loading
    ? "Loading class record…"
    : `${formatWhen(session?.starts_at ?? null)} IST · Complete the 3-step post-class workflow below`;

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Attendance &amp; Class Record — {title}</h2>
          <span className="k">{kicker}</span>
        </div>
        <div className="page-toolbar__actions">
          <Link href="/app/faculty/teacher-dash" className="btn btn--sm" style={btnStyle({ textDecoration: "none" })}>
            Teaching Hub
          </Link>
          <Link href="/app/faculty/assign-issue" className="btn btn--sm" style={btnStyle({ textDecoration: "none" })}>
            Issue Assignment
          </Link>
        </div>
      </div>

      {/* 3-Step Visual Workflow Banner */}
      <div className="card" style={{ padding: "14px 18px" }}>
        <div className="steps" style={{ justifyContent: "space-between" }}>
          <span className={sessionId ? "on" : ""}>
            1. Pick Session {sessionId ? "✓" : ""}
          </span>
          <span>→</span>
          <span className={rows.length - unmarked > 0 || teacherStatus ? "on" : ""}>
            2. Mark Attendance Roll (Teacher &amp; Students) ({rows.length - unmarked}/{rows.length} marked)
          </span>
          <span>→</span>
          <span className={notes.trim() || saved ? "on" : ""}>
            3. Save Class Summary Note {saved ? "✓" : ""}
          </span>
        </div>
      </div>

      <Err message={error} />

      <div className="grid g2" style={{ alignItems: "start" }}>
        <div>
          {/* Step 1: Pick Session */}
          <div className="card">
            <div className="sb" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Step 1 · Pick Session</h3>
              <span className="pill is-info">{formatWhen(session?.starts_at ?? null)}</span>
            </div>
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Scheduled Class Session</span>
              <select
                className="field__in"
                value={sessionId}
                onChange={(e) => pickSession(e.target.value)}
                disabled={loading || sessions.length === 0}
              >
                {sessions.length === 0 ? <option value="">No sessions scheduled</option> : null}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({formatWhen(s.starts_at)})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Step 2: Mark Attendance Roll */}
          <div className="card">
            <div className="sb" style={{ marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Step 2 · Mark Attendance Roll (Teacher &amp; Students)</h3>
              {rows.length > 0 ? (
                <button type="button" className="btn btn--sm" style={btnStyle()} onClick={markAllAttended}>
                  Mark All Attended
                </button>
              ) : null}
            </div>

            {/* Live Consequence Badge */}
            <div className="card card--wash" style={{ padding: "12px 14px", marginBottom: 12 }}>
              <div className="row" style={{ gap: 6, marginBottom: 6 }}>
                <span className="pill is-good">{attended} Attended</span>
                <span className="pill is-bad">{noShow} No-show</span>
                <span className="pill is-warn">{teacherCancel} Teacher cancel</span>
                <span className="pill">{studentCancel} Student cancel</span>
                {unmarked > 0 ? <span className="pill">{unmarked} Unmarked</span> : null}
              </div>
              <div className="s" style={{ color: "var(--ink)" }}>
                <b>Lesson-Pack Hour Impact:</b> <b>Attended</b> and <b>No-show</b> use <b>1 lesson-pack hour</b> ({hoursUsedCount} student pack
                {hoursUsedCount === 1 ? "" : "s"} deducted), while <b>Teacher cancel</b> preserves the hour ({hoursPreservedCount} preserved).
              </div>
            </div>

            <div className="list__i" style={{ padding: "10px 0" }}>
              <div className="gr">
                <div className="t">Lead Teacher</div>
                <div className="s">
                  {teacherStatus === "present"
                    ? "Present · Verified for teacher payout"
                    : teacherStatus === "absent"
                      ? "Absent"
                      : "Not marked yet"}
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button
                  type="button"
                  className={teacherStatus === "present" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btnStyle()}
                  onClick={() => setTeacher("present")}
                >
                  Present
                </button>
                <button
                  type="button"
                  className={teacherStatus === "absent" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btnStyle()}
                  onClick={() => setTeacher("absent")}
                >
                  Absent
                </button>
              </div>
            </div>

            {rows.map((r) => (
              <div key={r.id} className="list__i" style={{ padding: "10px 0", flexWrap: "wrap" }}>
                <span className="av av--sm" style={{ background: avColor(r.display_name) }}>
                  {initials(r.display_name)}
                </span>
                <div className="gr">
                  <div className="t">{r.display_name}</div>
                  <div className="s">
                    <span className={`pill ${statusPillTone(r.status)}`} style={{ padding: "2px 8px" }}>
                      {studentLabel(r.status)}
                    </span>
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {STUDENT_ROLL.map((choice) => (
                    <button
                      key={choice.value}
                      type="button"
                      className={r.status === choice.value ? "btn btn--dark btn--sm" : "btn btn--sm"}
                      style={btnStyle()}
                      onClick={() => setStatus(r.id, choice.value)}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {rows.length === 0 && !loading ? (
              <p className="muted" style={{ marginTop: 8 }}>
                No students enrolled in this workspace yet.
              </p>
            ) : null}
          </div>
        </div>

        <div>
          {/* Step 3: Save Class Summary Note */}
          <div className="card">
            <h3>Step 3 · Save Class Summary Note</h3>
            <div className="field">
              <span>Quick Summary Templates (1-Click Insert)</span>
              <div className="chips">
                {NOTE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    className={`chip${notes === tpl ? " on" : ""}`}
                    onClick={() => {
                      setNotes(tpl);
                      setSaved(null);
                    }}
                  >
                    {tpl.slice(0, 42)}…
                  </button>
                ))}
              </div>
            </div>

            <label className="field">
              <span>Class Summary &amp; Next-Class Follow-Up</span>
              <textarea
                className="field__in"
                rows={4}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setSaved(null);
                }}
                placeholder="Key topics covered today, homework assigned, and students to follow up with next class…"
              />
            </label>

            <div className="card card--wash" style={{ padding: "12px 14px", marginBottom: 12 }}>
              <div className="k" style={{ marginBottom: 4 }}>Consequence Preview Before Saving</div>
              <p className="muted" style={{ margin: 0 }}>
                Saving records <b>{attended} Attended</b> and <b>{noShow} No-show</b> (deducting 1 lesson-pack hour each), preserves hours for{" "}
                <b>{teacherCancel} Teacher cancel</b>, and publishes your class summary to{" "}
                <b>{rows.length} student &amp; parent progress feed{rows.length === 1 ? "" : "s"}</b>.
              </p>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className="hot hot--btn"
                style={btnStyle()}
                onClick={saveRecord}
                disabled={saving || !sessionId}
              >
                {saving ? "Saving Class Record…" : "Save Class Record"}
              </button>
              {saved ? (
                <span className="pill is-good">
                  Saved · Published to {saved.timeline_event_ids?.length ?? 0} student feed
                  {(saved.timeline_event_ids?.length ?? 0) === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
          </div>

          <div className="card">
            <h3>Session Activity Summary</h3>
            <div className="tl" style={{ marginTop: 6 }}>
              {events.map((e) => (
                <div className="tl__i" key={`${e.t}-${e.b}`}>
                  <div className="tl__t">{e.t}</div>
                  <div className="tl__b">{e.b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
