"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Ev = { id: string; event_type: string; body: string; created_at?: string | null };
type Child = { student_id: string; display_name: string };

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
          setTitle("Your record");
        } else if (r === "parent") {
          const home = (await api("/api/v1/parent/home")) as { children: Child[] };
          const child = home.children?.[0];
          if (!child) {
            setError("No linked child.");
            return;
          }
          id = child.student_id;
          setTitle(`${child.display_name}’s activity`);
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
      <label className="field">
        <span>event_type</span>
        <input
          className="field__in"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        />
      </label>
      {events.length === 0 ? (
        <Empty>Timeline is empty. Record, practice, and join write here first.</Empty>
      ) : (
        <div className="tl">
          {events.map((e) => (
            <div key={e.id} className="tl__i">
              <div className="tl__t">{e.created_at || e.event_type}</div>
              <div className="tl__b">{e.body || e.event_type}</div>
            </div>
          ))}
        </div>
      )}
      <div className="card card--wash" style={{ marginTop: 14 }}>
        <p className="muted">The ledger. WhatsApp is a channel, not this screen.</p>
      </div>
    </>
  );

  if (role === "teacher" || role === "owner" || role === "assistant") {
    return (
      <>
        <h2>{title}</h2>
        <span className="k">timeline_events</span>
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
