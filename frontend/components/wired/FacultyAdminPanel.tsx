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
  student_attendance: { student_id: string; status: string }[];
  teacher_status: string | null;
};
type SessionMeta = {
  id: string;
  title?: string;
  starts_at?: string | null;
  prior_teacher_user_id?: string | null;
};

const PRIVATE = new Set(["phone", "address", "home_address"]);

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

function mark(status: string | null | undefined): string {
  if (status === "present") return "Present";
  if (status === "absent") return "Absent";
  return "Not marked";
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

export function FacultyAdminPanel() {
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
      api("/api/v1/faculty-admin/directory") as Promise<{ people?: Record<string, unknown>[]; teachers?: Record<string, unknown>[] }>,
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
    load()
      .catch((err) => {
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

  if (!admin && !error && !handed) return null;

  if (!admin) {
    return (
      <section className="card" style={{ margin: "12px 0 16px" }} aria-label="Faculty admin">
        {handed ? <p className="muted">{handed}</p> : null}
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
        Planning attendance, teacher profiles, and the faculty-admin grant. Phone and home address stay on each person&apos;s own profile.
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
            <div key={row.session_id} className="list__i" style={{ padding: "10px 0", borderTop: "1px solid var(--line-soft)" }}>
              <strong>{meta?.title || "Session"}</strong>
              <div className="muted">
                {when(meta?.starts_at)}
                {when(meta?.starts_at) ? " · " : ""}
                Teacher {names.get(row.teacher_user_id) || "assigned"}: {mark(row.teacher_status)}
              </div>
              <div className="muted">
                Students:{" "}
                {students.length
                  ? students.map((item) => `${studentNames[item.student_id] || "Student"} ${mark(item.status)}`).join(", ")
                  : "No student mark"}
              </div>
              <button
                type="button"
                className="hot--btn ghost"
                style={{ marginTop: 8 }}
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
          );
        })
      )}

      <h3 style={{ marginTop: 16 }}>Teachers</h3>
      <p className="muted">Correct a teacher who joins, or remove the profile when they leave. Student profiles stay with the student.</p>
      {teachers.length === 0 ? <p className="muted">No active teacher profiles.</p> : null}
      {teachers.map((teacher) => (
        <div key={teacher.user_id} className="list__i" style={{ padding: "10px 0", borderTop: "1px solid var(--line-soft)" }}>
          <strong>{teacher.name}</strong>
          <div className="muted">Subjects: {teacher.subjects || "—"}</div>
          <div className="muted">Organization email: {teacher.organization_email || "—"}</div>
          <div className="muted">
            Student and parent conversations: {teacher.contact ? "allowed" : "withheld"}
          </div>
          {editing === teacher.user_id ? (
            <div style={{ marginTop: 8 }}>
              <label className="field">
                <span>Subjects</span>
                <input className="field__in" value={subjects} onChange={(e) => setSubjects(e.target.value)} />
              </label>
              <label className="field">
                <span>Expertise</span>
                <input className="field__in" value={expertise} onChange={(e) => setExpertise(e.target.value)} />
              </label>
              <div className="row">
                <button
                  type="button"
                  className="hot--btn"
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
                <button type="button" className="hot--btn ghost" onClick={() => setEditing(null)}>
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
          <p>
            Remove {removing.name} from active teacher use. This does not delete student profiles.
          </p>
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
