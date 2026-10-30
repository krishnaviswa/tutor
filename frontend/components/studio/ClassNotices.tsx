"use client";

import { useEffect, useState } from "react";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api("/api/v1/notifications/inbox")
      .then((data) => {
        if (!alive) return;
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
          {notices.map((notice) => (
            <li key={notice.id} className="studio-notice">
              <p className="studio-notice__body">{notice.body}</p>
              <div className="studio-notice__meta">
                <time dateTime={notice.created_at}>{formatWhen(notice.created_at)}</time>
                {notice.status ? <span>{notice.status}</span> : null}
                {notice.to_role ? <span>{notice.to_role}</span> : null}
                {notice.student_id ? <span>{notice.student_id}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
