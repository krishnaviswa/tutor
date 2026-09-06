"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "@/lib/api";

const TZ = "Asia/Kolkata";
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type SessionRow = {
  id: string;
  workspace_id: string;
  cohort_id: string;
  title: string;
  starts_at: string | null;
  teacher_user_id?: string;
};

type CohortRow = {
  id: string;
  name: string;
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

export function ScheduleScreen() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("New session");
  const [startsLocal, setStartsLocal] = useState("");
  const [cohortId, setCohortId] = useState("");

  const monday = useMemo(() => addDays(mondayOf(istYmd(new Date())), weekOffset * 7), [weekOffset]);
  const weekDays = useMemo(
    () => WEEKDAYS.map((label, i) => ({ label, ymd: addDays(monday, i) })),
    [monday],
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const [sess, coh] = await Promise.all([
        api("/api/v1/sessions") as Promise<SessionRow[]>,
        api("/api/v1/cohorts") as Promise<CohortRow[]>,
      ]);
      setSessions(Array.isArray(sess) ? sess : []);
      setCohorts(Array.isArray(coh) ? coh : []);
      setCohortId((current) => current || (Array.isArray(coh) && coh[0] ? coh[0].id : ""));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const cohortName = cohorts[0]?.name || "Cohort";
  const upcoming = useMemo(() => {
    const now = Date.now();
    const weekRows = byDay.flat();
    return weekRows.find((s) => s.starts_at && new Date(s.starts_at).getTime() >= now) || weekRows[0] || null;
  }, [byDay]);

  async function createSession() {
    const cid = cohortId || cohorts[0]?.id;
    const when = startsLocal || `${addDays(monday, 1)}T18:30`;
    if (!cid) {
      setError("No cohort yet — create one before scheduling.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editingId) {
        await api(`/api/v1/sessions/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim() || "Session",
            starts_at: `${when}:00+05:30`,
          }),
        });
      } else {
        await api("/api/v1/sessions", {
          method: "POST",
          body: JSON.stringify({
            cohort_id: cid,
            title: title.trim() || "New session",
            starts_at: `${when}:00+05:30`,
          }),
        });
      }
      setComposing(false);
      setEditingId(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith("409")) {
        setError("That slot conflicts with another class.");
      } else {
        setError(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  function openReschedule(row: SessionRow) {
    setEditingId(row.id);
    setTitle(row.title);
    if (row.starts_at) {
      const d = new Date(row.starts_at);
      const pad = (n: number) => String(n).padStart(2, "0");
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setStartsLocal(local);
    }
    setComposing(true);
  }

  return (
    <>
      <h2>This week</h2>
      <span className="k">
        {cohortName} ▾ &nbsp;·&nbsp; Asia/Kolkata
      </span>
      <div className="row" style={{ marginBottom: 14 }}>
        <button
          type="button"
          className="btn btn--dark btn--sm"
          style={btnStyle()}
          onClick={() => {
            setComposing((open) => {
              if (!open) {
                setEditingId(null);
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
      </div>
      {composing ? (
        <div className="card" style={{ marginBottom: 14 }}>
          <h3>{editingId ? "Reschedule" : "New session"}</h3>
          <label className="field">
            <span>Title</span>
            <input className="field__in" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="field">
            <span>Starts (IST)</span>
            <input
              className="field__in"
              type="datetime-local"
              value={startsLocal}
              onChange={(e) => setStartsLocal(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Cohort</span>
            <select value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="row">
            <button type="button" className="hot hot--btn" style={btnStyle()} disabled={busy} onClick={() => void createSession()}>
              {busy ? "Saving…" : editingId ? "Save time" : "Create session"}
            </button>
            <button type="button" className="btn btn--sm" style={btnStyle()} onClick={() => { setComposing(false); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="muted">{error}</p> : null}
      <div className="tblwrap">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(116px, 1fr))", gap: 8, minWidth: 560 }}>
          {weekDays.map((day, i) => (
            <div
              key={day.ymd}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line-soft)",
                borderRadius: 10,
                padding: 8,
                minHeight: 150,
              }}
            >
              <div className="k" style={{ marginBottom: 8 }}>
                {day.label} {dayNum(day.ymd)}
              </div>
              {byDay[i].length ? (
                byDay[i].map((s) => (
                  <div key={s.id} style={{ marginBottom: 6 }}>
                    <Link
                      href={`/app/faculty/session-pre?session=${encodeURIComponent(s.id)}`}
                      className="hot hot--row"
                      style={{ padding: 8, display: "block" }}
                    >
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--ink-faint)" }}>
                        {s.starts_at ? formatTime(s.starts_at) : "—"}
                      </div>
                      <div style={{ fontSize: ".78rem", fontWeight: 500, lineHeight: 1.2, marginTop: 2 }}>{s.title}</div>
                    </Link>
                    <button type="button" className="btn btn--sm" style={btnStyle({ marginTop: 4 })} onClick={() => openReschedule(s)}>
                      Reschedule
                    </button>
                  </div>
                ))
              ) : (
                <div className="muted" style={{ fontSize: ".72rem" }}>
                  —
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {upcoming ? (
        <>
          <p className="muted" style={{ marginTop: 12 }}>
            Next block is <b>{upcoming.title}</b> — open it.
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
      ) : (
        <p className="muted" style={{ marginTop: 12 }}>
          No sessions this week. Use + New session to add one.
        </p>
      )}
    </>
  );
}
