"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Err } from "./bits";

type Ev = { id: string; event_type: string; body: string; created_at?: string | null };
type Child = { student_id: string; display_name: string };

const EVENT_BADGE_LABELS: Record<string, string> = {
  "session.scheduled": "Session Scheduled",
  session_scheduled: "Session Scheduled",
  "session.started": "Class Started",
  session_started: "Class Started",
  "session.cancelled": "Session Cancelled",
  session_cancelled: "Session Cancelled",
  "session.student_change": "Session Rescheduled",
  session_joined: "Attendance Marked",
  "session.joined": "Attendance Marked",
  "attendance.marked": "Attendance Marked",
  attendance_marked: "Attendance Marked",
  "record.saved": "Class Summary Filed",
  session_recorded: "Class Summary Filed",
  "session.recorded": "Class Summary Filed",
  assignment_graded: "Homework Graded",
  "assignment.graded": "Homework Graded",
  practice_attempted: "Practice Completed",
  "practice.attempted": "Practice Completed",
  test_submitted: "Test Submitted",
  "test.submitted": "Test Submitted",
  doubt_opened: "Doubt Asked",
  "doubt.opened": "Doubt Asked",
  "doubt.answered": "Doubt Clarified",
  doubt_answered: "Doubt Clarified",
  announcement: "Class Announcement",
  "invoice.created": "Invoice Issued",
  "invoice.payment_attempted": "Payment Initiated",
  "invoice.paid": "Tuition Paid",
  "invoice.refunded": "Payment Refunded",
  automation: "Follow-Up Scheduled",
  engagement: "Live Poll / Activity",
};

function formatEventKind(eventType: string): string {
  const clean = (eventType || "").trim();
  if (EVENT_BADGE_LABELS[clean]) return EVENT_BADGE_LABELS[clean];
  return clean
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const FILTER_CHIPS: { value: string; label: string }[] = [
  { value: "", label: "All Activity" },
  { value: "session", label: "Classes" },
  { value: "practice", label: "Practice" },
  { value: "doubt", label: "Doubts" },
  { value: "attendance", label: "Attendance" },
];

function asEvents(data: unknown): Ev[] {
  if (Array.isArray(data)) return data as Ev[];
  if (data && typeof data === "object" && Array.isArray((data as { events?: Ev[] }).events)) {
    return (data as { events: Ev[] }).events;
  }
  return [];
}

export function TimelineScreen() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [title, setTitle] = useState("Activity");
  const [error, setError] = useState("");
  const [role, setRole] = useState("student");
  const [studentId, setStudentId] = useState("");
  const [eventType, setEventType] = useState("");

  useEffect(() => {
    async function run() {
      try {
        const me = (await api("/api/v1/auth/me")) as { role?: string };
        const r = me.role || "student";
        setRole(r);
        let id = "";
        if (r === "student") {
          const dash = (await api("/api/v1/me/dashboard")) as { student_id: string };
          id = dash.student_id;
          setTitle("Your Activity & Progress");
        } else if (r === "parent") {
          const home = (await api("/api/v1/parent/home")) as { children: Child[] };
          const child = home.children?.[0];
          if (!child) {
            setError("No linked child.");
            return;
          }
          id = child.student_id;
          setTitle(`${child.display_name}’s Activity`);
        } else {
          const students = (await api("/api/v1/students")) as { id: string; display_name: string }[];
          if (!students[0]) {
            setError("No students.");
            return;
          }
          id = students[0].id;
          setTitle(students[0].display_name);
        }
        setStudentId(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    void run();
  }, []);

  useEffect(() => {
    if (!studentId) return;
    const q = eventType.trim()
      ? `?event_type=${encodeURIComponent(eventType.trim())}`
      : "";
    api(`/api/v1/students/${studentId}/timeline${q}`)
      .then((data) => setEvents(asEvents(data)))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [studentId, eventType]);

  const body = (
    <>
      <Err message={error} />
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value || "all"}
            type="button"
            className={`chip${eventType === chip.value ? " on" : ""}`}
            onClick={() => setEventType(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      {events.length === 0 ? (
        <div className="history">
          <article className="history__item">
            <div className="history__when">Example</div>
            <div>
              <span className="pill" style={{ marginBottom: 4, display: "inline-block" }}>
                Class Summary Filed
              </span>
              <p className="muted">Class attendance, teacher summary notes, and recording links appear here after each session.</p>
            </div>
          </article>
          <article className="history__item">
            <div className="history__when">Example</div>
            <div>
              <span className="pill" style={{ marginBottom: 4, display: "inline-block" }}>
                Practice Completed
              </span>
              <p className="muted">Completed practice sets and checkpoint test scores are logged chronologically.</p>
            </div>
          </article>
        </div>
      ) : (
        <div className="history">
          {events.map((e) => (
            <article key={e.id} className="history__item">
              <div className="history__when">
                {e.created_at
                  ? new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : formatEventKind(e.event_type)}
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>
                  <span className="pill">{formatEventKind(e.event_type)}</span>
                </div>
                <p className="muted">{e.body || "Activity recorded."}</p>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="card card--wash" style={{ marginTop: 14 }}>
        <p className="muted">Complete chronological history of classes, attendance, practice sets, and teacher updates.</p>
      </div>
    </>
  );

  if (role === "teacher" || role === "owner" || role === "assistant") {
    return (
      <>
        <h2>{title}</h2>
        <span className="k">Activity &amp; progress history</span>
        {body}
      </>
    );
  }

  return (
    <>
      <AppBar title={title} extra={<span className="pill">{role === "parent" ? "your child only" : "record"}</span>} />
      <div className="appwrap">{body}</div>
    </>
  );
}
