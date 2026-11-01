"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ClassNotices } from "@/components/studio/ClassNotices";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { AppBar, Err, Loading } from "./bits";

type TeacherWindowGroup = {
  teacher_id: string;
  teacher_name: string;
  windows: { weekday: string; start: string; end: string }[];
  gaps: { weekday: string; start: string; end: string }[];
};

type Dash = {
  student_id: string;
  upcoming_sessions: number;
  attempts: number;
  last_score: number | null;
  next_session?: {
    id: string;
    title: string;
    starts_at: string;
    teacher_user_id?: string;
    join_opens_at?: string | null;
  } | null;
  due_practice?: { id: string; title: string; unanswered: number; total: number; due_at?: string | null } | null;
  this_week?: { title: string; starts_at?: string | null; kind: string } | null;
  doubt?: { id: string; title: string; status: string; has_clip: boolean } | null;
  weak_tags?: string[];
  teacher_windows?: TeacherWindowGroup[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function parseHhMm(hhmm: string): { h: number; m: number } | null {
  const parts = (hhmm || "").trim().split(":");
  if (parts.length !== 2) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

function computeUpcomingOpenSlots(
  groups: TeacherWindowGroup[] | undefined,
  teacherId?: string,
): { iso: string; label: string }[] {
  const matched =
    teacherId && groups?.some((g) => g.teacher_id === teacherId)
      ? groups.filter((g) => g.teacher_id === teacherId)
      : groups || [];
  const windows = matched.flatMap((g) => g.windows || []);
  const now = new Date();
  const minTime = now.getTime() + 10 * 60 * 1000;
  const seen = new Set<string>();
  const slots: { iso: string; label: string; time: number }[] = [];

  for (let offset = 0; offset <= 7; offset += 1) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
    const wd = WEEKDAYS[day.getUTCDay()];
    for (const w of windows) {
      if (w.weekday !== wd) continue;
      const startHm = parseHhMm(w.start);
      const endHm = parseHhMm(w.end);
      if (!startHm || !endHm) continue;
      let cursorMin = startHm.h * 60 + startHm.m;
      const endMin = endHm.h * 60 + endHm.m;
      while (cursorMin + 60 <= endMin) {
        const sh = Math.floor(cursorMin / 60);
        const sm = cursorMin % 60;
        const eh = Math.floor((cursorMin + 60) / 60);
        const em = (cursorMin + 60) % 60;
        const startDt = new Date(
          Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), sh, sm, 0),
        );
        if (startDt.getTime() > minTime) {
          const iso = startDt.toISOString();
          if (!seen.has(iso)) {
            seen.add(iso);
            const dateStr = startDt.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            });
            const startStr = `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`;
            const endStr = `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
            slots.push({
              iso,
              label: `${dateStr} · ${startStr}–${endStr} (60 min)`,
              time: startDt.getTime(),
            });
          }
        }
        cursorMin += 60;
      }
    }
  }

  slots.sort((a, b) => a.time - b.time);
  return slots.map(({ iso, label }) => ({ iso, label }));
}

function SessionActions({
  sessionId,
  teacherId,
  teacherWindows,
}: {
  sessionId: string;
  teacherId?: string;
  teacherWindows?: TeacherWindowGroup[];
}) {
  const openSlots = useMemo(
    () => computeUpcomingOpenSlots(teacherWindows, teacherId),
    [teacherWindows, teacherId],
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [customWhen, setCustomWhen] = useState("");
  const [feedback, setFeedback] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (openSlots.length > 0 && !selectedSlot) {
      setSelectedSlot(openSlots[0].iso);
    } else if (openSlots.length === 0 && !selectedSlot) {
      setSelectedSlot("__custom__");
    }
  }, [openSlots, selectedSlot]);

  async function decline() {
    setMsg("");
    try {
      await api(`/api/v1/sessions/${sessionId}/student-change`, {
        method: "POST",
        body: JSON.stringify({ action: "decline", reason: "unwell" }),
      });
      setMsg("Marked as unwell. Your teacher has been notified.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function move() {
    const targetIso =
      selectedSlot === "__custom__"
        ? customWhen
          ? new Date(customWhen).toISOString()
          : ""
        : selectedSlot;
    if (!targetIso) return;
    setMsg("");
    try {
      await api(`/api/v1/sessions/${sessionId}/student-change`, {
        method: "POST",
        body: JSON.stringify({
          action: "reschedule",
          reason: "unavailable",
          starts_at: targetIso,
        }),
      });
      setMsg("Session rescheduled. Your teacher can see the updated time.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendFeedback() {
    if (!teacherId || !feedback.trim()) return;
    setMsg("");
    try {
      await api("/api/v1/feedback", {
        method: "POST",
        body: JSON.stringify({ teacher_user_id: teacherId, session_id: sessionId, body: feedback }),
      });
      setFeedback("");
      setMsg("Feedback shared with your teacher.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="card">
      <div className="k">Manage 1-on-1 Session</div>
      <label className="field" style={{ marginTop: 8 }}>
        <span>Reschedule to an open 60-minute teacher slot (next 7 days)</span>
        <select
          className="field__in"
          value={selectedSlot}
          onChange={(e) => setSelectedSlot(e.target.value)}
        >
          {openSlots.map((slot) => (
            <option key={slot.iso} value={slot.iso}>
              {slot.label}
            </option>
          ))}
          <option value="__custom__">Pick a custom date &amp; time…</option>
        </select>
      </label>
      {selectedSlot === "__custom__" ? (
        <label className="field" style={{ marginTop: 6 }}>
          <span>Custom date &amp; time</span>
          <input
            type="datetime-local"
            className="field__in"
            value={customWhen}
            onChange={(e) => setCustomWhen(e.target.value)}
          />
        </label>
      ) : null}
      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--sm"
          disabled={selectedSlot === "__custom__" ? !customWhen : !selectedSlot}
          onClick={() => void move()}
        >
          Reschedule to selected slot
        </button>
        <button type="button" className="btn btn--sm" onClick={() => void decline()}>
          Cannot attend (unwell)
        </button>
      </div>
      <label className="field" style={{ marginTop: 10 }}>
        <span>Note or feedback for your teacher</span>
        <textarea
          className="field__in"
          placeholder="Share topics you want to focus on or feedback from class…"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={2}
        />
      </label>
      <button type="button" className="btn btn--sm" onClick={() => void sendFeedback()}>
        Send note
      </button>
      {msg ? <p className="muted" style={{ marginTop: 8 }}>{msg}</p> : null}
    </div>
  );
}

function whenLabel(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function StudentDashScreen() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("there");

  useEffect(() => {
    api("/api/v1/auth/me")
      .then((me) => setName((me as { display_name?: string }).display_name || "there"))
      .catch(() => undefined);
    api("/api/v1/me/dashboard")
      .then((row) => setData(row as Dash))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const next = data?.next_session;
  const due = data?.due_practice;
  const week = data?.this_week;
  const doubt = data?.doubt;
  const tags = data?.weak_tags ?? [];

  return (
    <>
      <AppBar title={`Hi, ${name}`} extra={<span className="pill">student</span>} />
      <div className="appwrap">
        {!data && !error ? <Loading>Loading your day…</Loading> : null}
        <Err message={error} />
        <ClassNotices />
        {data ? (
          <>
            <Link href={catalogRoute("live-student")} className="hot hot--card">
              <div className="k">Whiteboard</div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>Open the class canvas</div>
              <div className="muted">Draw and solve problems live with your teacher.</div>
            </Link>
            <Link href={catalogRoute("join")} className="hot hot--card">
              <div className="k">
                {next ? whenLabel(next.starts_at) || "Next session" : "Sessions"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>
                {next?.title || `${data.upcoming_sessions} on the calendar`}
              </div>
              <div className="muted">
                {next?.join_opens_at
                  ? `Live · join opens ${whenLabel(next.join_opens_at)}`
                  : "Opens live class and marks your attendance"}
              </div>
            </Link>
            <Link href={catalogRoute("practice-play")} className="hot hot--card">
              <div className="k">
                {due?.due_at ? `Practice due · ${whenLabel(due.due_at)}` : "Practice"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>
                {due?.title || `${data.attempts} attempts`}
              </div>
              <div className="muted">
                {due ? `${due.unanswered} / ${due.total} unanswered` : `Last score ${data.last_score ?? "—"}`}
              </div>
            </Link>
            {week ? (
              <div className="card">
                <div className="k">This week</div>
                <div className="list__i" style={{ border: 0, padding: "8px 0" }}>
                  <div className="gr">
                    <div className="t">{week.title}</div>
                    <div className="s">{whenLabel(week.starts_at) || "On the calendar"}</div>
                  </div>
                  <span className="pill">{week.kind}</span>
                </div>
              </div>
            ) : null}
            <Link href={catalogRoute("doubt-student")} className="hot hot--card">
              <div className="k">
                {doubt?.status === "answered" ? "Your doubt was answered" : "Doubts"}
              </div>
              <div style={{ fontWeight: 600, margin: "3px 0" }}>{doubt?.title || "Ask a question after class"}</div>
              <div className="muted">
                {doubt?.has_clip ? "Clip attached · tap to view" : "Post a question and get a step-by-step reply"}
              </div>
            </Link>
            {(data.teacher_windows || []).map((row) => (
              <div className="card" key={row.teacher_id}>
                <div className="k">When {row.teacher_name} is available</div>
                {row.windows.length === 0 ? (
                  <p className="muted">No published office hours.</p>
                ) : (
                  row.windows.map((w) => (
                    <div key={`${w.weekday}-${w.start}`} className="s">
                      {w.weekday} {w.start}–{w.end}
                    </div>
                  ))
                )}
                {row.gaps.map((g) => (
                  <div key={`${g.weekday}-${g.start}`} className="muted">
                    {g.weekday} {g.start}–{g.end} is unavailable
                  </div>
                ))}
              </div>
            ))}
            {next ? (
              <SessionActions
                sessionId={next.id}
                teacherId={next.teacher_user_id}
                teacherWindows={data.teacher_windows}
              />
            ) : null}
            <div className="card">
              <div className="k" style={{ marginBottom: 8 }}>
                Topics to revise
              </div>
              {tags.length === 0 ? (
                <p className="muted">No weak topics flagged yet — complete a practice set to see recommendations.</p>
              ) : (
                <div className="chips">
                  {tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link href={catalogRoute("practice-play")} className="hot hot--btn ghost">
                  Practice these topics
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
