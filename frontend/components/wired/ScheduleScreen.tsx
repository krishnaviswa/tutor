"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";
import { Err, Loading } from "./bits";

const TZ = "Asia/Kolkata";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const SESSION_TITLE_PRESETS = [
  "Concept Lecture & Problem Solving",
  "Doubt Clearing & Revision",
  "1-on-1 Mentorship & Backlog",
  "Mock Test Review & Analysis",
  "Weekly Practice Drill",
  "Past Paper Walkthrough",
] as const;

const TIME_SLOTS_15M = Array.from({ length: (22 - 7) * 4 }, (_, idx) => {
  const totalMinutes = 7 * 60 + idx * 15;
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
});

const QUICK_SLOTS = ["09:00", "11:00", "16:00", "17:30", "18:30", "19:30", "20:30"] as const;

export type SessionRow = {
  id: string;
  workspace_id: string;
  cohort_id: string | null;
  student_id?: string | null;
  student_name?: string | null;
  title: string;
  starts_at: string | null;
  ends_at?: string | null;
  status?: string;
  display_status?: string;
  teacher_user_id?: string;
};

type CohortRow = { id: string; name: string };
type StudentRow = { id: string; display_name: string };
type TopicRow = { id: string; name?: string; title?: string };
type Availability = {
  windows: { weekday: string; start: string; end: string }[];
  blocks: { date: string; start: string; end: string; available: boolean }[];
};

function istYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function mondayOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 6, 30));
  const wd = dt.getUTCDay();
  const offset = wd === 0 ? -6 : 1 - wd;
  dt.setUTCDate(dt.getUTCDate() + offset);
  return dt.toISOString().slice(0, 10);
}

function dayNum(ymd: string): string {
  return String(Number(ymd.slice(8, 10)));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function weekdayIndexMon(iso: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date(iso));
  return WEEKDAYS.indexOf(wd as (typeof WEEKDAYS)[number]);
}

function btnStyle(extra?: CSSProperties): CSSProperties {
  return { width: "auto", margin: 0, cursor: "pointer", ...extra };
}

function hourConsequence(originalIso: string, owner: boolean, apiHour?: string): string {
  if (owner) return "Hour stays because the owner can waive it.";
  if (apiHour === "stays") return "Hour stays";
  if (apiHour === "used") return "Hour is used";
  const start = new Date(originalIso).getTime();
  if (Number.isNaN(start)) return "Hour stays";
  const boundary = start - 24 * 60 * 60 * 1000;
  return Date.now() <= boundary ? "Hour stays" : "Hour is used";
}

function stepMinutes(localIso: string, deltaMinutes: number): string {
  const [datePart, timePart] = (localIso || "").split("T");
  if (!datePart || !timePart) return localIso;
  const [hh, mm] = timePart.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return localIso;
  const total = Math.max(0, Math.min(23 * 60 + 45, hh * 60 + mm + deltaMinutes));
  const nextH = String(Math.floor(total / 60)).padStart(2, "0");
  const nextM = String(total % 60).padStart(2, "0");
  return `${datePart}T${nextH}:${nextM}`;
}

export function ScheduleScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titlePreset, setTitlePreset] = useState<string>("__custom__");
  const [title, setTitle] = useState("New session");
  const [startsLocal, setStartsLocal] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [mode, setMode] = useState<"cohort" | "student">("cohort");
  const [studentId, setStudentId] = useState("");
  const [showAvail, setShowAvail] = useState(false);
  const [avail, setAvail] = useState<Availability | null>(null);
  const [ready, setReady] = useState(false);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [originalStart, setOriginalStart] = useState<string | null>(null);
  const [hourNote, setHourNote] = useState("");

  const monday = useMemo(() => addDays(mondayOf(istYmd(new Date())), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(
    () => WEEKDAYS.map((label, i) => ({ label, ymd: addDays(monday, i) })),
    [monday],
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const [sess, coh, studs, topicRows] = await Promise.all([
        api("/api/v1/sessions") as Promise<SessionRow[]>,
        api("/api/v1/cohorts") as Promise<CohortRow[]>,
        api("/api/v1/students").catch(() => []) as Promise<StudentRow[]>,
        api("/api/v1/topics").catch(() => []) as Promise<TopicRow[]>,
      ]);
      setSessions(Array.isArray(sess) ? sess : []);
      setCohorts(Array.isArray(coh) ? coh : []);
      setStudents(Array.isArray(studs) ? studs : []);
      setTopics(Array.isArray(topicRows) ? topicRows : []);
      setCohortId((current) => current || (Array.isArray(coh) && coh[0] ? coh[0].id : ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    api("/api/v1/auth/me")
      .then((me) => {
        if (!cancelled) setIsOwner((me as { role?: string }).role === "owner");
      })
      .catch(() => {
        if (!cancelled) setIsOwner(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showAvail || avail) return;
    (async () => {
      try {
        setAvail((await api("/api/v1/availability")) as Availability);
      } catch {
        setAvail({ windows: [], blocks: [] });
      }
    })();
  }, [showAvail, avail]);

  const titlePresets = useMemo(() => {
    const topicNames = topics.map((t) => (t.title || t.name || "").trim()).filter(Boolean);
    return Array.from(new Set([...topicNames, ...SESSION_TITLE_PRESETS]));
  }, [topics]);

  const byDay = useMemo(() => {
    const buckets: SessionRow[][] = WEEKDAYS.map(() => []);
    const start = monday;
    const end = addDays(monday, 6);
    for (const row of sessions) {
      if (!row.starts_at) continue;
      const ymd = istYmd(new Date(row.starts_at));
      if (ymd < start || ymd >= end) continue;
      const idx = weekdayIndexMon(row.starts_at);
      if (idx >= 0) buckets[idx].push(row);
    }
    for (const bucket of buckets) {
      bucket.sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""));
    }
    return buckets;
  }, [sessions, monday]);

  const availByWeekday = useMemo(() => {
    const map: Record<string, { start: string; end: string }[]> = {};
    for (const w of avail?.windows ?? []) {
      if (!map[w.weekday]) map[w.weekday] = [];
      map[w.weekday].push({ start: w.start, end: w.end });
    }
    for (const day of Object.keys(map)) {
      map[day].sort((a, b) => a.start.localeCompare(b.start));
    }
    return map;
  }, [avail]);

  const cohortName = cohorts[0]?.name || "Cohort";
  const upcoming = useMemo(() => {
    const now = Date.now();
    const weekRows = byDay.flat().filter((s) => s.status !== "cancelled");
    return weekRows.find((s) => s.starts_at && new Date(s.starts_at).getTime() >= now) || weekRows[0] || null;
  }, [byDay]);

  const defaultWhen = `${addDays(monday, 1)}T18:30`;
  const effectiveStartsLocal = startsLocal || defaultWhen;
  const currentDatePart = effectiveStartsLocal.split("T")[0] || addDays(monday, 1);
  const currentTimePart = (effectiveStartsLocal.split("T")[1] || "18:30").slice(0, 5);

  function setDatePart(ymd: string) {
    setStartsLocal(`${ymd}T${currentTimePart}`);
  }

  function setTimePart(hm: string) {
    setStartsLocal(`${currentDatePart}T${hm}`);
  }

  async function createSession() {
    const when = startsLocal || defaultWhen;
    const payload: Record<string, unknown> = {
      title: title.trim() || "New session",
      starts_at: `${when}:00+05:30`,
    };
    if (!editingId) {
      if (mode === "student") {
        if (!studentId) {
          setError("Pick a student for the 1-on-1.");
          return;
        }
        payload.student_id = studentId;
      } else {
        const cid = cohortId || cohorts[0]?.id;
        if (!cid) {
          setError("No cohort yet — create one before scheduling.");
          return;
        }
        payload.cohort_id = cid;
      }
    }
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        const result = (await api(`/api/v1/sessions/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({ title: payload.title, starts_at: payload.starts_at }),
        })) as { hour?: string };
        if (originalStart) {
          setHourNote(hourConsequence(originalStart, isOwner === true, result?.hour));
        }
      } else {
        await api("/api/v1/sessions", { method: "POST", body: JSON.stringify(payload) });
        setHourNote("");
      }
      setComposing(false);
      setEditingId(null);
      setOriginalStart(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("409")) setError("That slot conflicts with another class.");
      else if (msg.includes("outside availability")) setError("That time is outside the teacher's availability.");
      else setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function cancelSession(row: SessionRow) {
    if (!window.confirm(`Cancel "${row.title}"? Parents and admin are notified.`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/sessions/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function openReschedule(row: SessionRow) {
    setEditingId(row.id);
    setOriginalStart(row.starts_at);
    setHourNote("");
    setTitle(row.title);
    setTitlePreset(titlePresets.includes(row.title) ? row.title : "__custom__");
    if (row.starts_at) {
      const d = new Date(row.starts_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      setStartsLocal(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
      );
    }
    setComposing(true);
  }

  return (
    <>
      <h2>This week</h2>
      <span className="k">
        {cohortName} ▾ &nbsp;·&nbsp; Asia/Kolkata
      </span>
      <div className="row" style={{ marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--dark btn--sm"
          style={btnStyle()}
          onClick={() => {
            setComposing((open) => {
              if (!open) {
                setEditingId(null);
                setOriginalStart(null);
                setStartsLocal(`${addDays(monday, 1)}T18:30`);
              }
              return !open;
            });
          }}
        >
          + New session
        </button>
        <button type="button" className="btn btn--sm" style={btnStyle()} onClick={() => setWeekOffset((n) => n - 1)}>
          ‹ prev week
        </button>
        <button type="button" className="btn btn--sm" style={btnStyle()} onClick={() => setWeekOffset((n) => n + 1)}>
          next week ›
        </button>
        <Link href="/app/faculty/sessions" className="btn btn--sm" style={btnStyle({ textDecoration: "none" })}>
          Sessions list
        </Link>
        <Link href="/app/faculty/availability" className="btn btn--sm" style={btnStyle({ textDecoration: "none" })}>
          Availability
        </Link>
        <button
          type="button"
          className={showAvail ? "btn btn--dark btn--sm" : "btn btn--sm"}
          style={btnStyle()}
          onClick={() => setShowAvail((v) => !v)}
        >
          {showAvail ? "Hide availability" : "Show availability"}
        </button>
      </div>
      {composing ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>{editingId ? "Reschedule" : "New session"}</h3>

          <div className="grid g2" style={{ gap: 10 }}>
            <label className="field">
              <span>Topic / Session preset</span>
              <select
                className="field__in"
                value={titlePreset}
                onChange={(e) => {
                  const chosen = e.target.value;
                  setTitlePreset(chosen);
                  if (chosen !== "__custom__") {
                    setTitle(chosen);
                  }
                }}
              >
                <option value="__custom__">Custom title…</option>
                {titlePresets.map((preset) => (
                  <option key={preset} value={preset}>
                    {preset}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Title</span>
              <input
                className="field__in"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitlePreset("__custom__");
                }}
              />
            </label>
          </div>

          <div className="grid g3" style={{ gap: 10, alignItems: "end" }}>
            <label className="field">
              <span>Starts (IST)</span>
              <input
                className="field__in"
                type="datetime-local"
                step={900}
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Day of week</span>
              <select
                className="field__in"
                value={currentDatePart}
                onChange={(e) => setDatePart(e.target.value)}
              >
                {!weekDays.some((d) => d.ymd === currentDatePart) ? (
                  <option value={currentDatePart}>{currentDatePart}</option>
                ) : null}
                {weekDays.map((d) => (
                  <option key={d.ymd} value={d.ymd}>
                    {d.label} ({d.ymd})
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>15-min time slot (IST)</span>
              <select
                className="field__in"
                value={currentTimePart}
                onChange={(e) => setTimePart(e.target.value)}
              >
                {!TIME_SLOTS_15M.includes(currentTimePart) ? (
                  <option value={currentTimePart}>{currentTimePart}</option>
                ) : null}
                {TIME_SLOTS_15M.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} IST
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row" style={{ gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              Quick 15m slots:
            </span>
            {QUICK_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`chip${currentTimePart === slot ? " on" : ""}`}
                onClick={() => setTimePart(slot)}
              >
                {slot}
              </button>
            ))}
            <button
              type="button"
              className="btn btn--sm"
              style={btnStyle()}
              onClick={() => setStartsLocal(stepMinutes(effectiveStartsLocal, -15))}
            >
              −15m
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={btnStyle()}
              onClick={() => setStartsLocal(stepMinutes(effectiveStartsLocal, 15))}
            >
              +15m
            </button>
          </div>

          {!editingId && (
            <>
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <button
                  type="button"
                  className={mode === "cohort" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btnStyle()}
                  onClick={() => setMode("cohort")}
                >
                  Cohort
                </button>
                <button
                  type="button"
                  className={mode === "student" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                  style={btnStyle()}
                  onClick={() => setMode("student")}
                >
                  1-on-1 student
                </button>
              </div>
              {mode === "cohort" ? (
                <label className="field">
                  <span>Cohort</span>
                  <select className="field__in" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span>Student</span>
                  <select className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                    <option value="">Pick a student…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.display_name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          {editingId && originalStart && isOwner !== null ? (
            <p className="muted" role="status">
              {hourConsequence(originalStart, isOwner)}
            </p>
          ) : null}
          <div className="row">
            <button
              type="button"
              className="hot hot--btn"
              style={btnStyle()}
              disabled={busy}
              aria-busy={busy}
              onClick={() => void createSession()}
            >
              {busy ? "Saving…" : editingId ? "Save time" : "Create session"}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              style={btnStyle()}
              onClick={() => {
                setComposing(false);
                setEditingId(null);
                setOriginalStart(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {hourNote ? (
        <p className="muted" role="status">
          {hourNote}
        </p>
      ) : null}
      {!ready ? <Loading>Loading this week…</Loading> : null}
      <Err message={error} />
      <div className="tblwrap">
        <div className="week">
          {weekDays.map((day, i) => {
            const spans = availByWeekday[day.label] || [];
            const dim = showAvail && spans.length === 0;
            const gapNote = spans
              .map((span, index) => {
                const next = spans[index + 1];
                return next && span.end < next.start ? `${span.end}–${next.start} closed` : "";
              })
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={day.ymd} className={dim ? "week__day is-off" : "week__day"}>
                <div className="k" style={{ marginBottom: 8 }}>
                  {day.label} {dayNum(day.ymd)}
                  {showAvail && (
                    <span className="muted" style={{ marginLeft: 4 }}>
                      {spans.length
                        ? `· ${spans.map((span) => `${span.start}–${span.end}`).join(", ")}${gapNote ? ` · ${gapNote}` : ""}`
                        : "· off"}
                    </span>
                  )}
                </div>
                {byDay[i].length ? (
                  byDay[i].map((s) => {
                    const cancelled = s.status === "cancelled";
                    return (
                      <div key={s.id} style={{ marginBottom: 6 }}>
                        <Link
                          href={`/app/faculty/session-pre?session=${encodeURIComponent(s.id)}`}
                          className="hot hot--row"
                          style={{
                            display: "block",
                            opacity: cancelled ? 0.55 : 1,
                            marginBottom: 0,
                          }}
                        >
                          <div className="k">{s.starts_at ? formatTime(s.starts_at) : "—"}</div>
                          <div
                            className="t"
                            style={{
                              marginTop: 2,
                              textDecoration: cancelled ? "line-through" : "none",
                            }}
                          >
                            {s.title}
                            {s.student_name ? ` · ${s.student_name}` : ""}
                          </div>
                        </Link>
                        {!cancelled && (
                          <div className="row" style={{ gap: 4, marginTop: 4 }}>
                            <button
                              type="button"
                              className="btn btn--sm"
                              style={btnStyle()}
                              onClick={() => openReschedule(s)}
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm"
                              style={btnStyle()}
                              disabled={busy}
                              onClick={() => void cancelSession(s)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="muted">Open</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {upcoming ? (
        <>
          <p className="muted" style={{ marginTop: 12 }}>
            Next block is <b>{upcoming.title}</b> — open it. Cancelled sessions stay struck-through; upcoming /
            completed / cancelled lists are on <Link href="/app/faculty/sessions">Sessions</Link>.
          </p>
          <div style={{ marginTop: 8 }}>
            <Link
              href={`/app/faculty/session-pre?session=${encodeURIComponent(upcoming.id)}`}
              className="hot hot--btn"
              style={btnStyle({ textDecoration: "none" })}
            >
              Open tonight’s session
            </Link>
          </div>
        </>
      ) : ready ? (
        <p className="muted" style={{ marginTop: 12 }}>
          No sessions this week. Use + New session to add one.
        </p>
      ) : null}
    </>
  );
}
