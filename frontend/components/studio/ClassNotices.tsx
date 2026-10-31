"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import "./comms.css";

type ClassNotice = {
  id: string;
  body: string;
  created_at: string;
  status: string;
  to_role: string;
  student_id?: string;
};

type StudentRow = { id: string; user_id?: string; display_name: string };
type StaffRow = { id: string; user_id?: string; display_name?: string; name?: string; role?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function timeMs(value: string) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatWhen(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClassNotices() {
  const [notices, setNotices] = useState<ClassNotice[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      api("/api/v1/notifications/inbox"),
      api("/api/v1/students").catch(() => []) as Promise<StudentRow[]>,
      api("/api/v1/staff").catch(() => []) as Promise<StaffRow[]>,
    ])
      .then(([data, studs, staffRows]) => {
        if (!alive) return;
        setStudents(Array.isArray(studs) ? studs : []);
        setStaff(Array.isArray(staffRows) ? staffRows : []);
        if (!Array.isArray(data)) {
          setError("Could not read class notices.");
          return;
        }
        const newest = (data as ClassNotice[])
          .slice()
          .sort((a, b) => timeMs(b.created_at) - timeMs(a.created_at))
          .slice(0, 8);
        setNotices(newest);
        setError("");
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  const personNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of students) {
      if (s.id && s.display_name) map[s.id] = s.display_name;
      if (s.user_id && s.display_name) map[s.user_id] = s.display_name;
    }
    for (const m of staff) {
      const label = m.display_name || m.name;
      if (!label || UUID_RE.test(label)) continue;
      if (m.id) map[m.id] = label;
      if (m.user_id) map[m.user_id] = label;
    }
    return map;
  }, [students, staff]);

  function resolvePersonName(studentId?: string, toRole?: string): string {
    if (!studentId) return "";
    const mapped = personNameMap[studentId];
    if (mapped && !UUID_RE.test(mapped)) return mapped;
    if (UUID_RE.test(studentId)) {
      return toRole === "teacher" || toRole === "owner" ? "Faculty" : "Student";
    }
    return studentId;
  }

  return (
    <section className="studio-notices" aria-label="Class notices">
      <h2 className="studio-notices__title">Class notices</h2>
      {error ? (
        <p className="studio-notices__error" role="alert">
          {error}
        </p>
      ) : null}
      {!error && notices.length === 0 ? <p className="studio-notices__empty">No class notices.</p> : null}
      {notices.length > 0 ? (
        <ul className="studio-notices__list">
          {notices.map((notice) => {
            const personLabel = resolvePersonName(notice.student_id, notice.to_role);
            return (
              <li key={notice.id} className="studio-notice">
                <p className="studio-notice__body">{notice.body}</p>
                <div className="studio-notice__meta">
                  <time dateTime={notice.created_at}>{formatWhen(notice.created_at)}</time>
                  {notice.status ? <span>{notice.status}</span> : null}
                  {notice.to_role ? <span>{notice.to_role}</span> : null}
                  {personLabel ? <span>{personLabel}</span> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
