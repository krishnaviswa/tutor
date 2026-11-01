"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@/components/Dialog";
import { api } from "@/lib/api";
import { Err } from "./bits";

type Person = { user_id: string; name: string; role: string };
type Teacher = {
  user_id: string;
  name: string;
  subjects: string;
  expertise: string;
  organization_email: string;
  contact: boolean;
};
type PlanRow = {
  session_id: string;
  teacher_user_id: string;
  student_attendance: { student_id: string; status: string | null }[];
  teacher_status: string | null;
};
type SessionMeta = {
  id: string;
  title?: string;
  starts_at?: string | null;
  prior_teacher_user_id?: string | null;
};

const PRIVATE = new Set(["phone", "address", "home_address"]);

const SUBJECT_PRESETS = [
  "Physics",
  "Chemistry",
  "Mathematics",
  "Biology",
  "English",
  "Computer Science",
] as const;

const EXPERTISE_PRESETS = [
  "JEE Advanced",
  "NEET UG",
  "Board Exams",
  "Olympiad",
  "Foundation",
  "Concept Remediation",
] as const;

const BOARD_OPTIONS = ["CBSE", "ICSE", "IB", "IGCSE", "State Board"] as const;

const GRADE_OPTIONS = [
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Repeater / Dropper",
  "Undergraduate",
] as const;

function toggleTokenList(current: string, item: string): string {
  const parts = current
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.includes(item)) {
    return parts.filter((s) => s !== item).join(", ");
  }
  return [...parts, item].join(", ");
}

function hasToken(current: string, item: string): boolean {
  return current
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .includes(item.toLowerCase());
}

function explain(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart)) as { detail?: unknown };
      if (typeof body.detail === "string" && body.detail) return body.detail;
    } catch {
      /* keep the raw message */
    }
  }
  return raw;
}

function publicPerson(row: Record<string, unknown>): Person {
  return {
    user_id: String(row.user_id || ""),
    name: String(row.name || "Person"),
    role: String(row.role || ""),
  };
}

function publicTeacher(row: Record<string, unknown>): Teacher {
  for (const key of PRIVATE) {
    if (key in row) delete row[key];
  }
  return {
    user_id: String(row.user_id || ""),
    name: String(row.name || "Teacher"),
    subjects: String(row.subjects || ""),
    expertise: String(row.expertise || ""),
    organization_email: String(row.organization_email || ""),
    contact: Boolean(row.contact),
  };
}

const STUDENT_ROLL = [
  { value: "attended", label: "Attended" },
  { value: "no_show", label: "No-show" },
  { value: "student_cancel", label: "Student cancel" },
  { value: "teacher_cancel", label: "Teacher cancel" },
] as const;

function mark(status: string | null | undefined): string {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "Not marked";
}

function normalizeStudent(status: string | null | undefined): string {
  if (status === "present" || status === "attended") return "attended";
  if (status === "absent" || status === "no_show") return "no_show";
  if (status === "student_cancel" || status === "teacher_cancel") return status;
  return "";
}

function studentMark(status: string | null | undefined): string {
  const normalized = normalizeStudent(status);
  return STUDENT_ROLL.find((item) => item.value === normalized)?.label ?? "Not marked";
}

function explicitMarks(row: PlanRow, studentId?: string, studentStatus?: string) {
  return (row.student_attendance || [])
    .map((item) => ({
      student_id: item.student_id,
      status: item.student_id === studentId ? studentStatus || "" : normalizeStudent(item.status),
    }))
    .filter((item) => normalizeStudent(item.status))
    .map((item) => ({ student_id: item.student_id, status: normalizeStudent(item.status) }));
}

function when(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function FacultyAdminPanel({ showWhenRestricted = false }: { showWhenRestricted?: boolean }) {
  const [admin, setAdmin] = useState(false);
  const [selfId, setSelfId] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [plan, setPlan] = useState<PlanRow[]>([]);
  const [sessions, setSessions] = useState<Record<string, SessionMeta>>({});
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [subjects, setSubjects] = useState("");
  const [expertise, setExpertise] = useState("");
  const [boardFocus, setBoardFocus] = useState<string>(BOARD_OPTIONS[0]);
  const [gradeFocus, setGradeFocus] = useState<string>(GRADE_OPTIONS[3]);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [successorId, setSuccessorId] = useState("");
  const [confirmHand, setConfirmHand] = useState(false);
  const [handed, setHanded] = useState("");

  const load = useCallback(async () => {
    const [gate, me] = await Promise.all([
      api("/api/v1/faculty-admin/me") as Promise<{ faculty_admin?: boolean }>,
      api("/api/v1/auth/me") as Promise<{ id?: string }>,
    ]);
    setSelfId(me.id || "");
    if (!gate.faculty_admin) {
      setAdmin(false);
      return;
    }
    const [dir, attendance, sess, students] = await Promise.all([
      api("/api/v1/faculty-admin/directory") as Promise<{
        people?: Record<string, unknown>[];
        teachers?: Record<string, unknown>[];
      }>,
      api("/api/v1/faculty-admin/planning") as Promise<PlanRow[]>,
      api("/api/v1/sessions") as Promise<SessionMeta[]>,
      api("/api/v1/students") as Promise<{ id: string; display_name: string }[]>,
    ]);
    setPeople((dir.people || []).map(publicPerson));
    setTeachers((dir.teachers || []).map(publicTeacher));
    setPlan(Array.isArray(attendance) ? attendance : []);
    const byId: Record<string, SessionMeta> = {};
    for (const row of Array.isArray(sess) ? sess : []) byId[row.id] = row;
    setSessions(byId);
    const names: Record<string, string> = {};
    for (const student of Array.isArray(students) ? students : []) {
      names[student.id] = student.display_name;
    }
    setStudentNames(names);
    setAdmin(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().catch((err) => {
      if (!cancelled) setError(explain(err));
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function run(key: string, work: () => Promise<void>) {
    setBusy(key);
    setError("");
    setMsg("");
    try {
      await work();
      await load();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy("");
    }
  }

  if (!admin && !error && !handed && !showWhenRestricted) return null;

  if (!admin) {
    return (
      <section className="card" style={{ margin: "12px 0 16px" }} aria-label="Faculty admin">
        <h3>Faculty Supervision &amp; Roll Audit</h3>
        {handed ? (
          <p className="muted">{handed}</p>
        ) : (
          <p className="muted">
            Supervision, attendance roll audit, and teacher contact grants are available when your account holds the
            faculty-admin grant.
          </p>
        )}
        <Err message={error} />
      </section>
    );
  }

  const names = new Map(people.map((person) => [person.user_id, person.name]));
  const others = people.filter((person) => person.user_id && person.user_id !== selfId);
  const removing = teachers.find((teacher) => teacher.user_id === removeId) || null;

  return (
    <section className="card" style={{ margin: "12px 0 16px" }} aria-label="Faculty admin">
      <h3>Faculty admin</h3>
      <p className="muted">
        Planning attendance, teacher profiles, and the faculty-admin grant. Phone and home address stay on each
        person&apos;s own profile.
      </p>
      <Err message={error} />
      {msg ? <p className="muted">{msg}</p> : null}
      {handed ? <p className="muted">{handed}</p> : null}

      <h3>Attendance</h3>
      {plan.length === 0 ? (
        <p className="muted">No sessions to plan.</p>
      ) : (
        plan.map((row) => {
          const meta = sessions[row.session_id];
          const canRevert = Boolean(meta?.prior_teacher_user_id);
          const students = row.student_attendance || [];
          return (
            <div
              key={row.session_id}
              className="list__i"
              style={{
                padding: "12px 0",
                borderTop: "1px solid var(--line-soft)",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 10,
              }}
            >
              <div className="sb" style={{ gap: 8 }}>
                <strong>{meta?.title || "Session"}</strong>
                <span className="muted">
                  {when(meta?.starts_at)}
                  {when(meta?.starts_at) ? " · " : ""}
                  Teacher {names.get(row.teacher_user_id) || "assigned"}: {mark(row.teacher_status)}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="sb" style={{ gap: 8 }}>
                  <span className="muted">Lead Teacher ({names.get(row.teacher_user_id) || "assigned"})</span>
                  <span
                    className={`pill ${
                      row.teacher_status === "present"
                        ? "is-good"
                        : row.teacher_status === "absent"
                          ? "is-bad"
                          : ""
                    }`}
                  >
                    {mark(row.teacher_status)}
                  </span>
                </div>
                <div className="roll-grid--2">
                  <button
                    type="button"
                    className={row.teacher_status === "present" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                    disabled={busy === row.session_id}
                    onClick={() =>
                      void run(row.session_id, async () => {
                        await api(`/api/v1/sessions/${row.session_id}/record`, {
                          method: "PATCH",
                          body: JSON.stringify({ teacher_status: "present" }),
                        });
                        setMsg("Attendance saved.");
                      })
                    }
                  >
                    Present
                  </button>
                  <button
                    type="button"
                    className={row.teacher_status === "absent" ? "btn btn--dark btn--sm" : "btn btn--sm"}
                    disabled={busy === row.session_id}
                    onClick={() =>
                      void run(row.session_id, async () => {
                        await api(`/api/v1/sessions/${row.session_id}/record`, {
                          method: "PATCH",
                          body: JSON.stringify({ teacher_status: "absent" }),
                        });
                        setMsg("Attendance saved.");
                      })
                    }
                  >
                    Absent
                  </button>
                </div>
              </div>
              {students.length === 0 ? (
                <p className="muted">No students on this session.</p>
              ) : (
                students.map((item) => {
                  const norm = normalizeStudent(item.status);
                  const tone =
                    norm === "attended"
                      ? "is-good"
                      : norm === "no_show"
                        ? "is-bad"
                        : norm === "student_cancel" || norm === "teacher_cancel"
                          ? "is-warn"
                          : "";
                  return (
                    <div
                      key={item.student_id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        paddingTop: 8,
                        borderTop: "1px solid var(--line-soft)",
                      }}
                    >
                      <div className="sb" style={{ gap: 8 }}>
                        <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                          {studentNames[item.student_id] || "Student"}
                        </span>
                        <span className={`pill ${tone}`} style={{ padding: "2px 8px" }}>
                          {studentMark(item.status)}
                        </span>
                      </div>
                      <div className="roll-grid">
                        {STUDENT_ROLL.map((choice) => (
                          <button
                            key={choice.value}
                            type="button"
                            className={norm === choice.value ? "btn btn--dark btn--sm" : "btn btn--sm"}
                            disabled={busy === row.session_id}
                            onClick={() =>
                              void run(row.session_id, async () => {
                                const next = norm === choice.value ? "" : choice.value;
                                await api(`/api/v1/sessions/${row.session_id}/record`, {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    attendance: explicitMarks(row, item.student_id, next),
                                  }),
                                });
                                setMsg("Attendance saved.");
                              })
                            }
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
              <div>
                <button
                  type="button"
                  className="hot--btn ghost"
                  style={{ marginTop: 4 }}
                  disabled={!canRevert || busy === row.session_id}
                  title={canRevert ? "Return this session to the previous teacher" : "No handoff to revert"}
                  onClick={() =>
                    void run(row.session_id, async () => {
                      await api(`/api/v1/sessions/${row.session_id}/handoff/revert`, { method: "POST" });
                      setMsg("Handoff reversed. Other edits stayed.");
                    })
                  }
                >
                  Revert handoff
                </button>
              </div>
            </div>
          );
        })
      )}

      <h3 style={{ marginTop: 16 }}>Teachers</h3>
      <p className="muted">
        Correct a teacher who joins, or remove the profile when they leave. Student profiles stay with the student.
      </p>
      {teachers.length === 0 ? <p className="muted">No active teacher profiles.</p> : null}
      {teachers.map((teacher) => (
        <div
          key={teacher.user_id}
          className="list__i"
          style={{
            padding: "12px 0",
            borderTop: "1px solid var(--line-soft)",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 4,
          }}
        >
          <strong>{teacher.name}</strong>
          <div className="muted">Subjects: {teacher.subjects || "—"}</div>
          <div className="muted">Expertise: {teacher.expertise || "—"}</div>
          <p className="meta-line">Organization email: {teacher.organization_email || "—"}</p>
          <div className="muted">Student and parent conversations: {teacher.contact ? "allowed" : "withheld"}</div>
          {editing === teacher.user_id ? (
            <div style={{ marginTop: 8 }}>
              <div className="grid g2" style={{ gap: 10 }}>
                <label className="field">
                  <span>Primary Board</span>
                  <select className="field__in" value={boardFocus} onChange={(e) => setBoardFocus(e.target.value)}>
                    {BOARD_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Target Grade</span>
                  <select className="field__in" value={gradeFocus} onChange={(e) => setGradeFocus(e.target.value)}>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field">
                <span>Subjects</span>
                <div className="chips" style={{ margin: "6px 0" }}>
                  {SUBJECT_PRESETS.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      className={`chip${hasToken(subjects, sub) ? " on" : ""}`}
                      onClick={() => setSubjects(toggleTokenList(subjects, sub))}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
                <input
                  className="field__in"
                  value={subjects}
                  onChange={(e) => setSubjects(e.target.value)}
                  placeholder="Select subjects above or enter custom…"
                />
              </div>

              <div className="field">
                <span>Expertise</span>
                <div className="chips" style={{ margin: "6px 0" }}>
                  {EXPERTISE_PRESETS.map((exp) => (
                    <button
                      key={exp}
                      type="button"
                      className={`chip${hasToken(expertise, exp) ? " on" : ""}`}
                      onClick={() => setExpertise(toggleTokenList(expertise, exp))}
                    >
                      {exp}
                    </button>
                  ))}
                </div>
                <input
                  className="field__in"
                  value={expertise}
                  onChange={(e) => setExpertise(e.target.value)}
                  placeholder="Select expertise above or enter custom…"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="hot hot--btn"
                  disabled={busy === teacher.user_id}
                  onClick={() =>
                    void run(teacher.user_id, async () => {
                      await api(`/api/v1/profiles/${teacher.user_id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ subjects, expertise }),
                      });
                      setEditing(null);
                      setMsg("Teacher card updated.");
                    })
                  }
                >
                  Save teacher
                </button>
                <button type="button" className="hot hot--btn ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="hot--btn ghost"
                onClick={() => {
                  setEditing(teacher.user_id);
                  setSubjects(teacher.subjects);
                  setExpertise(teacher.expertise);
                }}
              >
                Edit profile
              </button>
              <button
                type="button"
                className="hot--btn ghost"
                disabled={busy === `contact-${teacher.user_id}`}
                onClick={() =>
                  void run(`contact-${teacher.user_id}`, async () => {
                    if (teacher.contact) {
                      await api(`/api/v1/faculty-admin/contact-grants/${teacher.user_id}`, { method: "DELETE" });
                      setMsg("Conversations withheld.");
                    } else {
                      await api("/api/v1/faculty-admin/contact-grants", {
                        method: "POST",
                        body: JSON.stringify({ user_id: teacher.user_id }),
                      });
                      setMsg("Conversations allowed.");
                    }
                  })
                }
              >
                {teacher.contact ? "Withhold conversations" : "Allow conversations"}
              </button>
              <button type="button" className="hot--btn danger" onClick={() => setRemoveId(teacher.user_id)}>
                Remove teacher
              </button>
            </div>
          )}
        </div>
      ))}

      <h3 style={{ marginTop: 16 }}>Faculty-admin grant</h3>
      <p className="muted">Hand this grant to someone else in the organization. The workspace owner stays the same.</p>
      <label className="field">
        <span>Person</span>
        <select className="field__in" value={successorId} onChange={(e) => setSuccessorId(e.target.value)}>
          <option value="">Choose a person</option>
          {others.map((person) => (
            <option key={person.user_id} value={person.user_id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="hot--btn"
        disabled={!successorId || Boolean(busy)}
        onClick={() => setConfirmHand(true)}
      >
        Transfer faculty-admin grant
      </button>

      {removing ? (
        <Dialog title="Remove teacher profile" onClose={() => setRemoveId(null)}>
          <p>Remove {removing.name} from active teacher use. This does not delete student profiles.</p>
          <div className="row">
            <button
              type="button"
              className="hot--btn danger"
              disabled={busy === removing.user_id}
              onClick={() =>
                void run(removing.user_id, async () => {
                  await api(`/api/v1/profiles/${removing.user_id}`, { method: "DELETE" });
                  setRemoveId(null);
                  setMsg("Teacher profile removed from active use.");
                })
              }
            >
              Remove teacher
            </button>
            <button type="button" className="hot--btn ghost" onClick={() => setRemoveId(null)}>
              Cancel
            </button>
          </div>
        </Dialog>
      ) : null}

      {confirmHand ? (
        <Dialog title="Transfer faculty-admin grant" onClose={() => setConfirmHand(false)}>
          <p>This transfers the faculty-admin grant only. The workspace owner does not change.</p>
          <div className="row">
            <button
              type="button"
              className="hot--btn"
              disabled={busy === "succession"}
              onClick={() =>
                void run("succession", async () => {
                  const name = names.get(successorId) || "that person";
                  const result = (await api("/api/v1/faculty-admin/succession", {
                    method: "POST",
                    body: JSON.stringify({ user_id: successorId }),
                  })) as { previous_can_supervise?: boolean };
                  setConfirmHand(false);
                  setSuccessorId("");
                  setHanded(`The faculty-admin grant now belongs to ${name}. The workspace owner is unchanged.`);
                  if (result.previous_can_supervise === false) setAdmin(false);
                })
              }
            >
              Transfer grant
            </button>
            <button type="button" className="hot--btn ghost" onClick={() => setConfirmHand(false)}>
              Cancel
            </button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
