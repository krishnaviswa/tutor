"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { catalogRoute } from "@/lib/screens";
import { Av, Empty, Err } from "./bits";

const ACTION_PRESETS = [
  { value: "1-on-1 Concept Recovery · High Priority", label: "1-on-1 Concept Recovery · High Priority" },
  { value: "Missed Class Catch-Up · Medium Priority", label: "Missed Class Catch-Up · Medium Priority" },
  { value: "Targeted Practice Review · Normal Priority", label: "Targeted Practice Review · Normal Priority" },
  { value: "Exam Strategy Check-In · High Priority", label: "Exam Strategy Check-In · High Priority" },
];

type Item = {
  id: string;
  title: string;
  status: string;
  student_id?: string | null;
  kind?: string;
  booked_session_id?: string | null;
};
type Session = { id: string; title: string };
type Student = { id: string; display_name: string };

function formatHumanText(raw?: string | null): string {
  if (!raw) return "Follow-Up";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function MentorScreen() {
  const [rows, setRows] = useState<Item[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessionId, setSessionId] = useState("");

  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "booked">("all");

  const [showCreate, setShowCreate] = useState(false);
  const [newStudentId, setNewStudentId] = useState<string>("");
  const [newAction, setNewAction] = useState<string>(ACTION_PRESETS[0].value);
  const [newNote, setNewNote] = useState<string>("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    Promise.all([
      api("/api/v1/backlog") as Promise<Item[]>,
      api("/api/v1/sessions") as Promise<Session[]>,
      api("/api/v1/students").catch(() => []) as Promise<Student[]>,
    ])
      .then(([b, s, st]) => {
        setRows(Array.isArray(b) ? b : []);
        const sessList = Array.isArray(s) ? s : [];
        const studList = Array.isArray(st) ? st : [];
        setSessions(sessList);
        setStudents(studList);
        if (sessList[0]) setSessionId((prev) => prev || sessList[0].id);
        if (studList[0]) setNewStudentId((prev) => prev || studList[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }

  useEffect(() => {
    load();
  }, []);

  async function book(id: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/api/v1/backlog/${id}/book`, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId || null }),
      });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAddFollowUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/v1/analysis/mentor-followup/action", {
        method: "PATCH",
        body: JSON.stringify({
          action: newAction,
          note: newNote,
          student_id: newStudentId || null,
        }),
      });
      setNewNote("");
      setShowCreate(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const studentById = new Map(students.map((s) => [s.id, s.display_name]));
  const sessionById = new Map(sessions.map((s) => [s.id, s.title]));

  function resolveStudentName(studentId?: string | null): string {
    if (!studentId) return "Cohort-Wide Follow-Up";
    return studentById.get(studentId) || "Enrolled Student";
  }

  const filteredRows = rows.filter((r) => {
    if (studentFilter !== "all" && r.student_id !== studentFilter) return false;
    if (statusFilter === "open" && r.status === "booked") return false;
    if (statusFilter === "booked" && r.status !== "booked") return false;
    return true;
  });

  const openCount = rows.filter((r) => r.status !== "booked").length;
  const bookedCount = rows.filter((r) => r.status === "booked").length;

  return (
    <>
      <div className="page-toolbar">
        <div className="page-toolbar__title">
          <h2>Mentor Follow-Up &amp; Recovery Queue</h2>
          <span className="k">
            {openCount} open follow-up{openCount === 1 ? "" : "s"} · {bookedCount} booked · Assign 1-on-1 recovery slots for missed classes or weak topics
          </span>
        </div>
        <div className="page-toolbar__actions">
          <button
            type="button"
            className="hot hot--btn"
            onClick={() => setShowCreate((prev) => !prev)}
          >
            {showCreate ? "Hide Follow-Up Form" : "+ New Follow-Up"}
          </button>
          <Link href={catalogRoute("teacher-dash")} className="btn btn--sm">
            Teaching Hub
          </Link>
        </div>
      </div>

      <Err message={error} />

      <div className="card">
        <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <label className="field">
            <span>Target Session to Book Onto</span>
            <select
              className="field__in"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
            >
              {sessions.length === 0 ? <option value="">No sessions scheduled</option> : null}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Filter by Student</span>
            <select
              className="field__in"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
            >
              <option value="all">All Students ({rows.length})</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.display_name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Filter by Status</span>
            <select
              className="field__in"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "open" | "booked")}
            >
              <option value="all">All Items ({rows.length})</option>
              <option value="open">Needs Booking ({openCount})</option>
              <option value="booked">Booked ({bookedCount})</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid g2" style={{ alignItems: "start" }}>
        {/* Primary Column: Active Backlog List */}
        <div>
          {filteredRows.length === 0 ? (
            <Empty>No mentor follow-up items match this filter.</Empty>
          ) : (
            filteredRows.map((r) => {
              const sName = resolveStudentName(r.student_id);
              const isBooked = r.status === "booked";
              const bookedSessionTitle = r.booked_session_id ? sessionById.get(r.booked_session_id) : null;
              return (
                <div key={r.id} className="card">
                  <div className="sb" style={{ flexWrap: "wrap", gap: 10 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <Av name={sName} />
                      <div>
                        <div className="t">{formatHumanText(r.title)}</div>
                        <div className="s muted">
                          Student: <b>{sName}</b> · Category: {formatHumanText(r.kind)}
                          {bookedSessionTitle ? ` · Session: ${bookedSessionTitle}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className={`pill ${isBooked ? "is-good" : "is-warn"}`}>
                        {isBooked ? "Booked into Session" : "Needs Booking"}
                      </span>
                      {!isBooked ? (
                        <button
                          className="btn btn--dark btn--sm"
                          type="button"
                          disabled={busy}
                          onClick={() => void book(r.id)}
                        >
                          Book Slot
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Secondary Column: Constrained Follow-Up Creation Form */}
        <div>
          <form onSubmit={onAddFollowUp} className="card">
            <div className="sb" style={{ marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>{showCreate ? "Add Student Follow-Up" : "Quick Follow-Up Planner"}</h3>
              <span className="pill is-info">1-on-1 Recovery</span>
            </div>

            <label className="field">
              <span>Select Student</span>
              <select
                className="field__in"
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value)}
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.display_name}
                  </option>
                ))}
                <option value="">All Cohort Students</option>
              </select>
            </label>

            <label className="field">
              <span>Follow-Up Action &amp; Priority</span>
              <select
                className="field__in"
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
              >
                {ACTION_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Focus Topic / Note (Optional)</span>
              <input
                className="field__in"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="e.g., Revise rotational motion numericals"
              />
            </label>

            <button className="hot hot--btn" type="submit" disabled={busy}>
              {busy ? "Adding Follow-Up…" : "Add to Mentor Queue"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
