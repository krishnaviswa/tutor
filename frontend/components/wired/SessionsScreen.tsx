"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Err } from "@/components/wired/bits";
import { FacultyAdminPanel } from "@/components/wired/FacultyAdminPanel";

const TZ = "Asia/Kolkata";
const TABS = ["Upcoming", "Completed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];
const SCOPE: Record<Tab, string> = {
  Upcoming: "upcoming",
  Completed: "completed",
  Cancelled: "cancelled",
};

type Mode = "register" | "supervision";

type SessionRow = {
  id: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  display_status: string;
  cohort_id: string | null;
  student_id: string | null;
  student_name: string | null;
  teacher_user_id?: string | null;
};

type StudentRow = { id: string; display_name: string };
type StaffRow = { id: string; display_name: string; role: string };

function when(iso: string | null): string {
  if (!iso) return "—";
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

function tone(display: string): string {
  if (display === "Cancelled") return "var(--crimson)";
  if (display === "Staff completed") return "var(--accent)";
  if (display === "Auto completed") return "var(--ink-faint)";
  return "var(--sky)";
}

export function SessionsScreen() {
  const [mode, setMode] = useState<Mode>("register");
  const [tab, setTab] = useState<Tab>("Upcoming");
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [handoffSessionId, setHandoffSessionId] = useState<string | null>(null);
  const [substituteId, setSubstituteId] = useState("");
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = new URLSearchParams({ scope: SCOPE[tab] });
      if (studentId) qs.set("student_id", studentId);
      const [sess, studs, staffList] = await Promise.all([
        api(`/api/v1/sessions?${qs.toString()}`) as Promise<SessionRow[]>,
        api("/api/v1/students") as Promise<StudentRow[]>,
        api("/api/v1/staff").catch(() => []) as Promise<StaffRow[]>,
      ]);
      setRows(Array.isArray(sess) ? sess : []);
      setStudents(Array.isArray(studs) ? studs : []);
      setStaff(Array.isArray(staffList) ? staffList : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [tab, studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || "")),
    [rows],
  );

  const staffNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of staff) {
      map[s.id] = s.display_name;
    }
    return map;
  }, [staff]);

  const teacherOptions = useMemo(
    () => staff.filter((m) => m.role === "teacher" || m.role === "owner"),
    [staff],
  );

  async function submitHandoff(sessionId: string) {
    if (!substituteId) return;
    setHandoffBusy(true);
    setError("");
    setHandoffNote("");
    try {
      await api(`/api/v1/sessions/${encodeURIComponent(sessionId)}/handoff`, {
        method: "POST",
        body: JSON.stringify({ teacher_user_id: substituteId }),
      });
      setHandoffNote(`Session handed off to ${staffNameMap[substituteId] || "substitute teacher"}.`);
      setHandoffSessionId(null);
      setSubstituteId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setHandoffBusy(false);
    }
  }

  return (
    <>
      <h2>Sessions</h2>
      <span className="k">All sessions · plan ahead and review what is done · Asia/Kolkata</span>

      <div
        className="row"
        role="tablist"
        aria-label="Sessions view mode"
        style={{
          margin: "12px 0 14px",
          gap: 8,
          borderBottom: "1px solid var(--line-soft)",
          paddingBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          className={mode === "register" ? "btn btn--dark btn--sm" : "btn btn--sm"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setMode("register")}
        >
          Sessions Register
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "supervision"}
          className={mode === "supervision" ? "btn btn--dark btn--sm" : "btn btn--sm"}
          style={{ width: "auto", margin: 0, cursor: "pointer" }}
          onClick={() => setMode("supervision")}
        >
          Faculty Supervision &amp; Roll Audit
        </button>
      </div>

      {mode === "supervision" ? (
        <FacultyAdminPanel showWhenRestricted />
      ) : (
        <>
          <div
            className="row"
            style={{ margin: "12px 0", gap: 8, alignItems: "center", flexWrap: "wrap" }}
          >
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                className={t === tab ? "btn btn--dark btn--sm" : "btn btn--sm"}
                style={{ width: "auto", margin: 0, cursor: "pointer" }}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
            <label className="field" style={{ margin: "0 0 0 auto", minWidth: 200 }}>
              <span>Student</span>
              <select className="field__in" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">All students</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <Err message={error} />
          {handoffNote ? <p className="muted" role="status">{handoffNote}</p> : null}

          <div className="card">
            <div className="k" style={{ marginBottom: 8 }}>
              Students you add on the roster appear in this dropdown for a 1-on-1 call.
            </div>
            {sorted.length === 0 ? (
              <p className="muted">No {tab.toLowerCase()} sessions.</p>
            ) : (
              sorted.map((s) => {
                const dest =
                  s.display_status === "Upcoming"
                    ? `/app/faculty/session-pre?session=${encodeURIComponent(s.id)}`
                    : `/app/faculty/record?session=${encodeURIComponent(s.id)}`;
                const assignedTeacher = s.teacher_user_id ? staffNameMap[s.teacher_user_id] : "";
                const isHandingOff = handoffSessionId === s.id;
                return (
                  <div
                    key={s.id}
                    className="list__i"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      padding: "10px 0",
                      borderTop: "1px solid var(--line-soft)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                      <div style={{ flex: 1 }}>
                        <Link
                          href={dest}
                          style={{
                            fontWeight: 500,
                            textDecoration: s.display_status === "Cancelled" ? "line-through" : "none",
                            color: s.display_status === "Cancelled" ? "var(--ink-faint)" : "inherit",
                          }}
                        >
                          {s.title}
                        </Link>
                        <div className="muted" style={{ fontSize: ".8rem" }}>
                          {when(s.starts_at)} · {s.student_name ? `1-on-1 · ${s.student_name}` : "Cohort"}
                          {assignedTeacher ? ` · ${assignedTeacher}` : ""}
                        </div>
                      </div>
                      {teacherOptions.length > 1 && s.display_status === "Upcoming" ? (
                        <button
                          type="button"
                          className="btn btn--sm"
                          style={{ width: "auto", margin: 0, cursor: "pointer" }}
                          onClick={() => {
                            setHandoffSessionId(isHandingOff ? null : s.id);
                            const defaultSub =
                              teacherOptions.find((t) => t.id !== s.teacher_user_id)?.id ||
                              teacherOptions[0]?.id ||
                              "";
                            setSubstituteId(defaultSub);
                          }}
                        >
                          {isHandingOff ? "Cancel handoff" : "Handoff"}
                        </button>
                      ) : null}
                      <span
                        className="pill"
                        style={{ border: `1px solid ${tone(s.display_status)}`, color: tone(s.display_status) }}
                      >
                        {s.display_status}
                      </span>
                    </div>

                    {isHandingOff ? (
                      <div>
                        <label className="field" style={{ margin: 0 }}>
                          <span>Substitute teacher</span>
                          <select
                            className="field__in"
                            value={substituteId}
                            onChange={(e) => setSubstituteId(e.target.value)}
                          >
                            <option value="">Select substitute…</option>
                            {teacherOptions
                              .filter((t) => t.id !== s.teacher_user_id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.display_name}
                                </option>
                              ))}
                          </select>
                        </label>
                        <div className="form-actions">
                          <button
                            type="button"
                            className="hot hot--btn"
                            disabled={!substituteId || handoffBusy}
                            onClick={() => void submitHandoff(s.id)}
                          >
                            {handoffBusy ? "Transferring…" : "Confirm handoff"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <p className="muted" style={{ marginTop: 10 }}>
            Completed is time-driven: a past session shows <b>Auto completed</b> until a record is filed, then{" "}
            <b>Staff completed</b>. Cancelled sessions stay tracked here and on the week calendar. An owner can edit a
            session time in any state.
          </p>
        </>
      )}
    </>
  );
}
