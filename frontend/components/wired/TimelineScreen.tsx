"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { AppBar, Empty, Err } from "./bits";

type Ev = { id: string; event_type: string; body: string; created_at?: string | null };
type Child = { student_id: string; display_name: string };

export function TimelineScreen() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [title, setTitle] = useState("Activity");
  const [error, setError] = useState("");
  const [role, setRole] = useState("student");

  useEffect(() => {
    async function run() {
      try {
        const me = (await api("/api/v1/auth/me")) as { role?: string };
        const r = me.role || "student";
        setRole(r);
        let studentId = "";
        if (r === "student") {
          const dash = (await api("/api/v1/me/dashboard")) as { student_id: string };
          studentId = dash.student_id;
          setTitle("Your record");
        } else if (r === "parent") {
          const home = (await api("/api/v1/parent/home")) as { children: Child[] };
          const child = home.children?.[0];
          if (!child) {
            setError("No linked child.");
            return;
          }
          studentId = child.student_id;
          setTitle(`${child.display_name}’s activity`);
        } else {
          const students = (await api("/api/v1/students")) as { id: string; display_name: string }[];
          if (!students[0]) {
            setError("No students.");
            return;
          }
          studentId = students[0].id;
          setTitle(students[0].display_name);
        }
        const rows = (await api(`/api/v1/students/${studentId}/timeline`)) as Ev[];
        setEvents(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    void run();
  }, []);

  const body = (
    <>
      <Err message={error} />
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
