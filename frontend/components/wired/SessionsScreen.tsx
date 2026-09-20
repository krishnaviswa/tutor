"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Err } from "@/components/wired/bits";

const TZ = "Asia/Kolkata";
const TABS = ["Upcoming", "Completed", "Cancelled"] as const;
type Tab = (typeof TABS)[number];
const SCOPE: Record<Tab, string> = {
  Upcoming: "upcoming",
  Completed: "completed",
  Cancelled: "cancelled",
};

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
};

type StudentRow = { id: string; display_name: string };

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
  const [tab, setTab] = useState<Tab>("Upcoming");
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const qs = new URLSearchParams({ scope: SCOPE[tab] });
      if (studentId) qs.set("student_id", studentId);
      const [sess, studs] = await Promise.all([
        api(`/api/v1/sessions?${qs.toString()}`) as Promise<SessionRow[]>,
        api("/api/v1/students") as Promise<StudentRow[]>,
      ]);
      setRows(Array.isArray(sess) ? sess : []);
      setStudents(Array.isArray(studs) ? studs : []);
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

  return (
    <>
      <h2>Sessions</h2>
      <span className="k">All sessions · plan ahead and review what is done · Asia/Kolkata</span>

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
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
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

      <div className="card">
        <div className="k" style={{ marginBottom: 8 }}>
          Students you add on the roster appear in this dropdown for a 1-on-1 call.
        </div>
        {sorted.length === 0 ? (
          <p className="muted">No {tab.toLowerCase()} sessions.</p>
        ) : (
          sorted.map((s) => {
            const dest = s.display_status === "Upcoming"
              ? `/app/faculty/session-pre?session=${encodeURIComponent(s.id)}`
              : `/app/faculty/record?session=${encodeURIComponent(s.id)}`;
            return (
              <div
                key={s.id}
                className="list__i"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderTop: "1px solid var(--line-soft)",
                }}
              >
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
                  </div>
                </div>
                <span
                  className="pill"
                  style={{ border: `1px solid ${tone(s.display_status)}`, color: tone(s.display_status) }}
                >
                  {s.display_status}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
        Completed is time-driven: a past session shows <b>Auto completed</b> until a record is filed,
        then <b>Staff completed</b>. Cancelled sessions stay tracked here and on the week calendar.
        An owner can edit a session time in any state.
      </p>
    </>
  );
}
